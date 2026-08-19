import crypto from "node:crypto";

export function hashBuffer(buffer: Buffer): string {
	return crypto.createHash("sha256").update(buffer).digest("hex");
}
