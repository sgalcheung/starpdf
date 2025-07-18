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

const PROXY_SERVER = "https://cors.sgalcheung.online" as const;

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
          pdfUrl: `${PROXY_SERVER}/https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf`,
        },
      ],
    },
    {
      label: "行政管理研究方法",
      items: [
        {
          label: "专栏导语",
          link: "/jpa/jpa-research-methods",
          pdfUrl: `${PROXY_SERVER}/https://jpa.sysu.edu.cn/docs/20091207154349000105.pdf`,
        },
        {
          label: "专栏导语（本地）",
          link: "/jpa/jpa-research-methods-local",
          pdfUrl: "/pdf/jpa-research-methods.pdf",
        },
      ],
    },
  ],
};
