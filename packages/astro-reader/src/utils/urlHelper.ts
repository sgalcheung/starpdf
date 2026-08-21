import path from "node:path";

/**
 * 从 URL 中提取文件名
 * @param url - 完整的 URL 字符串 (例如: "https://example.com/docs/report.pdf?v=1")
 * @returns 提取出的文件名 (例如: "report.pdf")，如果无法提取则返回 "untitled"
 */
export function getUrlFileName(url: string): string {
	try {
		// 1. 使用原生 URL 对象解析，自动处理协议、域名、查询参数和哈希
		const parsedUrl = new URL(url);

		// 2. 获取纯路径部分 (例如: "/docs/report.pdf")
		const pathname = parsedUrl.pathname;

		// 3. 使用 path.basename 提取最后一段作为文件名
		const fileName = path.basename(pathname);

		// 4. 边缘情况处理：如果路径以 '/' 结尾，basename 会返回空字符串
		if (!fileName || fileName === "/") {
			// 尝试从 hostname 中提取一个有意义的名字，或者使用默认值
			return parsedUrl.hostname.replace(/^www\./, "") || "untitled";
		}

		return fileName;
	} catch (error) {
		// 5. 容错处理：如果传入的不是标准 URL (例如相对路径 "/assets/file.pdf")
		// 回退到简单的字符串分割，并移除查询参数
		const fallback = url.split("?")[0]?.split("#")[0]?.split("/").pop();
		return fallback || "untitled";
	}
}
