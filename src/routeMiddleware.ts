import {
  defineRouteMiddleware,
  type StarlightRouteData,
} from "@astrojs/starlight/route-data";
import { siteInfo, type CatalogType } from "./data/site-info";

export const onRequest = defineRouteMiddleware(async (context) => {
 const pathname = context.url.pathname;
 const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';

  const starlightRoute = context.locals.starlightRoute;

  renderSideBar(starlightRoute, siteInfo.catalogs, lastSegment);
});

function renderSideBar(
  starlightRoute: StarlightRouteData,
  catalogs: CatalogType,
  article_id: string
) {
  starlightRoute.sidebar = catalogs.map((catalog) => ({
    type: "group",
    label: catalog.label,
    entries: catalog.items.map((item) => ({
      type: "link",
      label: item.label,
      href: item.link,
      isCurrent: item.link.endsWith(article_id),
      badge: undefined,
      attrs: {},
    })),
    collapsed: false,
    badge: undefined,
  }));
}
