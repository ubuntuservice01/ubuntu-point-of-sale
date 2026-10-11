import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {MOBILE_NAV_ITEMS,MOBILE_QUICK_ACTIONS} from "../components/MobileQuickNav";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined};
});
function viewport(mobile:boolean){
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:mobile&&query==="(max-width:650px)",media:query,
  addEventListener:vi.fn(),removeEventListener:vi.fn(),
  addListener:vi.fn(),removeListener:vi.fn(),dispatchEvent:vi.fn()
 })));
}
beforeEach(()=>{window.localStorage.clear()});
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.localStorage.clear()});

describe("Navegação de telemóvel do POS",()=>{
 it("não monta a barra no desktop; mantém as secções originais",()=>{
  viewport(false);render(createElement(UbuntuApp));
  expect(screen.queryByRole("navigation",{name:"Navegação rápida móvel"})).toBeNull();
  expect(screen.getByRole("navigation",{name:"Navegação principal"})).toBeTruthy();
  expect(screen.getByRole("heading",{name:"O seu negócio, num só lugar"})).toBeTruthy();
 });
 it("mostra cinco atalhos móveis e abre os formulários reais de produto e cliente",()=>{
  viewport(true);render(createElement(UbuntuApp));
  const nav=screen.getByRole("navigation",{name:"Navegação rápida móvel"});
  expect(within(nav).getAllByRole("button")).toHaveLength(5);
  expect(MOBILE_NAV_ITEMS).toHaveLength(4);
  expect(MOBILE_QUICK_ACTIONS).toHaveLength(7);
  const more=within(nav).getByRole("button",{name:"Mais"});
  fireEvent.click(more);
  const dialog=screen.getByRole("dialog",{name:"Acções rápidas"});
  expect(within(dialog).getAllByRole("button")).toHaveLength(8);
  fireEvent.click(within(dialog).getByRole("button",{name:/Novo produto/}));
  expect(screen.queryByRole("dialog",{name:"Acções rápidas"})).toBeNull();
  expect(screen.getByRole("dialog",{name:"Adicionar produto"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Fechar janela"}));
  fireEvent.click(more);
  fireEvent.click(within(screen.getByRole("dialog",{name:"Acções rápidas"})).getByRole("button",{name:/Novo cliente/}));
  expect(screen.getByRole("dialog",{name:"Registar cliente"})).toBeTruthy();
 });
 it("permite abrir fiado e volta a mostrar o menu rápido depois de sair do menu lateral",()=>{
  viewport(true);render(createElement(UbuntuApp));
  const bottom=screen.getByRole("navigation",{name:"Navegação rápida móvel"});
  fireEvent.click(within(bottom).getByRole("button",{name:"Fiado"}));
  expect(screen.getByRole("heading",{name:"Fiado e dívidas"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Abrir menu"}));
  expect(screen.queryByRole("navigation",{name:"Navegação rápida móvel"})).toBeNull();
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação principal"}).closest("aside")!).getByRole("button",{name:"Fechar menu"}));
  expect(screen.getByRole("navigation",{name:"Navegação rápida móvel"})).toBeTruthy();
 });
 it("alterna Produtos/Carrinho sem perder artigos nem valores da venda",()=>{
  viewport(true);render(createElement(UbuntuApp));
  const bottom=screen.getByRole("navigation",{name:"Navegação rápida móvel"});
  fireEvent.click(within(bottom).getByRole("button",{name:"Vender"}));
  const tabGroup=screen.getByRole("group",{name:"Etapas da venda"});
  expect(within(tabGroup).getByRole("button",{name:"Produtos"}).getAttribute("aria-pressed")).toBe("true");
  const first=document.querySelector<HTMLButtonElement>(".product-tile:not(:disabled)");
  expect(first).toBeTruthy();
  fireEvent.click(first!);
  const showCart=screen.getByRole("button",{name:/Ver carrinho com 1 artigo, total/});
  fireEvent.click(showCart);
  expect(document.querySelector(".mobile-pos-show-cart")).toBeTruthy();
  expect(within(tabGroup).getByRole("button",{name:/Carrinho/}).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("1 itens")).toBeTruthy();
  fireEvent.click(within(tabGroup).getByRole("button",{name:"Produtos"}));
  expect(document.querySelector(".mobile-pos-show-products")).toBeTruthy();
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação rápida móvel"})).getByRole("button",{name:/^Vender/}));
  expect(document.querySelector(".mobile-pos-show-products")).toBeTruthy();
 });
 it("Escape fecha o menu rápido e devolve o foco à opção Mais",()=>{
  viewport(true);render(createElement(UbuntuApp));
  const bottom=screen.getByRole("navigation",{name:"Navegação rápida móvel"});
  const more=within(bottom).getByRole("button",{name:"Mais"});
  more.focus();fireEvent.click(more);
  expect(screen.getByRole("dialog",{name:"Acções rápidas"})).toBeTruthy();
  fireEvent.keyDown(document,{key:"Escape"});
  expect(screen.queryByRole("dialog",{name:"Acções rápidas"})).toBeNull();
  expect(document.activeElement).toBe(more);
 });
});
