import {createFileRoute} from "@tanstack/react-router";
import {SuperAdminAuthGate} from "../components/SuperAdminAuthGate";

export const Route=createFileRoute("/super-admin")({
 head:()=>({meta:[{title:"Super Admin | Ubuntu POS 360"},{name:"description",content:"Acesso autenticado à administração da Ubuntu Service, Lda."}]}),
 component:SuperAdminAuthGate
});
