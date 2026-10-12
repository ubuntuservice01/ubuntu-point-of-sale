import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createElement} from "react";
import {CashierLive} from "../components/CashierLive";

const tenant="11111111-1111-4111-8111-111111111111";
const branch="22222222-2222-4222-8222-222222222222";
const member="33333333-3333-4333-8333-333333333333";
const user="44444444-4444-4444-8444-444444444444";
const product="55555555-5555-4555-8555-555555555555";
const session="66666666-6666-4666-8666-666666666666";
const requests:{action:string;[key:string]:unknown}[]=[];
let opened=false;
const response=(data:unknown)=>Promise.resolve({ok:true,json:()=>Promise.resolve(data)});

beforeEach(()=>{
 requests.length=0;opened=false;
 vi.stubGlobal("fetch",vi.fn((_url:string,init?:RequestInit)=>{
  const url=String(_url);
  if(url.includes("/rest/v1/membership_branches"))return response([{branch_id:branch}]);
  if(url.includes("/rest/v1/branches"))return response([{id:branch,name:"Sede",code:"SEDE"}]);
  if(url.includes("/rest/v1/pos_products"))return response([{id:product,name:"Arroz",unit:"un",price_mzn:125,stock_qty:10,active:true}]);
  if(url.includes("/rest/v1/pos_cash_sessions"))return response(opened?[{id:session,opening_float_mzn:100,opened_at:"2026-10-12T12:00:00.000Z"}]:[]);
  if(url.includes("/functions/v1/pos-cash")){
   const payload=JSON.parse(String(init?.body)) as {action:string;[key:string]:unknown};
   requests.push(payload);
   if(payload.action==="open"){opened=true;return response({ok:true,data:session});}
   if(payload.action==="sale")return response({ok:true,data:{sale_id:"venda-1",total_mzn:125,change_mzn:75,duplicate:false}});
   return response({ok:true,data:225});
  }
  return Promise.reject(new Error("Pedido inesperado: "+url));
 }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
describe("Caixa autenticado — frontend piloto",()=>{
 it("abre turno e regista venda de forma autenticada por empresa e filial",async()=>{
  render(createElement(CashierLive,{token:"jwt-mock",tenantId:tenant,membershipId:member,userId:user,role:"cashier"}));
  await screen.findByRole("heading",{name:"Iniciar turno"});
  fireEvent.click(screen.getByRole("button",{name:"Abrir caixa"}));
  await screen.findByRole("heading",{name:"Caixa aberto"});
  fireEvent.click(screen.getByRole("button",{name:/Arroz/}));
  fireEvent.change(screen.getByLabelText("Dinheiro recebido (MZN)"),{target:{value:"200"}});
  fireEvent.click(screen.getByRole("button",{name:"Registar venda"}));
  await waitFor(()=>expect(requests.some(x=>x.action==="sale")).toBe(true));
  const sale=requests.find(x=>x.action==="sale")!;
  expect(sale.tenant_id).toBe(tenant);
  expect(sale.branch_id).toBe(branch);
  expect(sale.session_id).toBe(session);
  expect(sale.received_amount).toBe(200);
  expect(sale.items).toEqual([{product_id:product,quantity:1}]);
  expect(screen.getByText(/Venda registada no Supabase/)).toBeTruthy();
 });
 it("não permite ao responsável de stock abrir o caixa",async()=>{
  render(createElement(CashierLive,{token:"jwt-mock",tenantId:tenant,membershipId:member,userId:user,role:"stock"}));
  await screen.findByRole("heading",{name:"Iniciar turno"});
  expect((screen.getByRole("button",{name:"Abrir caixa"}) as HTMLButtonElement).disabled).toBe(true);
 });
});
