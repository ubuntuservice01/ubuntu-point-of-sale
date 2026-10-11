/* eslint-disable */
// @ts-nocheck
// Generated route bindings. The TanStack Router plugin can regenerate this file.
import {Route as rootRouteImport} from "./routes/__root";
import {Route as IndexRouteImport} from "./routes/index";
import {Route as SuperAdminRouteImport} from "./routes/super-admin";
const IndexRoute=IndexRouteImport.update({id:"/",path:"/",getParentRoute:()=>rootRouteImport} as any);
const SuperAdminRoute=SuperAdminRouteImport.update({id:"/super-admin",path:"/super-admin",getParentRoute:()=>rootRouteImport} as any);
export interface FileRoutesByFullPath {"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute}
export interface FileRoutesByTo {"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute}
export interface FileRoutesById {"__root__":typeof rootRouteImport;"/":typeof IndexRoute;"/super-admin":typeof SuperAdminRoute}
export interface FileRouteTypes {fileRoutesByFullPath:FileRoutesByFullPath;fullPaths:"/"|"/super-admin";fileRoutesByTo:FileRoutesByTo;to:"/"|"/super-admin";id:"__root__"|"/"|"/super-admin";fileRoutesById:FileRoutesById}
export interface RootRouteChildren {IndexRoute:typeof IndexRoute;SuperAdminRoute:typeof SuperAdminRoute}
declare module "@tanstack/react-router" {interface FileRoutesByPath {
 "/":{id:"/";path:"/";fullPath:"/";preLoaderRoute:typeof IndexRouteImport;parentRoute:typeof rootRouteImport};
 "/super-admin":{id:"/super-admin";path:"/super-admin";fullPath:"/super-admin";preLoaderRoute:typeof SuperAdminRouteImport;parentRoute:typeof rootRouteImport}
}}
const rootRouteChildren:RootRouteChildren={IndexRoute,SuperAdminRoute};
export const routeTree=rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>();
import type {getRouter} from "./router";
import type {startInstance} from "./start";
declare module "@tanstack/react-start" {interface Register {ssr:true;router:Awaited<ReturnType<typeof getRouter>>;config:Awaited<ReturnType<typeof startInstance.getOptions>>}}
