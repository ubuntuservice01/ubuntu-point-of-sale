import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {ProfitabilityReports} from "../components/ProfitabilityReports";
import {initialStore,type Store} from "../lib/domain";

afterEach(()=>cleanup());
const sample=():Store=>{
 const state=initialStore();
 const p={...state.products[0]!,purchasePrice:290};
 return {...state,products:[p,...state.products.slice(1)],
  sales:[{id:"V-EXEMPLO",createdAt:"2026-10-11T12:00:00",items:[{productId:p.id,name:p.name,price:385,qty:2,costAtSale:290,categoryAtSale:p.category}],total:770,method:"emola"}]};
};
describe("UX do relatório de rentabilidade",()=>{
 it("mostra indicadores reais, histórico e análise por produto",()=>{
  const go=vi.fn();
  render(createElement(ProfitabilityReports,{data:sample(),go}));
  expect(screen.getByRole("heading",{name:"Margens e rentabilidade"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Todo o histórico"}));
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getByText("V-EXEMPLO")).toBeTruthy();
  expect(screen.getAllByText(/Arroz 5 kg/).length).toBeGreaterThan(0);
  const expenseLabels=screen.getAllByText("Despesas registadas");
  expect(expenseLabels.length).toBeGreaterThan(0);
 });
 it("com custos históricos desconhecidos apresenta Por apurar, sem inventar margem",()=>{
  const s=sample();
  const noCost={...s,sales:s.sales.map(x=>({...x,items:x.items.map(i=>({...i,costAtSale:undefined}))}))};
  render(createElement(ProfitabilityReports,{data:noCost,go:vi.fn()}));
  fireEvent.click(screen.getByRole("button",{name:"Todo o histórico"}));
  expect(screen.getByRole("region",{name:"Custos históricos em falta"})).toBeTruthy();
  expect(screen.getAllByText("Por apurar").length).toBeGreaterThan(0);
 });
 it("filtros por produto e categoria funcionam e exportar fica indisponível com datas inválidas",()=>{
  render(createElement(ProfitabilityReports,{data:sample(),go:vi.fn()}));
  fireEvent.click(screen.getByRole("button",{name:"Todo o histórico"}));
  const query=screen.getByRole("textbox",{name:"Pesquisar rentabilidade por produto"});
  fireEvent.change(query,{target:{value:"inexistente"}});
  expect(screen.getByText("Não há produtos que correspondam aos filtros escolhidos.")).toBeTruthy();
  fireEvent.change(query,{target:{value:"Arroz"}});
  expect(screen.getAllByText(/Arroz 5 kg/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button",{name:"Datas"}));
  fireEvent.change(screen.getByLabelText("Início do período"),{target:{value:"2026-11-30"}});
  fireEvent.change(screen.getByLabelText("Fim do período"),{target:{value:"2026-10-11"}});
  expect(screen.getByRole("alert")).toBeTruthy();
  expect((screen.getByRole("button",{name:"Exportar CSV"}) as HTMLButtonElement).disabled).toBe(true);
 });
});
