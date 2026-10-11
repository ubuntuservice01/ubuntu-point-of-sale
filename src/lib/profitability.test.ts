import {describe,expect,it} from "vitest";
import {initialStore,type CartItem,type Sale,type Store,type Expense,type ReturnRecord} from "./domain";
import {profitabilityCsv,profitabilityRange,profitabilityReport,snapshotSaleItems} from "./profitability";
import {registerWeightedSale,registerPharmaLot,registerPharmaDispense} from "./sectors";
import {registerSupplier,registerPurchase} from "./commercial";

const costProduct={id:"cost-1",name:"Arroz premium",sku:"ARZ-111",category:"Mercearia",unit:"un.",purchasePrice:65,price:100,stock:20,active:true} as const;
const unknownProduct={id:"unknown-1",name:"Produto antigo",sku:"ANT-222",category:"Mercearia",unit:"un.",price:110,stock:10,active:true} as const;
const at="2026-10-11T12:00:00";
const days={valid:true,from:new Date("2026-10-11T00:00:00").getTime(),to:new Date("2026-10-11T23:59:59.999").getTime(),description:"Hoje",start:"2026-10-11",end:"2026-10-11"};
const mkStore=()=>({...initialStore(),products:[{...costProduct},{...unknownProduct}]}) as Store;
const sale=(id:string,items:CartItem[],createdAt=at,extra:Partial<Sale>={}):Sale=>
 ({id,createdAt,items,total:items.reduce((n,i)=>n+i.price*i.qty,0),method:"mpesa",...extra});
const ret=(id:string,saleId:string,items:ReturnRecord["items"],createdAt=at):ReturnRecord=>
 ({id,saleId,items,total:items.reduce((n,i)=>n+i.qty*i.unitPrice,0),createdAt,method:"mpesa",note:"Devolução de teste"});

describe("Margens e custos históricos",()=>{
 it("guarda o preço de compra ao vender, não reavalia vendas depois da alteração de preço",()=>{
  let s=mkStore();
  const frozen=snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:2}]);
  expect(frozen[0]?.costAtSale).toBe(65);
  expect(frozen[0]?.categoryAtSale).toBe("Mercearia");
  s={...s,sales:[sale("v1",frozen)],products:s.products.map(p=>p.id==="cost-1"?{...p,purchasePrice:80}:p)};
  const report=profitabilityReport(s,days);
  expect(report.netSales).toBe(200);
  expect(report.estimatedCost).toBe(130);
  expect(report.margin).toBe(70);
  expect(report.marginPct).toBe(35);
 });
 it("não inventa custos para vendas antigas, mesmo quando o produto recebeu preço novo",()=>{
  const original=sale("legacy",[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]);
  const s={...mkStore(),sales:[original]};
  const report=profitabilityReport(s,days);
  expect(report.margin).toBeNull();
  expect(report.resultAfterExpenses).toBeNull();
  expect(report.missingCostLines).toBe(1);
  expect(report.unknownRevenue).toBe(100);
  expect(report.products[0]?.margin).toBeNull();
 });
 it("mostra margens parciais só para as linhas com custo e deixa o total por apurar",()=>{
  const s=mkStore();
  const items=[...snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]),
    ...snapshotSaleItems(s,[{productId:"unknown-1",name:"Produto antigo",price:110,qty:1}])];
  const result=profitabilityReport({...s,sales:[sale("mix",items)]},days);
  expect(result.netSales).toBe(210);
  expect(result.partialMargin).toBe(35);
  expect(result.margin).toBeNull();
  expect(result.knownCostLines).toBe(1);
  expect(result.missingCostLines).toBe(1);
  expect(result.categories[0]?.margin).toBeNull();
 });
 it("devoluções repõem custo e receita proporcionalmente, sem inflacionar as margens",()=>{
  const s=mkStore();
  const sale1=sale("v2",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:2}]));
  const report=profitabilityReport({...s,sales:[sale1],returns:[ret("d1","v2",[{productId:"cost-1",qty:1,unitPrice:100}])]},days);
  expect(report.netSales).toBe(100);
  expect(report.estimatedCost).toBe(65);
  expect(report.margin).toBe(35);
  expect(report.products[0]?.qty).toBe(1);
  expect(report.returnedRevenue).toBe(100);
 });
 it("devolução no período diferente da venda não se perde; pode apresentar margem negativa no período",()=>{
  const s=mkStore();
  const pastSale=sale("v3",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:2}]),"2026-10-01T13:00:00");
  const result=profitabilityReport({...s,sales:[pastSale],returns:[ret("d2","v3",[{productId:"cost-1",qty:1,unitPrice:100}])]},days);
  expect(result.netSales).toBe(-100);
  expect(result.estimatedCost).toBe(-65);
  expect(result.margin).toBe(-35);
  expect(result.marginPct).toBeNull();
 });
 it("considera despesas registadas mas não desconta compras de stock duas vezes",()=>{
  const s=mkStore();
  const paid=sale("v4",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:3}]));
  const expense:Expense={id:"e1",description:"Renda",category:"Renda",amount:15,method:"mpesa",createdAt:at,note:""};
  const result=profitabilityReport({...s,sales:[paid],expenses:[expense],purchases:[{id:"p",supplierId:"forn",items:[{productId:"cost-1",qty:8,unitCost:65}],total:520,createdAt:at,paymentStatus:"paga",reference:"COMP-1"}]},days);
  expect(result.margin).toBe(105);
  expect(result.expensesTotal).toBe(15);
  expect(result.resultAfterExpenses).toBe(90);
 });
 it("taxas de entrega ficam separadas da margem de mercadorias",()=>{
  const s=mkStore();
  const merchandise=snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:2}]);
  const sold=sale("online",merchandise,at,{total:250,deliveryFee:50,source:"online"});
  const result=profitabilityReport({...s,sales:[sold]},days);
  expect(result.netSales).toBe(200);
  expect(result.deliveryFees).toBe(50);
  expect(result.margin).toBe(70);
 });
 it("a venda a fiado é uma venda e o pagamento da dívida não volta a contar no relatório",()=>{
  const s=mkStore();
  const sold=sale("fiado",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]),at,{method:"fiado",customerId:"c"});
  const result=profitabilityReport({...s,sales:[sold],credits:[{id:"cash",customerId:"c",kind:"pagamento",method:"emola",amount:100,createdAt:at}]},days);
  expect(result.netSales).toBe(100);
  expect(result.margin).toBe(35);
 });
 it("filtros de período selecionam vendas e despesas sem vazamento de datas",()=>{
  const s=mkStore();
  const oct=sale("oct",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]));
  const sep=sale("sep",snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:3}]),"2026-09-20T12:00:00");
  const store={...s,sales:[oct,sep]};
  const current=profitabilityRange("hoje","","",new Date("2026-10-11T14:00:00"));
  expect(profitabilityReport(store,current).netSales).toBe(100);
  expect(profitabilityReport(store,profitabilityRange("todos","","")).netSales).toBe(400);
  const range=profitabilityRange("personalizado","2026-09-20","2026-09-20",new Date("2026-10-11T14:00:00"));
  expect(profitabilityReport(store,range).netSales).toBe(300);
  expect(profitabilityRange("personalizado","2026-10-11","2026-10-01").valid).toBe(false);
 });
 it("CSV conserva valores negativos numéricos e não executa fórmulas em nomes perigosos",()=>{
  const s=mkStore();
  const dangerous={...s.products[0]!,name:"=2+2"};
  const store={...s,products:[dangerous,...s.products.slice(1)]};
  const items=snapshotSaleItems(store,[{productId:"cost-1",name:"=2+2",price:100,qty:1}]);
  const csv=profitabilityCsv(profitabilityReport({...store,sales:[sale("csv",items)]},days));
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain("'=2+2");
  expect(csv).toContain("Margem bruta total estimada");
  expect(csv).toContain("35");
 });
 it("uma compra posterior actualiza preço de compra para futuras vendas, não as antigas",()=>{
  const s=mkStore();
  const before=snapshotSaleItems(s,[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]);
  const withSupplier=registerSupplier(s,{name:"Fornecedor Teste",phone:"",email:"",city:"Lichinga"});
  const afterPurchase=registerPurchase(withSupplier,withSupplier.suppliers[0]!.id,[{productId:"cost-1",qty:5,unitCost:72}],"FACT-1",false,"emola");
  const later=snapshotSaleItems(afterPurchase,[{productId:"cost-1",name:"Arroz premium",price:100,qty:1}]);
  expect(before[0]?.costAtSale).toBe(65);
  expect(later[0]?.costAtSale).toBe(72);
 });
});
