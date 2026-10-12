import {createFileRoute} from "@tanstack/react-router";
import {ProtectedWorkspace} from "../components/ProtectedWorkspace";
export const Route=createFileRoute("/stock")({
 validateSearch:(s:Record<string,unknown>)=>({tenant:typeof s["tenant"]==="string"?s["tenant"]:undefined}),
 head:()=>({meta:[{title:"Stock | Ubuntu POS 360"}]}),
 component:()=> <ProtectedWorkspace audience="stock"/>
});