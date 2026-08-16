// src/lib/pdf/types.ts

export interface PdfOptions {
  title?: string;

  author?: string;

  issueNo?: string | number;

  header?: string;

  showPageNumber?: boolean;

  cover?: boolean;

  font?: {
    regular: string;
    bold?: string;
    italic?: string;
  };

  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}
