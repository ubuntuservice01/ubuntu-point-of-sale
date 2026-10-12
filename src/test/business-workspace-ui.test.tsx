import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {initialAdminStore,type AdminTenant} from "../lib/admin-demo";
import {scopedOfflineKey,OFFLINE_LEGACY_KEY} from "../lib/offline-model";
import {initialStore} from "../lib/domain";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),useNavigate:()=>()=>undefined};
});
beforeEach(()=>{
 localStorage.clear();sessionStorage.clear();
 vi.stubGlobal("indexedDB",undefined);
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn(),
  addListener:vi.fn(),removeListener:vi.fn()
 })));
 localStorage.setItem("ubuntu-pos360-super-admin-demo-v1",JSON.stringify(initialAdminStore("2026-10-12")));
});
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();vi.unstubAllGlobals();vi.restoreAllMocks()});

describe("Espaço de trabalho sectorial integrado no POS",()=>{
 it("farmácia mostra somente módulos comuns e farmácia, com serviços num painel",async()=>{
  render(<UbuntuApp tenantId="demo-farm"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Farmácia Modelo"})).toBeTruthy());
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  expect(within(nav).getByRole("button",{name:"Dispensa, lotes e validade"})).toBeTruthy();
  expect(within(nav).getByRole("button",{name:"Ponto de venda e Caixa Rápido"})).toBeTruthy();
  expect(within(nav).getByRole("button",{name:"Compras e entradas"})).toBeTruthy();
  expect(within(nav).getByRole("button",{name:"Relatórios"})).toBeTruthy();
  expect(within(nav).queryByRole("button",{name:/Pesagem e cortes/})).toBeNull();
  expect(within(nav).queryByRole("button",{name:/Mesas, comandas e cozinha/})).toBeNull();
  fireEvent.click(within(nav).getByRole("button",{name:"Dispensa, lotes e validade"}));
  expect(screen.getByRole("heading",{name:"Farmácias"})).toBeTruthy();
 });
 it("Farmácia tem directório completo e Compras/Fornecedores abrem páginas reais",async()=>{
  render(<UbuntuApp tenantId="demo-farm"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Farmácia Modelo"})).toBeTruthy());
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  fireEvent.click(within(nav).getByRole("button",{name:"Dispensa, lotes e validade"}));
  const directory=screen.getByRole("region",{name:"Serviços disponíveis para Gestão de farmácia"});
  for(const target of ["Medicamentos / produtos","Compras e entradas","Fornecedores","Clientes e fiado",
    "Caixa e turnos","Relatórios","Inventário e movimentos","Operadores e permissões"]){
   const label=target==="Medicamentos / produtos"?"Produtos e preços":target;
   expect(within(directory).getByRole("button",{name:new RegExp("^"+label)})).toBeTruthy();
  }
  expect(within(directory).queryByRole("button",{name:/Pesagem e cortes/})).toBeNull();
  expect(screen.getByRole("button",{name:"Nova dispensa"}) instanceof HTMLButtonElement).toBe(true);
  expect((screen.getByRole("button",{name:"Nova dispensa"}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/A dispensa estará disponível assim que existir um lote válido/)).toBeTruthy();
  fireEvent.click(within(directory).getByRole("button",{name:/^Compras e entradas/}));
  expect(screen.getByRole("heading",{name:"Compras a fornecedores"})).toBeTruthy();
  fireEvent.click(within(nav).getByRole("button",{name:"Dispensa, lotes e validade"}));
  const directoryAgain=screen.getByRole("region",{name:"Serviços disponíveis para Gestão de farmácia"});
  fireEvent.click(within(directoryAgain).getByRole("button",{name:/^Fornecedores/}));
  expect(screen.getByRole("heading",{name:"Fornecedores"})).toBeTruthy();
 });
 it("Talho apresenta os serviços do negócio dentro do sector e nenhum atalho farmacêutico",async()=>{
  render(<UbuntuApp tenantId="demo-talho"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Talho Modelo"})).toBeTruthy());
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  fireEvent.click(within(nav).getByRole("button",{name:"Pesagem e cortes"}));
  const directory=screen.getByRole("region",{name:"Serviços disponíveis para Gestão de talho"});
  expect(within(directory).getByRole("button",{name:/^Ponto de venda e Caixa Rápido/})).toBeTruthy();
  expect(within(directory).getByRole("button",{name:/^Compras e entradas/})).toBeTruthy();
  expect(within(directory).getByRole("button",{name:/^Relatórios/})).toBeTruthy();
  expect(within(directory).queryByRole("button",{name:/^Dispensa, lotes e validade/})).toBeNull();
 });
 it("talho recebe pesagem e cortes, vendas e stock, sem farmácia",async()=>{
  render(<UbuntuApp tenantId="demo-talho"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Talho Modelo"})).toBeTruthy());
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  expect(within(nav).getByRole("button",{name:"Pesagem e cortes"})).toBeTruthy();
  expect(within(nav).getByRole("button",{name:"Ponto de venda e Caixa Rápido"})).toBeTruthy();
  expect(within(nav).queryByRole("button",{name:/Dispensa, lotes e validade/})).toBeNull();
 });
 it("uma licença suspensa bloqueia acesso a todos os serviços",async()=>{
  render(<UbuntuApp tenantId="demo-loja"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Acesso à empresa suspenso"})).toBeTruthy());
  expect(screen.queryByRole("navigation",{name:"Navegação principal"})).toBeNull();
 });
 it("alterar dados no POS farmácia não substitui dados do POS geral",async()=>{
  const general=initialStore();
  general.sales=[{id:"GERAL",items:[],total:50,method:"mpesa",createdAt:"2026-10-12T09:00:00"}];
  localStorage.setItem(OFFLINE_LEGACY_KEY,JSON.stringify(general));
  render(<UbuntuApp tenantId="demo-farm"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Farmácia Modelo"})).toBeTruthy());
  const stored=localStorage.getItem(scopedOfflineKey(OFFLINE_LEGACY_KEY,"demo-farm"));
  expect(stored).toBeNull();
  expect(localStorage.getItem(OFFLINE_LEGACY_KEY)).toContain("GERAL");
 });
 it("empresa inexistente não recebe a aplicação geral como substituto",async()=>{
  render(<UbuntuApp tenantId="empresa-inexistente"/>);
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Empresa não encontrada"})).toBeTruthy());
  expect(screen.queryByRole("navigation",{name:"Navegação principal"})).toBeNull();
 });
});
