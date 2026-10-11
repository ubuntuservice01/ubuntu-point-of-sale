import {createFileRoute} from "@tanstack/react-router";
import {SuperAdminApp} from "../components/SuperAdminApp";

export const Route=createFileRoute("/super-admin")({
 head:()=>({meta:[{title:"Super Admin | Ubuntu POS 360"},{name:"description",content:"Painel demonstrativo da Ubuntu Service, Lda. para empresas, planos, licenças e módulos."}]}),
 component:SuperAdminApp
});
