export type Section = "dashboard" | "pos" | "products" | "customers" | "companies" | "modules" | "reports" | "finance" | "settings" | "cash" | "suppliers" | "purchases" | "inventory" | "returns" | "expenses" | "farmacia" | "restaurante" | "bar" | "talho";
export type Payment = "dinheiro" | "mpesa" | "emola" | "cartao" | "fiado";
export type Product = { id:string; name:string; sku:string; category:string; unit:string; price:number; stock:number; active:boolean };
export type Customer = { id:string; name:string; phone:string; debt:number; creditLimit?:number|null };
export type CartItem = { productId:string; name:string; price:number; qty:number };
export type Sale = { id:string; createdAt:string; items:CartItem[]; total:number; method:Payment; customerId?:string; dueDate?:string; cashSessionId?:string; source?: "pos"|"farmacia"|"restaurante"|"bar"|"talho"; sourceId?:string };
export type Company = { id:string; name:string; slug:string; sector:string; status:"activa"|"teste"|"suspensa"; modules:string[] };
export type Audit = { id:string; createdAt:string; action:string; description:string };
export type CreditMovement = { id:string; customerId:string; kind:"fiado"|"pagamento"|"abertura"|"devolucao"; amount:number; createdAt:string; saleId?:string; dueDate?:string; method?:Exclude<Payment,"fiado">; note?:string; cashSessionId?:string };
export type Supplier={id:string;name:string;phone:string;email:string;city:string;active:boolean;createdAt:string};
export type PurchaseItem={productId:string;qty:number;unitCost:number};
export type Purchase={id:string;supplierId:string;items:PurchaseItem[];total:number;createdAt:string;paymentStatus:"paga"|"por_pagar";paymentMethod?:Exclude<Payment,"fiado">;cashSessionId?:string;reference:string};
export type SupplierPayment={id:string;supplierId:string;amount:number;method:Exclude<Payment,"fiado">;createdAt:string;cashSessionId?:string;note:string};
export type StockMovement={id:string;productId:string;kind:"compra"|"entrada"|"saida"|"ajuste"|"venda"|"devolucao";change:number;createdAt:string;reference:string;note:string;balanceAfter:number};
export type ReturnItem={productId:string;qty:number;unitPrice:number};
export type ReturnRecord={id:string;saleId:string;items:ReturnItem[];total:number;createdAt:string;method:Payment|"abater_fiado";cashSessionId?:string;note:string};
export type Expense={id:string;description:string;category:string;amount:number;method:Exclude<Payment,"fiado">;createdAt:string;cashSessionId?:string;note:string};
export type CashSession={id:string;openedAt:string;openingFloat:number;status:"aberta"|"fechada";closedAt?:string;expectedClose?:number;countedClose?:number;difference?:number;note?:string};
export type CashMovement={id:string;sessionId:string;kind:"reforco"|"retirada";amount:number;createdAt:string;note:string};
export type PharmaLot={id:string;productId:string;lotNumber:string;expiryDate:string;qty:number;createdAt:string;supplierId?:string};
export type PharmaDispense={id:string;createdAt:string;saleId:string;productId:string;allocations:{lotId:string;qty:number}[];qty:number;note:string};
export type ServiceArea="restaurante"|"bar";
export type ServiceTable={id:string;area:ServiceArea;label:string;active:boolean;createdAt:string};
export type ServiceOrderItem={productId:string;qty:number;unitPrice:number};
export type ServiceOrder={id:string;area:ServiceArea;tableId:string;items:ServiceOrderItem[];state:"aberta"|"preparacao"|"pronta"|"servida"|"fechada"|"anulada";createdAt:string;updatedAt:string;saleId?:string;note:string};
export type ButcherBatch={id:string;createdAt:string;sourceProductId:string;sourceQty:number;outputs:{productId:string;qty:number}[];wasteQty:number;note:string};
export type Store={products:Product[];customers:Customer[];sales:Sale[];companies:Company[];audits:Audit[];credits:CreditMovement[];suppliers:Supplier[];purchases:Purchase[];supplierPayments:SupplierPayment[];stockMovements:StockMovement[];returns:ReturnRecord[];expenses:Expense[];cashSessions:CashSession[];cashMovements:CashMovement[];pharmaLots:PharmaLot[];pharmaDispenses:PharmaDispense[];serviceTables:ServiceTable[];serviceOrders:ServiceOrder[];butcherBatches:ButcherBatch[]};
export const SECTIONS: {id:Section;label:string}[] = [
  {id:"dashboard",label:"Visão geral"},{id:"pos",label:"Ponto de venda"},
  {id:"products",label:"Produtos e stock"},{id:"inventory",label:"Movimentos de stock"},{id:"customers",label:"Fiado e dívidas"},
  {id:"cash",label:"Caixa"},{id:"suppliers",label:"Fornecedores"},{id:"purchases",label:"Compras"},{id:"returns",label:"Devoluções"},{id:"expenses",label:"Despesas"},
  {id:"farmacia",label:"Farmácias"},{id:"restaurante",label:"Restaurantes"},{id:"bar",label:"Bares"},{id:"talho",label:"Talhos"},
  {id:"modules",label:"Módulos"},
  {id:"reports",label:"Relatórios"},{id:"finance",label:"Resumo financeiro"},{id:"settings",label:"Definições"}
];
export const MODULES = ["POS e caixa","Produtos e stock","Clientes e fiado","Farmácias","Restaurantes","Bares","Talhos","Produção","Grossistas","Catálogo online","Entregas","Fidelização","Assistente IA","Offline e sincronização","Balanças e equipamentos","Auditoria e alertas"];
export const SECTORS = ["Farmácia","Loja","Pequeno comerciante","Restaurante","Bar","Talho","Padaria","Grossista"];
export const DEMO_PRODUCTS:Product[] = [
  {id:"p1",name:"Arroz 5 kg",sku:"ALI-001",category:"Mercearia",unit:"saco",price:385,stock:28,active:true},
  {id:"p2",name:"Óleo alimentar 1 L",sku:"ALI-002",category:"Mercearia",unit:"un.",price:155,stock:36,active:true},
  {id:"p3",name:"Açúcar 1 kg",sku:"ALI-003",category:"Mercearia",unit:"kg",price:85,stock:42,active:true},
  {id:"p4",name:"Farinha de milho 5 kg",sku:"ALI-004",category:"Mercearia",unit:"saco",price:255,stock:18,active:true},
  {id:"p5",name:"Água mineral 500 ml",sku:"BEB-001",category:"Bebidas",unit:"un.",price:35,stock:75,active:true},
  {id:"p6",name:"Sumo de manga 1 L",sku:"BEB-002",category:"Bebidas",unit:"un.",price:120,stock:15,active:true},
  {id:"p7",name:"Sabão em barra",sku:"HIG-001",category:"Higiene",unit:"un.",price:55,stock:8,active:true},
  {id:"p8",name:"Papel higiénico 4 rolos",sku:"HIG-002",category:"Higiene",unit:"pacote",price:145,stock:22,active:true},
  {id:"p9",name:"Leite em pó 400 g",sku:"ALI-005",category:"Mercearia",unit:"lata",price:345,stock:6,active:true},
  {id:"p10",name:"Bolacha sortida",sku:"ALI-006",category:"Mercearia",unit:"un.",price:45,stock:41,active:true}
];
export const initialStore = ():Store => ({
  products:DEMO_PRODUCTS.map(p=>({...p})),customers:[],sales:[],companies:[],audits:[],credits:[],suppliers:[],purchases:[],supplierPayments:[],stockMovements:[],returns:[],expenses:[],cashSessions:[],cashMovements:[],pharmaLots:[],pharmaDispenses:[],serviceTables:[],serviceOrders:[],butcherBatches:[]
});
export const money=(value:number)=>new Intl.NumberFormat("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+" MZN";
export const roundMoney=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const keyId=()=>globalThis.crypto?.randomUUID?.() ?? "id-"+Math.random().toString(36).slice(2);
export function slugify(name:string){return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);}
export function safeStore(value:unknown):Store {
  if(!value || typeof value!=="object") return initialStore();
  const data=value as Partial<Store>;
  if(!Array.isArray(data.products)||!Array.isArray(data.customers)||!Array.isArray(data.sales)||!Array.isArray(data.companies)||!Array.isArray(data.audits))return initialStore();
  if(!Array.isArray(data.credits)){
    // Preservar saldos existentes em demonstrações criadas antes do livro de fiado.
    // Não inventar os movimentos de pagamento históricos.
    const opening=(data.customers as Customer[])
      .filter(c=>Number.isFinite(c.debt)&&c.debt>0)
      .map(c=>({id:"abertura-"+c.id,customerId:c.id,kind:"abertura" as const,amount:roundMoney(c.debt),createdAt:new Date().toISOString(),note:"Saldo anterior; histórico detalhado não disponível."}));
    return {...(data as Store),credits:opening,suppliers:[],purchases:[],supplierPayments:[],stockMovements:[],returns:[],expenses:[],cashSessions:[],cashMovements:[],pharmaLots:[],pharmaDispenses:[],serviceTables:[],serviceOrders:[],butcherBatches:[]};
  }
  // Compatibilidade com versões anteriores do protótipo (sem registos comerciais).
  const collections=["suppliers","purchases","supplierPayments","stockMovements","returns","expenses","cashSessions","cashMovements","pharmaLots","pharmaDispenses","serviceTables","serviceOrders","butcherBatches"] as const;
  return {...(data as Store),...Object.fromEntries(collections.map(k=>[k,Array.isArray(data[k])?data[k]:[]]))} as Store;
}
export function calcTotal(items:CartItem[]){return roundMoney(items.reduce((sum,item)=>sum+item.price*item.qty,0));}
