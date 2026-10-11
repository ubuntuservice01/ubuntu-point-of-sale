import {createFileRoute} from "@tanstack/react-router";
import {PublicCatalog} from "../components/PublicCatalog";
export const Route=createFileRoute("/catalogo")({
 head:()=>({meta:[{title:"Catálogo de demonstração | Ubuntu POS 360"},{name:"description",content:"Montra digital e encomendas de demonstração do Ubuntu POS 360."}]}),
 component:PublicCatalog
});
