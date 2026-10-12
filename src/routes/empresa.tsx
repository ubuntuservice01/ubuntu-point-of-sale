import {createFileRoute} from "@tanstack/react-router";
import {CompanyAuthGate} from "../components/CompanyAuthGate";
export const Route=createFileRoute("/empresa")({
 validateSearch:(search:Record<string,unknown>)=>({tenant:typeof search["tenant"]==="string"?search["tenant"]:undefined}),
 head:()=>({meta:[{title:"Administração da Empresa | Ubuntu POS 360"},{name:"description",content:"Protótipo de administração empresarial com filiais, funcionários e permissões."}]}),
 component:CompanyRoute
});
function CompanyRoute(){const {tenant}=Route.useSearch();return <CompanyAuthGate key={tenant??"default"} tenantId={tenant}/>}
