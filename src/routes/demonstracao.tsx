import {createFileRoute} from "@tanstack/react-router";
import {UbuntuApp} from "../components/UbuntuApp";
/** Apenas ambiente demonstrativo local, independente das contas Supabase. */
export const Route=createFileRoute("/demonstracao")({
 validateSearch:(search:Record<string,unknown>)=>({
  tenant:typeof search["tenant"]==="string"&&search["tenant"].length<=90?search["tenant"]:undefined
 }),
 head:()=>({meta:[{title:"Demonstração | Ubuntu POS 360"},{name:"description",content:"Dados fictícios locais, sem ligação comercial ou fiscal."}]}),
 component:()=>{const {tenant}=Route.useSearch();return <UbuntuApp key={tenant??"general-demo"} tenantId={tenant}/>;}
});