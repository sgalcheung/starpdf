import {
	defineRouteMiddleware,
	type StarlightRouteData,
} from '@astrojs/starlight/route-data';
import { type CatalogType, siteInfo } from './data/site-info';

export const onRequest = defineRouteMiddleware(async (context) => {
	const pathname = context.url.pathname;
	const pathSegments = pathname.split('/').filter(Boolean);
	const lastSegment = pathSegments.at(-1) ?? '';
	const prefix = pathSegments.at(0) ?? '';

	const starlightRoute = context.locals.starlightRoute;

	renderSideBar(starlightRoute, siteInfo.catalogs, lastSegment, prefix);
});

function renderSideBar(
	starlightRoute: StarlightRouteData,
	catalogs: CatalogType,
	article_id: string,
	prefix?: string,
) {
	starlightRoute.sidebar = catalogs.map((catalog) => ({
		type: 'group',
		label: catalog.label,
		entries: catalog.items.map((item) => ({
			type: 'link',
			label: item.label,
			href: prefix ? `/${prefix}${item.link}` : item.link,
			isCurrent: item.link.endsWith(article_id),
			badge: undefined,
			attrs: {},
		})),
		collapsed: false,
		badge: undefined,
	}));
}
