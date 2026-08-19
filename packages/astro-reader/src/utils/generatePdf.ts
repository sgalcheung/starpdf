const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 54;
const PAGE_MARGIN_Y = 64;
const TITLE_FONT_SIZE = 18;
const BODY_FONT_SIZE = 12;
const BODY_LINE_HEIGHT = 18;

const wrapText = (value: string, maxCharsPerLine: number) => {
	const normalized = value.replace(/\r\n/g, "\n").trim() || " ";
	const paragraphs = normalized.split(/\n+/);
	const lines: string[] = [];

	for (const paragraph of paragraphs) {
		const words = paragraph.split(/\s+/);
		let current = "";

		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (candidate.length <= maxCharsPerLine) {
				current = candidate;
				continue;
			}

			if (current) {
				lines.push(current);
			}

			if (word.length > maxCharsPerLine) {
				for (let i = 0; i < word.length; i += maxCharsPerLine) {
					lines.push(word.slice(i, i + maxCharsPerLine));
				}
				current = "";
			} else {
				current = word;
			}
		}

		if (current) {
			lines.push(current);
		}
	}

	return lines.length ? lines : [" "];
};

const escapePdfText = (value: string) =>
	value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function generateTextPdfAsset(title: string, content: string) {
	const safeTitle = (title || "Document").trim() || "Document";
	const titleLines = wrapText(safeTitle, 38);
	const bodyLines = wrapText(content, 78);
	const allLines = [...titleLines, "", ...bodyLines];
	const maxBodyLines = Math.max(1, allLines.length);

	const streamLines: string[] = [];
	let currentY = PAGE_HEIGHT - PAGE_MARGIN_Y;

	const appendText = (fontSize: number, text: string, x: number, y: number) => {
		streamLines.push("BT");
		streamLines.push(
			`/${fontSize === TITLE_FONT_SIZE ? "F1" : "F1"} ${fontSize} Tf`,
		);
		streamLines.push(`${x} ${y} Td`);
		streamLines.push(`(${escapePdfText(text)}) Tj`);
		streamLines.push("ET");
	};

	appendText(
		TITLE_FONT_SIZE,
		titleLines[0] ?? safeTitle,
		PAGE_MARGIN_X,
		currentY,
	);
	currentY -= TITLE_FONT_SIZE + 10;

	for (const line of allLines.slice(1)) {
		if (currentY < PAGE_MARGIN_Y) {
			break;
		}

		appendText(BODY_FONT_SIZE, line, PAGE_MARGIN_X, currentY);
		currentY -= BODY_LINE_HEIGHT;
	}

	const stream = streamLines.join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
		`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];

	let pdf = "%PDF-1.4\n";
	const offsets: number[] = [0];

	for (let i = 0; i < objects.length; i += 1) {
		offsets.push(Buffer.byteLength(pdf, "latin1"));
		pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
	}

	const xrefOffset = Buffer.byteLength(pdf, "latin1");
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (let i = 0; i < objects.length; i += 1) {
		pdf += `${String(offsets[i + 1]).padStart(10, "0")} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

	return Buffer.from(pdf, "latin1");
}
