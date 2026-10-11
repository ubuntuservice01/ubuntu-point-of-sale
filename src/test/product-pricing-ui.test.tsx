import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {safeStore,initialStore} from "../lib/domain";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,search,children,...props}:{to:string;search?:unknown;children?:React.ReactNode;[key:string]:unknown})=>React.createElement("a",{...props,href:to},children)};
});
beforeEach(()=>window.localStorage.clear());
afterEach(()=>{cleanup();window.localStorage.clear()});

describe("Formulário de preços de produtos",()=>{
 it("pede compra e venda separadas, mostra diferença e guarda ambas",async()=>{
  render(createElement(UbuntuApp));
  await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
  fireEvent.click(screen.getByRole("navigation",{name:"Navegação principal"}).querySelector<HTMLButtonElement>('.nav-link[title="Produtos e stock"]')!);
  fireEvent.click(screen.getByRole("button",{name:"Adicionar produto"}));
  expect(screen.getByLabelText("Preço de compra (MZN)")).toBeTruthy();
  expect(screen.getByLabelText("Preço de venda (MZN)")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Nome do produto"),{target:{value:"Caderno 100 folhas"}});
  fireEvent.change(screen.getByLabelText("Código / SKU"),{target:{value:"PAP-908"}});
  fireEvent.change(screen.getByLabelText("Preço de compra (MZN)"),{target:{value:"100"}});
  fireEvent.change(screen.getByLabelText("Preço de venda (MZN)"),{target:{value:"125"}});
  fireEvent.change(screen.getByLabelText("Stock inicial"),{target:{value:"5"}});
  expect(screen.getByText("Diferença bruta por un.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/Guardar produto/i}));
  await waitFor(()=>{
   const record=safeStore(JSON.parse(window.localStorage.getItem("ubuntu-pos360-demo-v1")??"{}"));
   const created=record.products.find(p=>p.sku==="PAP-908");
   expect(created?.purchasePrice).toBe(100);
   expect(created?.price).toBe(125);
   expect(created?.stock).toBe(5);
  });
  expect(screen.getByText("Caderno 100 folhas")).toBeTruthy();
 });
 it("pede compra ainda por definir ao editar produto anterior",()=>{
  window.localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(initialStore()));
  render(createElement(UbuntuApp));
  fireEvent.click(screen.getByRole("navigation",{name:"Navegação principal"}).querySelector<HTMLButtonElement>('.nav-link[title="Produtos e stock"]')!);
  fireEvent.click(screen.getAllByRole("button",{name:"Editar"})[0]!);
  const cost=screen.getByLabelText("Preço de compra (MZN)") as HTMLInputElement;
  expect(cost.value).toBe("");
  expect(screen.getByText(/produto foi registado numa versão anterior/i)).toBeTruthy();
 });
});
