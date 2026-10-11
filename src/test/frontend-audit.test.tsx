import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {SECTIONS} from "../lib/domain";
import {ADMIN_SCREENS} from "../lib/admin-demo";
import {COMPANY_PAGES} from "../lib/company-demo";
import {UbuntuApp} from "../components/UbuntuApp";
import {SuperAdminApp} from "../components/SuperAdminApp";
import {CompanyAdminApp} from "../components/CompanyAdminApp";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {
  Link:({to,search,children,...props}:{to:string;search?:unknown;children?:React.ReactNode;[key:string]:unknown})=>React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined
 };
});
beforeEach(()=>{window.localStorage.clear()});
afterEach(()=>{cleanup();window.localStorage.clear()});
describe("Auditoria de navegação e renderização",()=>{
 it("todas as secções do POS, incluindo empresas, estão acessíveis e renderizam",()=>{
  expect(SECTIONS.some(s=>s.id==="companies")).toBe(true);
  render(createElement(UbuntuApp));
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  const buttons=within(nav).getAllByRole("button");
  expect(buttons).toHaveLength(SECTIONS.length);
  for(let i=0;i<SECTIONS.length;i++){
   fireEvent.click(buttons[i]!);
   expect(buttons[i]!.getAttribute("aria-current")).toBe("page");
   expect(screen.getAllByRole("heading",{level:1}).length).toBeGreaterThan(0);
  }
 });
 it("o Super Admin apresenta todas as opções do seu menu",()=>{
  render(createElement(SuperAdminApp));
  for(const page of ADMIN_SCREENS){
   expect(document.body.textContent).toContain(page.label);
  }
 });
 it("o painel da empresa apresenta todas as páginas definidas",()=>{
  render(createElement(CompanyAdminApp));
  for(const page of COMPANY_PAGES){
   expect(document.body.textContent).toContain(page.label);
  }
 });
});
