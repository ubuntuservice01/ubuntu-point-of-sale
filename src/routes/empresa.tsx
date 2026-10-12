import {createFileRoute} from "@tanstack/react-router";
import {ProtectedWorkspace} from "../components/ProtectedWorkspace";
export const Route=createFileRoute("/empresa")({
 validateSearch:(search:Record<string,unknown>)=>({tenant:typeof search["tenant"]==="string"?search["tenant"]:undefined}),
 head:()=>({meta:[{title:"Minha Empresa | Ubuntu POS 360"},{name:"description",content:"Administração exclusiva de cada empresa."}]}),
 component:()=> <ProtectedWorkspace audience="company"/>
});