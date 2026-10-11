import {describe,it,expect} from "vitest";
import {initialStore,SECTIONS,type Store,type Sale} from "./domain";
import {NAV_GROUPS,allNavigationSections,navGroupFor,dashboardRange,dashboardMetrics,dashboardSalesBars,stockAlertsList} from "./ux";

describe("Navegação visual sem perda de módulos",()=>{
 it("cobre exactamente todas as secções uma vez",()=>{
  const actual=allNavigationSections();
  expect(actual.length).toBe(SECTIONS.length);
  expect(new Set(actual).size).toBe(SECTIONS.length);
  expect(new Set(actual)).toEqual(new Set(SECTIONS.map(s=>s.id)));
  expect(NAV_GROUPS.length).toBe(5);
  expect(navGroupFor("pos")?.label).toBe("Operações");
  expect(navGroupFor("farmacia")?.label).toBe("Negócios especializados");
 });
});
describe("Resumo analítico sem números inventados",()=>{
 const date="2026-10-11T10:00:00.000Z";
 const now=new Date("2026-10-11T14:00:00");
 const sale=(id:string,total:number,method:Sale["method"],createdAt=date):Sale=>({id,total,method,createdAt,items:[{productId:"p1",name:"Arroz",qty:1,price:total}]});
 it("agrupa vendas e distingue valores pagos de fiado",()=>{
  const s:Store={...initialStore(),sales:[sale("paid",200,"mpesa"),sale("owed",150,"fiado")],
   returns:[{id:"r",saleId:"paid",items:[{productId:"p1",qty:1,unitPrice:30}],total:30,createdAt:date,method:"mpesa",note:"teste"}]};
  const x=dashboardMetrics(s,dashboardRange("hoje","","",now));
  expect(x.salesCount).toBe(2);
  expect(x.paidCount).toBe(1);
  expect(x.paidNet).toBe(170);
  expect(x.fiadoTotal).toBe(150);
  expect(x.bestProducts[0]?.total).toBe(350);
  expect(dashboardSalesBars(s,dashboardRange("hoje","","",now)).length).toBe(6);
 });
 it("filtros de datas não incluem dias fora do intervalo",()=>{
  const s:Store={...initialStore(),sales:[sale("today",10,"dinheiro"),sale("old",20,"dinheiro","2026-09-10T10:00:00.000Z")]};
  expect(dashboardMetrics(s,dashboardRange("7d","","",now)).salesCount).toBe(1);
  expect(dashboardMetrics(s,dashboardRange("30d","","",now)).salesCount).toBe(1);
  expect(dashboardMetrics(s,dashboardRange("personalizado","2026-09-10","2026-09-10",now)).salesCount).toBe(1);
  expect(dashboardRange("personalizado","2026-11-11","2026-10-11",now).valid).toBe(false);
  expect(dashboardRange("personalizado","2026-02-30","2026-03-03",now).valid).toBe(false);
 });
 it("mostra vazios quando não há registos e alertas de stock reais",()=>{
  const s=initialStore();
  expect(dashboardMetrics(s,dashboardRange("30d","","",now)).gross).toBe(0);
  expect(dashboardSalesBars(s,dashboardRange("7d","","",now))).toHaveLength(7);
  expect(stockAlertsList(s).every(p=>p.stock<=10)).toBe(true);
 });
});
