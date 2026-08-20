import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function readRawContent(url: URL): Promise<string> {
	return readFile(fileURLToPath(url), 'utf-8');
}
