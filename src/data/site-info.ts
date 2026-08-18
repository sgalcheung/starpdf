export interface CatalogItem {
  label: string;
  link: string;
  pdfUrl: string;
  textContent?: string;
}

export interface CatalogType extends Array<{
  label: string;
  items: Array<CatalogItem>;
}> {}

export type SiteInfo = {
  catalogs: CatalogType;
};

const PROXY_SERVER = 'https://cors-anywhere.herokuapp.com' as const;

const toProxyPdfUrl = (pdfUrl: string) => `${PROXY_SERVER}/${pdfUrl}`;

const protectedText = `这是一个被转换成 PDF 的纯文本内容。

1. 原始内容保留在代码中。
2. 构建时生成 PDF。
3. 页面中真正展示的是 PDF，而不是原始文件。

这样做的好处是：文本不会被直接作为普通网页内容展示，且能保留文档格式。`;

export const siteInfo: SiteInfo = {
  catalogs: [
    {
      label: 'Getting Started',
      items: [
        {
          label: 'helloworld',
          link: '/getting-started/helloworld',
          pdfUrl: '/starpdf/pdf/helloworld.pdf',
        },
        {
          label: 'compressed.tracemonkey-pldi-09',
          link: '/getting-started/compressed.tracemonkey-pldi-09',
          pdfUrl: toProxyPdfUrl(
            'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
          ),
        },
      ],
    },
    {
      label: '行政管理研究方法',
      items: [
        {
          label: '专栏导语',
          link: '/jpa/jpa-research-methods',
          pdfUrl: 'https://jpa.sysu.edu.cn/docs/20091207154349000105.pdf',
        },
        {
          label: '专栏导语（本地）',
          link: '/jpa/jpa-research-methods-local',
          pdfUrl: '/starpdf/pdf/jpa-research-methods.pdf',
        },
      ],
    },
    {
      label: 'astro-emit-asset',
      items: [
        {
          label: 'plain-text-to-pdf',
          link: '/astro-emit-asset/plain-text-to-pdf',
          pdfUrl: '/starpdf/pdf/plain-text-to-pdf.pdf',
          textContent: protectedText,
        },
      ],
    },
  ],
};
