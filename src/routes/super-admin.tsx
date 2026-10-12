import {createFileRoute} from "@tanstack/react-router";
import {ProtectedWorkspace} from "../components/ProtectedWorkspace";
export const Route=createFileRoute("/super-admin")({
 head:()=>({meta:[{title:"Super Admin | Ubuntu POS 360"},{name:"description",content:"Administração restrita à Ubuntu Service, Lda."}]}),
 component:()=> <ProtectedWorkspace audience="platform"/>
});