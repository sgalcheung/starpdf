export interface CatalogItem {
  label: string;
  link: string;
  pdfUrl: string;
}

export interface CatalogType
  extends Array<{
    label: string;
    items: Array<CatalogItem>;
  }> {}

export type SiteInfo = {
  catalogs: CatalogType;
};

export const siteInfo: SiteInfo = {
  catalogs: [
    {
      label: "Getting Started",
      items: [
        {
          label: "helloworld",
          link: "/getting-started/helloworld",
          pdfUrl: "/pdf/helloworld.pdf",
        },
        {
          label: "compressed.tracemonkey-pldi-09",
          link: "/getting-started/compressed.tracemonkey-pldi-09",
          pdfUrl:
            "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf",
        },
      ],
    },
  ],
};
