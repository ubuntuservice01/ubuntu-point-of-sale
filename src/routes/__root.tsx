import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import adminCss from "../styles/admin.css?url";
import companyCss from "../styles/company.css?url";

export const Route = createRootRouteWithContext<{queryClient:QueryClient}>()({
 head:()=>({
  meta:[
   {charSet:"utf-8"},
   {name:"viewport",content:"width=device-width, initial-scale=1"},
   {title:"Ubuntu POS 360 | Ubuntu Service, Lda."},
   {name:"description",content:"Ubuntu POS 360 — Gestão comercial integrada, moderna e acessível."},
   {property:"og:title",content:"Ubuntu POS 360"},
   {property:"og:description",content:"Criando pontes entre o físico e o digital."}
  ],
  links:[{rel:"stylesheet",href:appCss},{rel:"stylesheet",href:adminCss},{rel:"stylesheet",href:companyCss},{rel:"icon",href:"/favicon.svg",type:"image/svg+xml"}]
 }),
 shellComponent:Shell,
 component:Root
});
function Shell({children}:{children:ReactNode}){return <html lang="pt-MZ"><head><HeadContent/></head><body>{children}<Scripts/></body></html>}
function Root(){const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><Outlet/></QueryClientProvider>}
