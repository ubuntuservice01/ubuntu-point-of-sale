import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {initialStore,type Sale} from "../lib/domain";
vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined};
});
const sale:Sale={
 id:"VD-HIST-123",createdAt:"2026-10-10T12:00:00.000Z",method:"emola",source:"pos",
 items:[{productId:"p1",name:"Arroz 5 kg",qty:2,price:385}],total:770
};
beforeEach(()=>{
 window.localStorage.clear();
 window.localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify({...initialStore(),sales:[sale]}));
});
afterEach(()=>{cleanup();window.localStorage.clear();vi.unstubAllGlobals()});
describe("Histórico e reimpressão térmica",()=>{
 it("reimprime uma venda antiga sem registar uma segunda venda e permite trocar papel",async()=>{
  const print=vi.fn();
  vi.stubGlobal("print",print);
  render(createElement(UbuntuApp));
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  fireEvent.click(within(nav).getByRole("button",{name:"Relatórios"}));
  const button=await screen.findByRole("button",{name:"Reimprimir comprovativo VD-HIST-123"});
  fireEvent.click(button);
  const modal=screen.getByRole("dialog",{name:"Reimprimir comprovativo"});
  expect(within(modal).getByRole("region",{name:"Comprovativo não fiscal VD-HIST-123"})).toBeTruthy();
  fireEvent.change(within(modal).getByLabelText("Largura do papel"),{target:{value:"58mm"}});
  expect(within(modal).getByRole("region",{name:"Comprovativo não fiscal VD-HIST-123"}).className).toContain("thermal-receipt-58mm");
  fireEvent.click(within(modal).getByRole("button",{name:"Imprimir comprovativo"}));
  expect(print).toHaveBeenCalledOnce();
  fireEvent.click(within(modal).getByRole("button",{name:"Fechar"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Reimprimir comprovativo"})).toBeNull());
  const saved=JSON.parse(window.localStorage.getItem("ubuntu-pos360-demo-v1")??"{}");
  expect(saved.sales).toHaveLength(1);
  expect(saved.sales[0].id).toBe("VD-HIST-123");
  expect(saved.receiptSettings.paper).toBe("58mm");
 });
 it("abre as definições de comprovativo com identificação personalizável da loja",()=>{
  render(createElement(UbuntuApp));
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  fireEvent.click(within(nav).getByRole("button",{name:"Definições"}));
  expect(screen.getByRole("heading",{name:"Comprovativos térmicos (não fiscais)"})).toBeTruthy();
  expect(screen.getByRole("textbox",{name:"Nome comercial do estabelecimento"})).toBeTruthy();
 });
});
