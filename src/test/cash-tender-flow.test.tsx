import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {cashSessionBalance} from "../lib/commercial";
import {initialStore,roundMoney,safeStore,type Sale,type Store} from "../lib/domain";
import {cashTenderDetails} from "../lib/thermal-receipt";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),useNavigate:()=>()=>undefined};
});
const product=initialStore().products.find(p=>p.sku==="ALI-001")!;
const cashSession={id:"CX-ABERTO",openedAt:"2026-10-11T09:00:00.000Z",openingFloat:100,status:"aberta" as const};
beforeEach(()=>{
 window.localStorage.clear();
 vi.stubGlobal("indexedDB",undefined);
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn(),
  addListener:vi.fn(),removeListener:vi.fn()
 })));
 const store=initialStore();
 store.cashSessions=[cashSession];
 window.localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(store));
});
afterEach(()=>{cleanup();window.localStorage.clear();vi.unstubAllGlobals()});
async function openPos(){
 render(createElement(UbuntuApp));
 await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
 fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação principal"})).getByRole("button",{name:"Ponto de venda"}));
}
function persisted():Store{return safeStore(JSON.parse(window.localStorage.getItem("ubuntu-pos360-demo-v1")??"{}"))}
async function waitSale():Promise<Sale>{
 await waitFor(()=>expect(persisted().sales.length).toBe(1));
 return persisted().sales[0]!;
}
function addInNormal(){
 const search=screen.getByRole("textbox",{name:"Pesquisar produto"});
 fireEvent.change(search,{target:{value:"ALI-001"}});
 fireEvent.keyDown(search,{key:"Enter"});
}
describe("Valor recebido e troco — registo, histórico e comprovativos",()=>{
 it("no POS normal impede dinheiro insuficiente, guarda o montante recebido e imprime o troco",async()=>{
  await openPos();
  addInNormal();
  const tender=screen.getByLabelText("Valor recebido em dinheiro");
  const checkout=screen.getByRole("button",{name:/Registar venda/});
  expect((checkout as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(tender,{target:{value:String(product.price-1)}});
  expect((checkout as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(tender,{target:{value:"1000"}});
  expect(screen.getByText("Troco previsto")).toBeTruthy();
  expect((checkout as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(checkout);
  const sale=await waitSale();
  expect(sale.method).toBe("dinheiro");
  expect(sale.total).toBe(product.price);
  expect(sale.cashReceived).toBe(1000);
  expect(sale.cashChange).toBe(roundMoney(1000-product.price));
  const modal=screen.getByRole("dialog",{name:"Venda registada — comprovativo térmico"});
  expect(within(modal).getByText("Dinheiro recebido")).toBeTruthy();
  expect(within(modal).getByText("Troco calculado")).toBeTruthy();
  expect(within(modal).getByText("1 000,00 MZN")).toBeTruthy();
 });
 it("no Caixa Rápido persiste o valor do teclado numérico e mantém o mesmo registo de venda",async()=>{
  await openPos();
  fireEvent.click(screen.getByRole("button",{name:"Modo Caixa Rápido"}));
  const fast=screen.getByRole("region",{name:"Modo Caixa Rápido"});
  fireEvent.click(within(fast).getByRole("button",{name:"Adicionar "+product.name}));
  fireEvent.click(within(fast).getByRole("button",{name:"Valor recebido"}));
  for(const key of "1000")fireEvent.click(within(fast).getByRole("button",{name:key}));
  expect(within(fast).getByText("Troco previsto")).toBeTruthy();
  const confirm=within(fast).getByRole("button",{name:/Registar venda/});
  expect((confirm as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(confirm);
  const sale=await waitSale();
  expect(sale.cashReceived).toBe(1000);
  expect(sale.cashChange).toBe(roundMoney(1000-product.price));
  expect(persisted().stockMovements.some(m=>m.reference===sale.id)).toBe(true);
 });
 it("um pagamento por M-Pesa não inventa valor recebido ou troco",async()=>{
  await openPos();
  addInNormal();
  fireEvent.click(screen.getByRole("button",{name:"M-Pesa"}));
  expect(screen.queryByLabelText("Valor recebido em dinheiro")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/Registar venda/}));
  const sale=await waitSale();
  expect(sale.method).toBe("mpesa");
  expect(sale.cashReceived).toBeUndefined();
  expect(sale.cashChange).toBeUndefined();
  expect(within(screen.getByRole("dialog",{name:"Venda registada — comprovativo térmico"})).queryByText("Troco calculado")).toBeNull();
 });
 it("o histórico mostra recebido/troco sem alterar vendas antigas; reimpressão usa os valores guardados",async()=>{
  const state=initialStore();
  state.cashSessions=[cashSession];
  state.sales=[
   {id:"VD-HIST",createdAt:"2026-10-11T12:00:00.000Z",method:"dinheiro",items:[],total:750,cashReceived:1000,cashChange:250},
   {id:"VD-OLD",createdAt:"2026-10-10T12:00:00.000Z",method:"dinheiro",items:[],total:500}
  ];
  localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(state));
  render(createElement(UbuntuApp));
  await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação principal"})).getByRole("button",{name:"Relatórios"}));
  const history=screen.getByRole("heading",{name:"Histórico de vendas"}).closest("section")!;
  expect(within(history).getByText("Valor recebido")).toBeTruthy();
  expect(within(history).getByText("Troco")).toBeTruthy();
  const first=within(history).getByText("VD-HIST").closest("tr")!;
  const old=within(history).getByText("VD-OLD").closest("tr")!;
  expect(first.textContent).toContain("1 000,00");
  expect(first.textContent).toContain("250,00");
  expect(old.querySelectorAll("td")[5]?.textContent).toBe("—");
  fireEvent.click(within(history).getByRole("button",{name:"Reimprimir comprovativo VD-HIST"}));
  const receipt=screen.getByRole("dialog",{name:"Reimprimir comprovativo"});
  expect(within(receipt).getByText("Dinheiro recebido")).toBeTruthy();
  expect(within(receipt).getByText("Troco calculado")).toBeTruthy();
  expect(persisted().sales).toHaveLength(2);
 });
 it("para o saldo do caixa contabiliza apenas o total vendido, não o valor entregue antes do troco",()=>{
  const sale:Sale={id:"VD-DIN-01",createdAt:"2026-10-11T12:00:00",items:[{productId:"p",name:"P",qty:1,price:750}],
   total:750,method:"dinheiro",cashSessionId:cashSession.id,cashReceived:1000,cashChange:250};
  const store={...initialStore(),cashSessions:[cashSession],sales:[sale]};
  expect(cashSessionBalance(store,cashSession).expected).toBe(850);
  expect(cashTenderDetails(sale)).toEqual({received:1000,change:250});
 });
});
