/** Header metadata extracted from a score's `\header` block(s). */
export interface Metadata {
  arranger?: string;
  composer?: string;
  copyright?: string;
  dedication?: string;
  instrument?: string;
  meter?: string;
  opus?: string;
  piece?: string;
  poet?: string;
  subsubtitle?: string;
  subtitle?: string;
  tagline?: string;
  title?: string;
  [field: string]: string | undefined;
}

/** Tags a bag of parsed `\header` fields (see `parseLyHeaderFields`) as `LilypondMetadata`. */
export function toMetadata(fields: Record<string, string>): Metadata {
  return fields;
}
