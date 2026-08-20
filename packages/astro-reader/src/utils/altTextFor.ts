import type { LyHeaderFields } from './parseLyHeader.ts';

/**
 * Composes alt text from parsed `\header` fields.
 */
export function altTextFor(fields: LyHeaderFields): string {
	const { title, composer } = fields;
	if (title && composer) return `${title}, by ${composer}`;
	if (title) return title;
	if (composer) return `Sheet music by ${composer}`;
	return '';
}
