import {createFileRoute} from "@tanstack/react-router";
import {UniversalLogin} from "../components/UniversalLogin";
export const Route=createFileRoute("/login")({
 head:()=>({meta:[{title:"Entrar | Ubuntu POS 360"},{name:"description",content:"Acesso único para Ubuntu Service, empresas e operadores."}]}),
 component:UniversalLogin
});