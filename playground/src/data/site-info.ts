export interface CatalogItem {
	label: string;
	link: string;
	fileUrl: string;
}

export interface CatalogType
	extends Array<{
		label: string;
		items: Array<CatalogItem>;
	}> {}

export type SiteInfo = {
	catalogs: CatalogType;
};

const PROXY_SERVER = "https://cors-anywhere.herokuapp.com" as const;

const toProxyPdfUrl = (fileUrl: string) => `${PROXY_SERVER}/${fileUrl}`;

export const siteInfo: SiteInfo = {
	catalogs: [
		{
			label: "Getting Started",
			items: [
				{
					label: "helloworld",
					link: "/getting-started/helloworld",
					fileUrl: "src/content/helloworld.pdf",
				},
				{
					label: "Sample PDF",
					link: "/getting-started/sample-pdf",
					fileUrl:
						"https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
				},
			],
		},
		{
			label: "行政管理研究方法",
			items: [
				{
					label: "专栏导语",
					link: "/jpa/jpa-research-methods",
					fileUrl: "https://jpa.sysu.edu.cn/docs/20091207154349000105.pdf",
				},
				{
					label: "专栏导语（本地）",
					link: "/jpa/jpa-research-methods-local",
					fileUrl: "src/content/jpa-research-methods.pdf",
				},
			],
		},
		{
			label: "astro-emit-asset",
			items: [
				{
					label: "plain-text-to-pdf",
					link: "/astro-emit-asset/plain-text-to-pdf",
					fileUrl: "src/content/plain-text-to-pdf.txt",
				},
			],
		},
	],
};
