/* eslint-disable */
// @ts-nocheck
// Generated route bindings. TanStack Router may regenerate this file.
import {Route as rootRouteImport} from "./routes/__root";
import {Route as IndexRouteImport} from "./routes/index";
import {Route as LoginRouteImport} from "./routes/login";
import {Route as SuperAdminRouteImport} from "./routes/super-admin";
import {Route as CompanyRouteImport} from "./routes/empresa";
import {Route as CashierRouteImport} from "./routes/caixa";
import {Route as StockRouteImport} from "./routes/stock";
import {Route as DemoRouteImport} from "./routes/demonstracao";
import {Route as CatalogRouteImport} from "./routes/catalogo";
const IndexRoute=IndexRouteImport.update({id:"/",path:"/",getParentRoute:()=>rootRouteImport} as any);
const LoginRoute=LoginRouteImport.update({id:"/login",path:"/login",getParentRoute:()=>rootRouteImport} as any);
const SuperAdminRoute=SuperAdminRouteImport.update({id:"/super-admin",path:"/super-admin",getParentRoute:()=>rootRouteImport} as any);
const CompanyRoute=CompanyRouteImport.update({id:"/empresa",path:"/empresa",getParentRoute:()=>rootRouteImport} as any);
const CashierRoute=CashierRouteImport.update({id:"/caixa",path:"/caixa",getParentRoute:()=>rootRouteImport} as any);
const StockRoute=StockRouteImport.update({id:"/stock",path:"/stock",getParentRoute:()=>rootRouteImport} as any);
const DemoRoute=DemoRouteImport.update({id:"/demonstracao",path:"/demonstracao",getParentRoute:()=>rootRouteImport} as any);
const CatalogRoute=CatalogRouteImport.update({id:"/catalogo",path:"/catalogo",getParentRoute:()=>rootRouteImport} as any);
export interface FileRoutesByFullPath {"/":typeof IndexRoute;"/login":typeof LoginRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute;"/caixa":typeof CashierRoute;"/stock":typeof StockRoute;"/demonstracao":typeof DemoRoute;"/catalogo":typeof CatalogRoute}
export interface FileRoutesByTo {"/":typeof IndexRoute;"/login":typeof LoginRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute;"/caixa":typeof CashierRoute;"/stock":typeof StockRoute;"/demonstracao":typeof DemoRoute;"/catalogo":typeof CatalogRoute}
export interface FileRoutesById {"__root__":typeof rootRouteImport;"/":typeof IndexRoute;"/login":typeof LoginRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute;"/caixa":typeof CashierRoute;"/stock":typeof StockRoute;"/demonstracao":typeof DemoRoute;"/catalogo":typeof CatalogRoute}
export interface FileRouteTypes {fileRoutesByFullPath:FileRoutesByFullPath;fullPaths:"/"|"/login"|"/super-admin"|"/empresa"|"/caixa"|"/stock"|"/demonstracao"|"/catalogo";fileRoutesByTo:FileRoutesByTo;to:"/"|"/login"|"/super-admin"|"/empresa"|"/caixa"|"/stock"|"/demonstracao"|"/catalogo";id:"__root__"|"/"|"/login"|"/super-admin"|"/empresa"|"/caixa"|"/stock"|"/demonstracao"|"/catalogo";fileRoutesById:FileRoutesById}
export interface RootRouteChildren {IndexRoute:typeof IndexRoute;LoginRoute:typeof LoginRoute;SuperAdminRoute:typeof SuperAdminRoute;CompanyRoute:typeof CompanyRoute;CashierRoute:typeof CashierRoute;StockRoute:typeof StockRoute;DemoRoute:typeof DemoRoute;CatalogRoute:typeof CatalogRoute}
declare module "@tanstack/react-router" {interface FileRoutesByPath {
 "/":{id:"/";path:"/";fullPath:"/";preLoaderRoute:typeof IndexRouteImport;parentRoute:typeof rootRouteImport};
 "/login":{id:"/login";path:"/login";fullPath:"/login";preLoaderRoute:typeof LoginRouteImport;parentRoute:typeof rootRouteImport};
 "/super-admin":{id:"/super-admin";path:"/super-admin";fullPath:"/super-admin";preLoaderRoute:typeof SuperAdminRouteImport;parentRoute:typeof rootRouteImport};
 "/empresa":{id:"/empresa";path:"/empresa";fullPath:"/empresa";preLoaderRoute:typeof CompanyRouteImport;parentRoute:typeof rootRouteImport};
 "/caixa":{id:"/caixa";path:"/caixa";fullPath:"/caixa";preLoaderRoute:typeof CashierRouteImport;parentRoute:typeof rootRouteImport};
 "/stock":{id:"/stock";path:"/stock";fullPath:"/stock";preLoaderRoute:typeof StockRouteImport;parentRoute:typeof rootRouteImport};
 "/demonstracao":{id:"/demonstracao";path:"/demonstracao";fullPath:"/demonstracao";preLoaderRoute:typeof DemoRouteImport;parentRoute:typeof rootRouteImport};
 "/catalogo":{id:"/catalogo";path:"/catalogo";fullPath:"/catalogo";preLoaderRoute:typeof CatalogRouteImport;parentRoute:typeof rootRouteImport}
}}
const rootRouteChildren:RootRouteChildren={IndexRoute,LoginRoute,SuperAdminRoute,CompanyRoute,CashierRoute,StockRoute,DemoRoute,CatalogRoute};
export const routeTree=rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>();
import type {getRouter} from "./router";
import type {startInstance} from "./start";
declare module "@tanstack/react-start" {interface Register {ssr:true;router:Awaited<ReturnType<typeof getRouter>>;config:Awaited<ReturnType<typeof startInstance.getOptions>>}}
