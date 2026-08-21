const EXTENSION_TYPE_MAP: Record<string, string> = {
	".md": "Score",
};

export function typeDeclarationsFor(extensions: readonly string[]): string {
	return extensions
		.map((ext) => {
			const typeName = EXTENSION_TYPE_MAP[ext];
			return `declare module "*${ext}" {\n  const score: import("'../../../src/types/index").${typeName};\n  export default score;\n}`;
		})
		.join("\n");
}
