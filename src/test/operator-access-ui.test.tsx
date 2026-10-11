import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {webcrypto} from "node:crypto";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {initialStore,type Store} from "../lib/domain";
import {
 DEMO_SESSION_KEY,defaultOperators,securePin,type Operator
} from "../lib/operators";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),useNavigate:()=>()=>undefined};
});
const worker=(role:Operator["role"],id="user-"+role):Operator=>({
 id,name:"Operador "+role,role,active:true,createdAt:"2026-10-11T10:00:00.000Z",updatedAt:"2026-10-11T10:00:00.000Z"
});
function prepare(operators:Operator[],operatorId:string|null){
 const s:Store={...initialStore(),operators};
 localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(s));
 if(operatorId)sessionStorage.setItem(DEMO_SESSION_KEY,JSON.stringify({operatorId,startedAt:"2026-10-11T11:00:00.000Z"}));
}
function stored():Store{return JSON.parse(localStorage.getItem("ubuntu-pos360-demo-v1")??"{}") as Store}
const menu=()=>screen.getByRole("navigation",{name:"Navegação principal"});
async function loadApp(){
 render(createElement(UbuntuApp));
 await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
}
beforeEach(()=>{
 localStorage.clear();sessionStorage.clear();
 vi.stubGlobal("indexedDB",undefined);
 vi.stubGlobal("crypto",webcrypto);
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn(),
  addListener:vi.fn(),removeListener:vi.fn()
 })));
});
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();vi.unstubAllGlobals()});

describe("Gestão local de operadores e navegação",()=>{
 it("gerente vê Operadores e permissões e a equipa de demonstração",async()=>{
  await loadApp();
  fireEvent.click(within(menu()).getByRole("button",{name:"Operadores e permissões"}));
  expect(screen.getByRole("heading",{name:"Operadores e permissões"})).toBeTruthy();
  expect(screen.getAllByText("Gerente da demonstração").length).toBeGreaterThan(0);
  expect(screen.getByRole("button",{name:"Novo operador"})).toBeTruthy();
  expect(screen.getByText(/permissões nesta fase são locais/)).toBeTruthy();
 });
 it("o caixa não tem acesso ao lucro, preços, inventário ou gestão da equipa",async()=>{
  const cash=worker("caixa");prepare([...defaultOperators(),cash],cash.id);
  await loadApp();
  expect(within(menu()).getByRole("button",{name:"Ponto de venda"})).toBeTruthy();
  expect(within(menu()).getByRole("button",{name:"Caixa"})).toBeTruthy();
  expect(within(menu()).queryByRole("button",{name:"Relatórios"})).toBeNull();
  expect(within(menu()).queryByRole("button",{name:"Resumo financeiro"})).toBeNull();
  expect(within(menu()).queryByRole("button",{name:"Produtos e stock"})).toBeNull();
  expect(within(menu()).queryByRole("button",{name:"Operadores e permissões"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Perfil do operador"}));
  expect(screen.getByText(/Operador de caixa · Sessão local demonstrativa/)).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Gerir operadores"})).toBeNull();
  expect(screen.getByRole("button",{name:"Solicitar devolução"})).toBeTruthy();
 });
 it("o responsável pelo stock abre produtos em modo consulta sem editar ou vender",async()=>{
  const stock=worker("stock");prepare([...defaultOperators(),stock],stock.id);
  await loadApp();
  expect(screen.getByRole("heading",{name:"Produtos e stock"})).toBeTruthy();
  expect(screen.getByText("Consulta de stock · só leitura")).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Adicionar produto"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Editar"})).toBeNull();
  expect(within(menu()).queryByRole("button",{name:"Ponto de venda"})).toBeNull();
  expect(within(menu()).getByRole("button",{name:"Compras"})).toBeTruthy();
 });
 it("trocar de operador exige uma nova escolha na identificação local",async()=>{
  await loadApp();
  fireEvent.click(screen.getByRole("button",{name:"Perfil do operador"}));
  fireEvent.click(screen.getByRole("button",{name:/Sair ou trocar de operador/}));
  expect(screen.getByRole("heading",{name:"Identificação do operador"})).toBeTruthy();
  expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBe("logout");
  fireEvent.click(screen.getByRole("button",{name:"Entrar no POS"}));
  await waitFor(()=>expect(screen.getByRole("navigation",{name:"Navegação principal"})).toBeTruthy());
  expect(screen.getByText(/Gerente da demonstração/)).toBeTruthy();
 });
 it("gerente altera o próprio PIN: acesso seguinte rejeita PIN errado e aceita PIN correcto",async()=>{
  await loadApp();
  fireEvent.click(within(menu()).getByRole("button",{name:"Operadores e permissões"}));
  const first=screen.getAllByText("Gerente da demonstração").find(el=>el.closest(".op-operator-item"))!.closest("article")!;
  fireEvent.click(within(first).getByRole("button",{name:"Editar"}));
  const dialog=screen.getByRole("dialog",{name:"Editar operador"});
  fireEvent.change(within(dialog).getByPlaceholderText("4 a 8 algarismos"),{target:{value:"6382"}});
  fireEvent.click(within(dialog).getByRole("button",{name:"Guardar operador"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Editar operador"})).toBeNull());
  await waitFor(()=>expect(stored().operators[0]?.pinHash).toMatch(/^[0-9a-f]{64}$/));
  fireEvent.click(screen.getByRole("button",{name:"Perfil do operador"}));
  fireEvent.click(screen.getByRole("button",{name:/Sair ou trocar de operador/}));
  const pin=screen.getByLabelText("PIN do operador");
  fireEvent.change(pin,{target:{value:"0000"}});
  fireEvent.click(screen.getByRole("button",{name:"Entrar no POS"}));
  await waitFor(()=>expect(screen.getByRole("alert")).toHaveProperty("textContent",expect.stringContaining("PIN incorrecto")));
  fireEvent.change(pin,{target:{value:"6382"}});
  fireEvent.click(screen.getByRole("button",{name:"Entrar no POS"}));
  await waitFor(()=>expect(screen.getByRole("navigation",{name:"Navegação principal"})).toBeTruthy());
 });
 it("caixa solicita autorização do supervisor por PIN, com registo identificável",async()=>{
  const cashier=worker("caixa"),supervisor={...worker("supervisor"),...await securePin("8462")};
  prepare([...defaultOperators(),cashier,supervisor],cashier.id);
  await loadApp();
  fireEvent.click(screen.getByRole("button",{name:"Solicitar devolução"}));
  const approval=screen.getByRole("dialog",{name:"Autorização do responsável"});
  expect(within(approval).getByText("Devolução de venda")).toBeTruthy();
  fireEvent.change(within(approval).getByPlaceholderText("PIN do aprovador"),{target:{value:"8462"}});
  fireEvent.click(within(approval).getByRole("button",{name:"Aprovar uma operação"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Autorização do responsável"})).toBeNull());
  await waitFor(()=>expect(stored().operatorApprovals.length).toBe(1));
  expect(stored().operatorApprovals[0]).toMatchObject({
   scope:"returns",requesterId:cashier.id,approverId:supervisor.id
  });
  expect(screen.getByRole("navigation",{name:"Navegação principal"})).toBeTruthy();
 });
 it("supervisor pede autorização do gerente antes de alterar preço",async()=>{
  const supervisor=worker("supervisor"),manager={...defaultOperators()[0]!,...await securePin("7294")};
  prepare([manager,supervisor],supervisor.id);
  await loadApp();
  fireEvent.click(menu().querySelector<HTMLButtonElement>('.nav-link[title="Produtos e stock"]')!);
  const edit=screen.getAllByRole("button",{name:"Editar"})[0]!;
  fireEvent.click(edit);
  const productModal=screen.getByRole("dialog",{name:"Editar produto"});
  const price=within(productModal).getByRole("spinbutton",{name:"Preço de venda (MZN)"});
  fireEvent.change(price,{target:{value:"399"}});
  fireEvent.click(within(productModal).getByRole("button",{name:"Guardar produto"}));
  const approval=screen.getByRole("dialog",{name:"Autorização do responsável"});
  fireEvent.change(within(approval).getByPlaceholderText("PIN do aprovador"),{target:{value:"7294"}});
  fireEvent.click(within(approval).getByRole("button",{name:"Aprovar uma operação"}));
  await waitFor(()=>expect(stored().operatorApprovals.some(a=>a.scope==="price"&&a.approverId===manager.id)).toBe(true));
  await waitFor(()=>expect(stored().products.find(p=>p.id==="p1")?.price).toBe(399));
 });
});
