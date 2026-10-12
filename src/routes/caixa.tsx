import {createFileRoute} from "@tanstack/react-router";
import {ProtectedWorkspace} from "../components/ProtectedWorkspace";
export const Route=createFileRoute("/caixa")({
 validateSearch:(s:Record<string,unknown>)=>({tenant:typeof s["tenant"]==="string"?s["tenant"]:undefined}),
 head:()=>({meta:[{title:"Ponto de Venda | Ubuntu POS 360"}]}),
 component:()=> <ProtectedWorkspace audience="cashier"/>
});