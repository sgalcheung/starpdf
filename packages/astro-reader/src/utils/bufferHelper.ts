import crypto from "node:crypto";

export function hashBuffer(buffer: Buffer): string {
	return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function hashString(str: string): string {
	return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}
