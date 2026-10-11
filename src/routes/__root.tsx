import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import adminCss from "../styles/admin.css?url";
import companyCss from "../styles/company.css?url";
import commerceCss from "../styles/commercial.css?url";
import sectorCss from "../styles/sectors.css?url";
import expansionCss from "../styles/expansion.css?url";
import digitalCss from "../styles/digital.css?url";
import publicCss from "../styles/public-catalog.css?url";
import uxCss from "../styles/ux-refinements.css?url";
import barcodeCss from "../styles/barcode-scanner.css?url";
import mobilePosCss from "../styles/mobile-pos.css?url";
import profitCss from "../styles/profitability.css?url";

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
  links:[{rel:"stylesheet",href:appCss},{rel:"stylesheet",href:adminCss},{rel:"stylesheet",href:companyCss},{rel:"stylesheet",href:commerceCss},{rel:"stylesheet",href:sectorCss},{rel:"stylesheet",href:expansionCss},{rel:"stylesheet",href:digitalCss},{rel:"stylesheet",href:publicCss},{rel:"stylesheet",href:uxCss},{rel:"stylesheet",href:barcodeCss},{rel:"stylesheet",href:mobilePosCss},{rel:"stylesheet",href:profitCss},{rel:"icon",href:"/favicon.svg",type:"image/svg+xml"}]
 }),
 shellComponent:Shell,
 component:Root
});
function Shell({children}:{children:ReactNode}){return <html lang="pt-MZ"><head><HeadContent/></head><body>{children}<Scripts/></body></html>}
function Root(){const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><Outlet/></QueryClientProvider>}
