import {describe,it,expect} from "vitest";
import {initialStore,type Store} from "./domain";
import {activeCashSession,cashSessionBalance,startCashSession,finishCashSession,registerCashMovement,registerSupplier,supplierOutstanding,registerPurchase,registerSupplierPayment,registerStockAdjustment,returnableQuantity,registerReturn,registerExpense,financialSummary} from "./commercial";
const supplierInput={name:"Fornecedor Modelo",phone:"",email:"fornecedor@exemplo.invalid",city:"Lichinga"};
const withSupplier=()=>registerSupplier(initialStore(),supplierInput);
describe("Núcleo comercial demonstrativo",()=>{
 it("abre e fecha caixa calculando diferença",()=>{
  const a=startCashSession(initialStore(),1000,"Turno da manhã");
  expect(()=>startCashSession(a,200,"Outra")).toThrow("Já existe");
  const closed=finishCashSession(a,980,"Contagem");
  expect(closed.cashSessions[0]?.difference).toBe(-20);
  expect(activeCashSession(closed)).toBeUndefined();
 });
 it("regista reforços e retiradas sem saldo negativo",()=>{
  const a=startCashSession(initialStore(),100,"");
  expect(()=>registerCashMovement(a,"retirada",120,"Motivo válido")).toThrow("saldo suficiente");
  const b=registerCashMovement(a,"reforco",50,"Trocos");
  const c=registerCashMovement(b,"retirada",20,"Pagamento");
  expect(cashSessionBalance(c,c.cashSessions[0]!).expected).toBe(130);
 });
 it("recebe compra, aumenta stock e mantém dívida ao fornecedor",()=>{
  const a=withSupplier();
  const b=registerPurchase(a,a.suppliers[0]!.id,[{productId:"p1",qty:3,unitCost:100}],"COMPRA-1",false,"dinheiro");
  expect(b.products.find(p=>p.id==="p1")!.stock).toBe(31);
  expect(supplierOutstanding(b,a.suppliers[0]!.id)).toBe(300);
  expect(b.stockMovements[0]!.kind).toBe("compra");
 });
 it("abate pagamentos de fornecedor e controla caixa",()=>{
  const a=startCashSession(withSupplier(),1000,"");
  const b=registerPurchase(a,a.suppliers[0]!.id,[{productId:"p2",qty:2,unitCost:120}],"",false,"dinheiro");
  const c=registerSupplierPayment(b,b.suppliers[0]!.id,100,"dinheiro","");
  expect(supplierOutstanding(c,c.suppliers[0]!.id)).toBe(140);
  expect(cashSessionBalance(c,c.cashSessions[0]!).expected).toBe(900);
  expect(()=>registerSupplierPayment(c,c.suppliers[0]!.id,200,"dinheiro","")).toThrow("dívida");
 });
 it("não permite sair stock inexistente",()=>{
  expect(()=>registerStockAdjustment(initialStore(),"p7","saida",999,"Produto danificado")).toThrow("stock disponível");
 });
 it("devolve parcialmente sem duplicar quantidade",()=>{
  let a=startCashSession(initialStore(),1000,"");
  const sale={id:"VD-1",items:[{productId:"p1",name:"Arroz",price:385,qty:2}],total:770,method:"dinheiro" as const,createdAt:new Date().toISOString(),cashSessionId:a.cashSessions[0]!.id};
  a={...a,sales:[sale],products:a.products.map(p=>p.id==="p1"?{...p,stock:p.stock-2}:p)};
  const b=registerReturn(a,"VD-1",[{productId:"p1",qty:1}],"Produto com problema");
  expect(returnableQuantity(b,"VD-1","p1")).toBe(1);
  expect(b.products.find(p=>p.id==="p1")!.stock).toBe(27);
  expect(()=>registerReturn(b,"VD-1",[{productId:"p1",qty:2}],"Outra")).toThrow("quantidades");
  expect(cashSessionBalance(b,b.cashSessions[0]!).expected).toBe(1385);
 });
 it("recusa devolução a fiado superior à dívida restante",()=>{
  const a=initialStore();
  const s:Store={...a,sales:[{id:"VD-F",createdAt:new Date().toISOString(),items:[{productId:"p1",name:"Arroz",price:200,qty:1}],total:200,method:"fiado",customerId:"u"}],customers:[{id:"u",name:"Cliente",phone:"",debt:50}]};
  expect(()=>registerReturn(s,"VD-F",[{productId:"p1",qty:1}],"Motivo")).toThrow("saldo em dívida");
 });
 it("despesas pagas em dinheiro exigem caixa com saldo",()=>{
  expect(()=>registerExpense(initialStore(),"Transporte","Logística",100,"dinheiro","")).toThrow("Abra o caixa");
  const a=startCashSession(initialStore(),50,"");
  expect(()=>registerExpense(a,"Transporte","Logística",100,"dinheiro","")).toThrow("saldo suficiente");
 });
 it("distingue vendas, recebimentos e contas em aberto sem inventar lucro",()=>{
  const a=initialStore(),f=financialSummary(a);
  expect(f.netSales).toBe(0);expect(f.accountsReceivable).toBe(0);
  expect("profit" in f).toBe(false);
 });
});
