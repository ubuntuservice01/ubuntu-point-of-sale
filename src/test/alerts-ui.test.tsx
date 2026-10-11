import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {initialStore,type Store} from "../lib/domain";
import {AlertCenter} from "../components/AlertCenter";
import {operationalAlerts} from "../lib/alerts";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined};
});
const nav=(name:string)=>screen.getByRole("navigation",{name});
beforeEach(()=>{
 window.localStorage.clear();
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:query==="(min-width:651px)",media:query,
  addEventListener:vi.fn(),removeEventListener:vi.fn(),addListener:vi.fn(),removeListener:vi.fn()
 })));
});
afterEach(()=>{cleanup();window.localStorage.clear();vi.unstubAllGlobals()});
describe("Central de alertas e navegação",()=>{
 it("o sino apresenta alertas reais de stock e abre a central completa",()=>{
  render(createElement(UbuntuApp));
  const bell=screen.getByRole("button",{name:/Alertas \(2 por ler\)/});
  fireEvent.click(bell);
  const popup=screen.getByRole("region",{name:"Alertas da demonstração"});
  expect(within(popup).getByText("Alertas operacionais")).toBeTruthy();
  expect(within(popup).getAllByRole("button").length).toBe(3);
  fireEvent.click(within(popup).getByRole("button",{name:/Abrir central de alertas/}));
  expect(screen.getByRole("heading",{name:"Central de notificações e alertas"})).toBeTruthy();
  expect(screen.getByRole("button",{name:"Marcar todos como lidos"})).toBeTruthy();
 });
 it("marcar todos como lidos actualiza o sino e o estado fica no armazenamento local",()=>{
  render(createElement(UbuntuApp));
  fireEvent.click(within(nav("Navegação principal")).getByRole("button",{name:"Central de alertas"}));
  fireEvent.click(screen.getByRole("button",{name:"Marcar todos como lidos"}));
  expect(screen.getByRole("button",{name:"Alertas (0 por ler)"})).toBeTruthy();
  const store=JSON.parse(window.localStorage.getItem("ubuntu-pos360-demo-v1")??"{}");
  expect(store.readAlertIds.length).toBe(2);
  fireEvent.click(screen.getByRole("button",{name:"Lidos"}));
  expect(screen.getAllByRole("button",{name:/Marcar como por ler:/})).toHaveLength(2);
 });
 it("clicar num alerta de produto direcciona para produtos e aplica pesquisa do SKU",()=>{
  render(createElement(UbuntuApp));
  fireEvent.click(within(nav("Navegação principal")).getByRole("button",{name:"Central de alertas"}));
  fireEvent.click(screen.getAllByRole("button",{name:"Ver produto"})[0]!);
  expect(screen.getByRole("heading",{name:"Produtos e stock"})).toBeTruthy();
  expect((screen.getByRole("textbox",{name:"Pesquisar produtos"}) as HTMLInputElement).value).toMatch(/HIG-001|ALI-005/);
 });
 it("funciona com fiado e lotes próximos de expirar, sem valores fictícios",()=>{
  const s:Store={...initialStore(),
   products:[{id:"p1",name:"Medicamento exemplo",sku:"MED-1",unit:"un.",price:35,stock:50,active:true,category:"Farmácia"}],
   customers:[{id:"c",name:"Cliente Teste",phone:"841234567",debt:100}],
   credits:[{id:"debt",customerId:"c",kind:"fiado",amount:100,dueDate:"2020-01-01",createdAt:"2019-12-01T10:00:00"}],
   pharmaLots:[{id:"exp",productId:"p1",lotNumber:"L-200",expiryDate:"2020-01-01",qty:6,createdAt:"2019-12-01T10:00:00"}]
  };
  const alerts=operationalAlerts(s,new Date("2026-10-11T12:00:00"));
  const go=vi.fn(),mark=vi.fn(),unread=vi.fn(),markAll=vi.fn(),settings=vi.fn();
  render(createElement(AlertCenter,{alerts,readIds:[],onOpen:go,onRead:mark,onUnread:unread,onReadAll:markAll,settings:s.alertSettings,onSaveSettings:settings}));
  expect(screen.getByText("Cliente Teste — fiado vencido")).toBeTruthy();
  expect(screen.getByText("Medicamento exemplo — lote expirado")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Validade"}));
  expect(screen.queryByText("Cliente Teste — fiado vencido")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Ver lotes da farmácia"}));
  expect(go).toHaveBeenCalledWith(expect.objectContaining({section:"farmacia",reference:"exp"}));
 });
 it("configura limites e filtros, distinguindo lidos dos que permanecem pendentes",()=>{
  const s:Store={...initialStore(),products:[
   {id:"p",name:"Stock normal",sku:"NORM",category:"Mercearia",unit:"un.",price:11,stock:12,active:true}
  ]};
  const alerts=operationalAlerts(s,new Date("2026-10-11T12:00:00"));
  const save=vi.fn();
  render(createElement(AlertCenter,{alerts,readIds:[],onOpen:vi.fn(),onRead:vi.fn(),onUnread:vi.fn(),onReadAll:vi.fn(),settings:s.alertSettings,onSaveSettings:save}));
  fireEvent.click(screen.getByRole("button",{name:"Configurar alertas"}));
  fireEvent.change(screen.getByRole("spinbutton",{name:"Limite de stock baixo"}),{target:{value:"15"}});
  fireEvent.click(screen.getByRole("button",{name:"Guardar limites"}));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({lowStockThreshold:15}));
  fireEvent.click(screen.getByRole("button",{name:"Todos"}));
  expect(screen.getByRole("heading",{name:"Tudo em ordem nesta demonstração"})).toBeTruthy();
 });
});
