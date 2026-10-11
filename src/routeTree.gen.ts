/* eslint-disable */
// @ts-nocheck
// Generated route bindings. TanStack Router may regenerate this file.
import {Route as rootRouteImport} from "./routes/__root";
import {Route as IndexRouteImport} from "./routes/index";
import {Route as SuperAdminRouteImport} from "./routes/super-admin";
import {Route as CompanyRouteImport} from "./routes/empresa";
const IndexRoute=IndexRouteImport.update({id:"/",path:"/",getParentRoute:()=>rootRouteImport} as any);
const SuperAdminRoute=SuperAdminRouteImport.update({id:"/super-admin",path:"/super-admin",getParentRoute:()=>rootRouteImport} as any);
const CompanyRoute=CompanyRouteImport.update({id:"/empresa",path:"/empresa",getParentRoute:()=>rootRouteImport} as any);
export interface FileRoutesByFullPath {"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute}
export interface FileRoutesByTo {"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute}
export interface FileRoutesById {"__root__":typeof rootRouteImport;"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute;"/empresa":typeof CompanyRoute}
export interface FileRouteTypes {fileRoutesByFullPath:FileRoutesByFullPath;fullPaths:"/"|"/super-admin"|"/empresa";fileRoutesByTo:FileRoutesByTo;to:"/"|"/super-admin"|"/empresa";id:"__root__"|"/"|"/super-admin"|"/empresa";fileRoutesById:FileRoutesById}
export interface RootRouteChildren {IndexRoute:typeof IndexRoute;SuperAdminRoute:typeof SuperAdminRoute;CompanyRoute:typeof CompanyRoute}
declare module "@tanstack/react-router" {interface FileRoutesByPath {
 "/":{id:"/";path:"/";fullPath:"/";preLoaderRoute:typeof IndexRouteImport;parentRoute:typeof rootRouteImport};
 "/super-admin":{id:"/super-admin";path:"/super-admin";fullPath:"/super-admin";preLoaderRoute:typeof SuperAdminRouteImport;parentRoute:typeof rootRouteImport};
 "/empresa":{id:"/empresa";path:"/empresa";fullPath:"/empresa";preLoaderRoute:typeof CompanyRouteImport;parentRoute:typeof rootRouteImport}
}}
const rootRouteChildren:RootRouteChildren={IndexRoute,SuperAdminRoute,CompanyRoute};
export const routeTree=rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>();
import type {getRouter} from "./router";
import type {startInstance} from "./start";
declare module "@tanstack/react-start" {interface Register {ssr:true;router:Awaited<ReturnType<typeof getRouter>>;config:Awaited<ReturnType<typeof startInstance.getOptions>>}}
