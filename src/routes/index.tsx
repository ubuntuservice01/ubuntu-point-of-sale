import {createFileRoute} from "@tanstack/react-router";
import {UbuntuApp} from "../components/UbuntuApp";
export const Route=createFileRoute("/")({
 validateSearch:(search:Record<string,unknown>)=>({
  tenant:typeof search["tenant"]==="string"&&search["tenant"].length<=90?search["tenant"]:undefined
 }),
 component:MerchantRoute
});
function MerchantRoute(){
 const {tenant}=Route.useSearch();
 return <UbuntuApp key={tenant??"general-demo"} tenantId={tenant}/>;
}
