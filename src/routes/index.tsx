import {createFileRoute} from "@tanstack/react-router";
import {UniversalLogin} from "../components/UniversalLogin";
export const Route=createFileRoute("/")({
 head:()=>({meta:[{title:"Entrar | Ubuntu POS 360"},{name:"description",content:"Acesso central da Ubuntu Service e das empresas."}]}),
 component:UniversalLogin
});