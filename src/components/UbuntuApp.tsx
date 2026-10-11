import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from "react";
import {Link} from "@tanstack/react-router";
import {LayoutDashboard,ShoppingCart,Package,Users,Building2,Boxes,ChartNoAxesCombined,Settings,Menu,Search,Plus,ArrowUpRight,Wallet,AlertTriangle,CheckCircle2,ChevronRight,ChevronDown,Bell,Receipt,Trash2,Minus,Store,HandCoins,Usb,ShieldCheck,Warehouse,CalendarDays,Activity,Banknote,CreditCard,Smartphone,Info,Send,Check,X,SlidersHorizontal,Printer,ScanBarcode} from "lucide-react";
import {initialStore,safeStore,money,roundMoney,calcTotal,keyId,slugify,SECTIONS,MODULES,SECTORS,type Section,type Product,type CartItem,type Store as StoreData,type Customer,type Company,type Payment,type Sale} from "../lib/domain";
import {canGrantCredit,creditPosition} from "../lib/credit";
import {activeCashSession,saleStockMovements} from "../lib/commercial";
import {reservedQty} from "../lib/sectors";
import {SectorOperations} from "./SectorOperations";
import {ExpansionOperations} from "./ExpansionOperations";
import {DigitalCommerce} from "./DigitalCommerce";
import {awardLoyaltyForSale,awardLoyaltyForCreditPayment} from "../lib/loyalty";
import {CommercialOperations} from "./CommercialOperations";
import {grossUnitDifference,validUnitPrice} from "../lib/product-pricing";
import {useDialogFocus} from "../lib/useDialogFocus";
import {NAV_GROUPS,navGroupFor,sectionLabel,type NavGroupId} from "../lib/ux";
import {DashboardOverview} from "./DashboardOverview";
import {MobileQuickNav,type QuickActionId} from "./MobileQuickNav";
import {CameraBarcodeScanner,type CameraBarcodeScannerProps} from "./CameraBarcodeScanner";
import {barcodeCollision,findProductByScan,normalizeBarcode,validBarcode} from "../lib/barcodes";
import {prepareScanAudio,playSuccessfulScanBeep} from "../lib/scan-feedback";
import {useUsbScanner} from "../hooks/useUsbScanner";
import {CircleDollarSign,Truck,ShoppingBag,RefreshCw,ArrowLeftRight,BookOpen,HandCoins as HandCoinsIcon,Pill,ChefHat,GlassWater,Beef,Factory,PackageCheck,Gift,MapPin,Globe2} from "lucide-react";

const ICONS={dashboard:LayoutDashboard,pos:ShoppingCart,products:Package,inventory:ArrowLeftRight,customers:Users,cash:Wallet,suppliers:Truck,purchases:ShoppingBag,returns:RefreshCw,expenses:CircleDollarSign,finance:BookOpen,farmacia:Pill,restaurante:ChefHat,bar:GlassWater,talho:Beef,producao:Factory,grossistas:PackageCheck,catalogo:Globe2,"encomendas-online":ShoppingBag,entregas:MapPin,fidelizacao:Gift,companies:Building2,modules:Boxes,reports:ChartNoAxesCombined,settings:Settings};
type Notice={message:string;kind:"success"|"error"};
function shortDate(iso:string){return new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));}
function todayKey(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");}
function soldToday(s:Sale){return todayKey(new Date(s.createdAt))===todayKey();}
const paymentText:Record<Payment,string>={dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão",fiado:"Fiado"};
function IconButton({children,onClick,label,className=""}:{children:ReactNode;onClick:()=>void;label:string;className?:string}){return <button type="button" className={"icon-btn "+className} onClick={onClick} aria-label={label} title={label}>{children}</button>;}
function Empty({icon:Icon,title,description,action}:{icon:typeof Package;title:string;description:string;action?:ReactNode}){return <div className="empty-state"><span className="empty-icon"><Icon size={30}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;}
function Modal({title,children,onClose,width="normal"}:{title:string;children:ReactNode;onClose:()=>void;width?:"normal"|"large"}){
 const dialogRef=useDialogFocus<HTMLElement>(onClose);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section ref={dialogRef} tabIndex={-1} className={"modal-card "+(width==="large"?"modal-large":"")} role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><h2>{title}</h2><IconButton label="Fechar janela" onClick={onClose}><X size={19}/></IconButton></header><div className="modal-content">{children}</div></section></div>;
}
function Kpi({label,value,icon:Icon,tone,extra}:{label:string;value:string;icon:typeof Package;tone:string;extra:string}){return <article className={"kpi kpi-"+tone}><div className="kpi-heading"><span className="kpi-symbol"><Icon size={19}/></span><span className="kpi-label">{label}</span></div><strong className="kpi-value">{value}</strong><span className="kpi-extra">{extra}</span></article>;}
function DemoBadge(){return <span className="demo-pill"><span className="demo-dot"/> Ambiente de demonstração</span>;}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
function PaymentIcon({method}:{method:Payment}){const Icon=method==="dinheiro"?Banknote:method==="cartao"?CreditCard:method==="fiado"?HandCoins:Smartphone;return <Icon size={17}/>;}

export function UbuntuApp(){
 const [section,setSection]=useState<Section>("dashboard");
 const [collapsed,setCollapsed]=useState(false);
 const [openGroups,setOpenGroups]=useState<Record<NavGroupId,boolean>>(()=>Object.fromEntries(NAV_GROUPS.map(g=>[g.id,true])) as Record<NavGroupId,boolean>);
 const [headerPanel,setHeaderPanel]=useState<"search"|"alerts"|"profile"|null>(null);
 const [globalSearch,setGlobalSearch]=useState("");
 const posSearchRef=useRef<HTMLInputElement>(null);
 const globalSearchRef=useRef<HTMLInputElement>(null);
 const [compactLayout,setCompactLayout]=useState(false);
 useEffect(()=>{if(typeof window.matchMedia!=="function")return;const mq=window.matchMedia("(max-width:960px)");const check=()=>setCompactLayout(mq.matches);check();mq.addEventListener?.("change",check);return()=>mq.removeEventListener?.("change",check)},[]);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [mobilePosView,setMobilePosView]=useState<"products"|"cart">("products");
 const [scannerMode,setScannerMode]=useState<"sale"|"product"|null>(null);
 const [data,setData]=useState<StoreData>(()=>initialStore());
 const [loaded,setLoaded]=useState(false);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [modal,setModal]=useState<"product"|"customer"|"company"|"payment"|"receipt"|"credit-details"|null>(null);
 const [detailCustomerId,setDetailCustomerId]=useState<string|null>(null);
 const [editingProduct,setEditingProduct]=useState<Product|null>(null);
 const [editingCompany,setEditingCompany]=useState<Company|null>(null);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Todos");
 const [cart,setCart]=useState<CartItem[]>([]);
 const cartRef=useRef(cart);
 cartRef.current=cart;
 const [productSort,setProductSort]=useState<"nome"|"preco"|"stock">("nome");
 const [productPage,setProductPage]=useState(1);
 const [creditDueDate,setCreditDueDate]=useState("");
 const [payment,setPayment]=useState<Payment>("dinheiro");
 const [customerId,setCustomerId]=useState("");
 const [customerSearch,setCustomerSearch]=useState("");
 const [debtFilter,setDebtFilter]=useState<"todos"|"com-divida"|"vencidas"|"perto-limite">("todos");
 const [receipt,setReceipt]=useState<Sale|null>(null);
 const [companySector,setCompanySector]=useState("Loja");
 const [companySearch,setCompanySearch]=useState("");
 const [settlement,setSettlement]=useState<{id:string;amount:string;method:Exclude<Payment,"fiado">;note:string}|null>(null);
 const [productForm,setProductForm]=useState({name:"",sku:"",barcode:"",category:"Mercearia",unit:"un.",purchasePrice:"",price:"",stock:""});
 const [customerForm,setCustomerForm]=useState({name:"",phone:"",creditLimit:""});
 const [companyForm,setCompanyForm]=useState({name:"",sector:"Loja",status:"teste" as Company["status"]});
 useEffect(()=>{try{const raw=window.localStorage.getItem("ubuntu-pos360-demo-v1");if(raw)setData(safeStore(JSON.parse(raw)))}catch{ /* armazenamento indisponível */ }setLoaded(true)},[]);
 useEffect(()=>{if(!loaded)return;try{window.localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(data))}catch{/* demonstração continua na memória */}},[data,loaded]);
 useEffect(()=>{
  const receive=(event:StorageEvent)=>{
   if(event.key!=="ubuntu-pos360-demo-v1"||!event.newValue)return;
   try{setData(safeStore(JSON.parse(event.newValue)))}catch{/* ignorar armazenamento danificado */}
  };
  window.addEventListener("storage",receive);
  return()=>window.removeEventListener("storage",receive);
 },[]);
 const notify=(message:string,kind:Notice["kind"]="success")=>{setNotice({message,kind})};
 const audit=(action:string,description:string)=>({id:keyId(),createdAt:new Date().toISOString(),action,description});
 const navigate=(next:Section)=>{setSection(next);setMobileMenu(false);if(next==="pos")setMobilePosView("products");setQuery("");setProductPage(1);setCategory("Todos");setNotice(null);setHeaderPanel(null);setGlobalSearch("");const group=navGroupFor(next);if(group)setOpenGroups(prev=>({...prev,[group.id]:true}));};
 useEffect(()=>{
  const shortCut=(e:KeyboardEvent)=>{
   if(section!=="pos"||modal||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
   const target=e.target;
   const typing=target instanceof HTMLElement&&(target.matches('input,textarea,select,[contenteditable="true"]'));
   if(e.key==="/"&&!typing){e.preventDefault();posSearchRef.current?.focus()}
  };
  window.addEventListener("keydown",shortCut);
  return()=>window.removeEventListener("keydown",shortCut);
 },[section,modal]);
 const salesToday=useMemo(()=>data.sales.filter(soldToday),[data.sales]);
 const todayRevenue=useMemo(()=>roundMoney(salesToday.filter(s=>s.method!=="fiado").reduce((n,s)=>n+s.total,0)-data.returns.filter(r=>soldToday({createdAt:r.createdAt} as Sale)&&r.method!=="abater_fiado").reduce((n,r)=>n+r.total,0)),[salesToday,data.returns]);
 const debtTotal=data.customers.reduce((n,c)=>n+c.debt,0);
 const debtOverdue=roundMoney(data.customers.reduce((total,c)=>total+creditPosition(c.id,data.credits,todayKey()).overdue,0));
 const customersWithDebt=data.customers.filter(c=>c.debt>0).length;
 const detailedCustomer=data.customers.find(c=>c.id===detailCustomerId);
 const detailPosition=detailCustomerId?creditPosition(detailCustomerId,data.credits,todayKey()):null;
 const nearCreditLimit=(c:Customer)=>c.creditLimit!=null&&c.creditLimit>0&&c.debt>=c.creditLimit*0.8;
 const shownCustomers=data.customers.filter(c=>(c.name+" "+c.phone).toLocaleLowerCase("pt").includes(customerSearch.toLocaleLowerCase("pt"))&&(debtFilter==="todos"||(debtFilter==="com-divida"&&c.debt>0)||(debtFilter==="vencidas"&&creditPosition(c.id,data.credits,todayKey()).overdue>0)||(debtFilter==="perto-limite"&&nearCreditLimit(c))));
 const stockAlerts=data.products.filter(p=>p.active && p.stock<=10).length;
 const effectiveProducts=data.products.filter(p=>p.active);
 const filteredProducts=effectiveProducts.filter(p=>(category==="Todos"||p.category===category)&&(p.name+" "+p.sku+" "+(p.barcode??"")).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt")));
 const categories=["Todos",...Array.from(new Set(effectiveProducts.map(p=>p.category)))];
 const displayedProducts=effectiveProducts.filter(p=>(p.name+" "+p.sku+" "+(p.barcode??"")+" "+p.category).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt"))).sort((a,b)=>productSort==="preco"?b.price-a.price:productSort==="stock"?a.stock-b.stock:a.name.localeCompare(b.name,"pt"));
 const productPages=Math.max(1,Math.ceil(displayedProducts.length/10));
 const productsOnPage=displayedProducts.slice((Math.min(productPage,productPages)-1)*10,Math.min(productPage,productPages)*10);
 const cartTotal=calcTotal(cart);
 const cartCount=cart.reduce((n,item)=>n+item.qty,0);
 const showMobileCart=()=>{setMobilePosView("cart");document.getElementById("mobile-pos-tabbar")?.scrollIntoView?.({behavior:"smooth",block:"start"})};
 const quickAction=(action:QuickActionId)=>{
  switch(action){
   case "sale":navigate("pos");break;
   case "product":openProduct();break;
   case "customer":setCustomerForm({name:"",phone:"",creditLimit:""});setModal("customer");break;
   case "debt":navigate("customers");setDebtFilter("com-divida");break;
   case "purchase":navigate("purchases");break;
   case "cash":navigate("cash");break;
  }
 };
 function addToCart(p:Product):boolean{
  if(!p.active){notify("Este produto está desactivado.","error");return false;}
  if(data.pharmaLots.some(l=>l.productId===p.id)){
   notify("Este produto tem lotes controlados. Utilize o módulo Farmácias para respeitar as datas de validade.","error");return false;
  }
  const current=cartRef.current;
  const old=current.find(item=>item.productId===p.id);
  if((old?.qty??0)+1>p.stock-reservedQty(data,p.id)){
   notify("Quantidade superior ao stock disponível.","error");return false;
  }
  const next=old?current.map(item=>item.productId===p.id?{...item,qty:item.qty+1}:item):[...current,{productId:p.id,name:p.name,price:p.price,qty:1}];
  cartRef.current=next;
  setCart(next);
  return true;
 }
 function tryScannedSale(raw:string):ReturnType<CameraBarcodeScannerProps["onRead"]>{
  const product=findProductByScan(data.products,raw);
  if(!product)return {kind:"unknown"};
  if(!product.active)return {kind:"unavailable",message:"O produto está desactivado."};
  if(data.pharmaLots.some(l=>l.productId===product.id))
   return {kind:"unavailable",message:"Produto controlado por lotes. Use o módulo Farmácias."};
  if(product.stock-reservedQty(data,product.id)<=(cartRef.current.find(item=>item.productId===product.id)?.qty??0))
   return {kind:"unavailable",message:"O stock livre deste produto é insuficiente."};
  if(!addToCart(product))return {kind:"unavailable",message:"O produto não está disponível para venda."};
  playSuccessfulScanBeep();
  notify(product.name+" adicionado ao carrinho.");
  return {kind:"added"};
 }
 function scanSku(){
  const result=tryScannedSale(query);
  if(result.kind==="unknown"){notify("Código não encontrado. Verifique o SKU ou o código de barras.","error");return;}
  if(result.kind==="unavailable"){notify(result.message,"error");return;}
  setQuery("");
  posSearchRef.current?.focus();
 }
 const onScannerRead:CameraBarcodeScannerProps["onRead"]=(value)=>{
  if(scannerMode==="product"){
   setProductForm(form=>({...form,barcode:value}));
   playSuccessfulScanBeep();
   notify("Código de barras preenchido. Guarde o produto para associar o código.");
   return {kind:"added"};
  }
  return tryScannedSale(value);
 };
 useUsbScanner(section==="pos"&&!modal&&!scannerMode&&!mobileMenu,(value)=>{
  const result=tryScannedSale(value);
  if(result.kind==="unknown")notify("Código "+value+" não encontrado. Cadastre-o em Produtos.","error");
  else if(result.kind==="unavailable")notify(result.message,"error");
 });
 function registerBarcodeProduct(value:string){
  setScannerMode(null);
  openProduct();
  setProductForm(form=>({...form,sku:value,barcode:value}));
  notify("Preencha o nome, os preços e o stock do novo produto.");
 }
 function updateQty(id:string,delta:number){
  const product=data.products.find(p=>p.id===id);
  setCart(items=>items.map(i=>i.productId===id?{...i,qty:Math.max(0,Math.min(Math.max(0,(product?.stock??0)-reservedQty(data,id)),i.qty+delta))}:i).filter(i=>i.qty>0));
 }
 function checkout(){
  if(!cart.length){notify("Adicione produtos à venda.","error");return;}
  if(payment==="fiado"&&!customerId){notify("Seleccione o cliente para registar o fiado.","error");return;}
  if(payment==="fiado"&&!canGrantCredit(data.customers.find(c=>c.id===customerId),cartTotal)){notify("A venda ultrapassa o limite de fiado deste cliente.","error");return;}
  if(payment==="fiado"&&creditDueDate&&creditDueDate<todayKey()){notify("A data de vencimento não pode ser anterior a hoje.","error");return;}
  if(payment==="dinheiro"&&!activeCashSession(data)){notify("Abra o caixa antes de receber uma venda em dinheiro.","error");return;}
  if(cart.some(c=>!data.products.some(p=>p.id===c.productId&&p.active&&!data.pharmaLots.some(l=>l.productId===p.id)&&p.stock-reservedQty(data,p.id)>=c.qty))){notify("O stock mudou. Reveja as quantidades.","error");return;}
  const sale:Sale={id:"VD-"+Date.now().toString(36).toUpperCase()+"-"+keyId().slice(0,6).toUpperCase(),createdAt:new Date().toISOString(),items:cart.map(i=>({...i})),total:cartTotal,method:payment,...(customerId?{customerId,...(payment==="fiado"&&creditDueDate?{dueDate:creditDueDate}:{})}:{}),...(payment==="dinheiro"&&activeCashSession(data)?{cashSessionId:activeCashSession(data)!.id}:{})};
  setData(old=>awardLoyaltyForSale({...old,sales:[sale,...old.sales],stockMovements:[...saleStockMovements(old,sale),...old.stockMovements],products:old.products.map(p=>{const item=cart.find(i=>i.productId===p.id);return item?{...p,stock:p.stock-item.qty}:p}),customers:old.customers.map(c=>c.id===customerId&&payment==="fiado"?{...c,debt:roundMoney(c.debt+cartTotal)}:c),credits:payment==="fiado"?[...old.credits,{id:keyId(),customerId,kind:"fiado" as const,amount:cartTotal,createdAt:sale.createdAt,saleId:sale.id,...(creditDueDate?{dueDate:creditDueDate}:{})}]:old.credits,audits:[audit(payment==="fiado"?"Venda a fiado":"Venda simulada",sale.id+" · "+money(sale.total)+" · "+paymentText[payment]),...old.audits]},sale));
  setCart([]);setCustomerId("");setCreditDueDate("");setPayment("dinheiro");setReceipt(sale);setModal("receipt");notify("Venda registada na demonstração.");
 }
 function saveProduct(e:FormEvent<HTMLFormElement>){e.preventDefault();const name=productForm.name.trim(),sku=productForm.sku.trim().toUpperCase(),barcode=normalizeBarcode(productForm.barcode),price=Number(productForm.price),purchasePrice=Number(productForm.purchasePrice),stock=Number(productForm.stock);
  if(!name||!sku||!productForm.category.trim()||!productForm.unit.trim()||!validUnitPrice(price)||!validUnitPrice(purchasePrice)||!(["kg","L"].includes(productForm.unit)?Number.isFinite(stock)&&Math.round(stock*1000)===stock*1000:Number.isInteger(stock))||stock<0){notify("Preencha correctamente os dados do produto.","error");return;}
  if(barcode&&!validBarcode(barcode)){notify("Introduza um código de barras válido (4 a 64 caracteres sem espaços).","error");return;}
  const collision=barcodeCollision(data.products,sku,barcode,editingProduct?.id);
  if(collision){notify("O código de barras ou SKU já está associado ao produto: "+collision.name+".","error");return;}
  if(editingProduct&&stock<reservedQty(data,editingProduct.id)){notify("Não pode reduzir o stock abaixo das quantidades reservadas em comandas ou encomendas.","error");return;}
  if(editingProduct&&data.pharmaLots.some(l=>l.productId===editingProduct.id)&&editingProduct.stock!==stock){notify("O stock deste produto é controlado por lotes. Faça as movimentações na área Farmácias.","error");return;}
  const prod:Product={id:editingProduct?.id??keyId(),name,sku,...(barcode?{barcode}:{}),category:productForm.category.trim(),unit:productForm.unit.trim(),price:roundMoney(price),purchasePrice:roundMoney(purchasePrice),stock,active:true};const previousStock=editingProduct?.stock??0;const delta=stock-previousStock;
  setData(old=>({...old,products:editingProduct?old.products.map(p=>p.id===editingProduct.id?prod:p):[prod,...old.products],stockMovements:delta!==0?[{id:keyId(),productId:prod.id,kind:editingProduct?"ajuste" as const:"entrada" as const,change:delta,createdAt:new Date().toISOString(),reference:editingProduct?"PROD-EDIT":"PROD-NEW",note:"Stock inicial ou edição do catálogo",balanceAfter:stock},...old.stockMovements]:old.stockMovements,audits:[audit(editingProduct?"Produto actualizado":"Produto criado",name),...old.audits]}));setModal(null);setEditingProduct(null);setProductPage(1);setQuery("");notify(editingProduct?"Produto actualizado.":"Produto criado.");
 }
 function openProduct(p?:Product){setEditingProduct(p??null);setProductForm(p?{name:p.name,sku:p.sku,barcode:p.barcode??"",category:p.category,unit:p.unit,price:String(p.price),purchasePrice:p.purchasePrice===undefined?"":String(p.purchasePrice),stock:String(p.stock)}:{name:"",sku:"",barcode:"",category:"Mercearia",unit:"un.",purchasePrice:"",price:"",stock:""});setModal("product");}
 function disableProduct(id:string){const p=data.products.find(x=>x.id===id);if(!p)return;if(reservedQty(data,id)>0){notify("Este produto está reservado para comandas ou encomendas e não pode ser desactivado.","error");return;}if(!window.confirm("Desactivar "+p.name+"?"))return;setData(old=>({...old,products:old.products.map(x=>x.id===id?{...x,active:false}:x),audits:[audit("Produto desactivado",p.name),...old.audits]}));notify("Produto desactivado.");}
 function addCustomer(e:FormEvent<HTMLFormElement>){e.preventDefault();const name=customerForm.name.trim(),phone=customerForm.phone.trim(),limit=customerForm.creditLimit.trim()===""?null:Number(customerForm.creditLimit);if(name.length<2){notify("Introduza o nome do cliente.","error");return;}if(limit!==null&&(!Number.isFinite(limit)||limit<0)){notify("O limite de fiado deve ser zero ou um valor positivo.","error");return;}const newCustomer={id:keyId(),name,phone,debt:0,creditLimit:limit};setData(old=>({...old,customers:[newCustomer,...old.customers],audits:[audit("Cliente registado",name),...old.audits]}));setModal(null);setCustomerForm({name:"",phone:"",creditLimit:""});notify("Cliente registado.");}
 function payDebt(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!settlement)return;const customer=data.customers.find(c=>c.id===settlement.id),amount=roundMoney(Number(settlement.amount));if(!customer||!Number.isFinite(amount)||amount<=0||amount>customer.debt){notify("Introduza um valor válido até ao saldo em dívida.","error");return;}if(settlement.method==="dinheiro"&&!activeCashSession(data)){notify("Abra o caixa antes de registar um pagamento em dinheiro.","error");return;}const entry={id:keyId(),customerId:customer.id,kind:"pagamento" as const,amount,createdAt:new Date().toISOString(),method:settlement.method,note:settlement.note.trim(),...(settlement.method==="dinheiro"&&activeCashSession(data)?{cashSessionId:activeCashSession(data)!.id}:{})};setData(old=>awardLoyaltyForCreditPayment({...old,customers:old.customers.map(c=>c.id===customer.id?{...c,debt:roundMoney(c.debt-amount)}:c),credits:[...old.credits,entry],audits:[audit("Abatimento demonstrativo de fiado",customer.name+" · "+money(amount)+" · "+paymentText[entry.method]),...old.audits]},entry.id));setSettlement(null);notify("Pagamento parcial registado na demonstração.");}
 function saveCompany(e:FormEvent<HTMLFormElement>){e.preventDefault();const name=companyForm.name.trim();if(name.length<3){notify("Indique o nome da empresa.","error");return;}const slug=slugify(name);if(!slug){notify("Nome inválido para gerar identificador.","error");return;}if(data.companies.some(c=>c.slug===slug&&c.id!==editingCompany?.id)){notify("Já existe uma empresa com esse identificador.","error");return;}
  const co:Company={id:editingCompany?.id??keyId(),name,slug,sector:companyForm.sector,status:companyForm.status,modules:editingCompany?.modules??["POS e caixa","Produtos e stock"]};
  setData(old=>({...old,companies:editingCompany?old.companies.map(c=>c.id===editingCompany.id?co:c):[co,...old.companies],audits:[audit(editingCompany?"Empresa actualizada":"Empresa registada",name+" (simulação)"),...old.audits]}));setEditingCompany(null);setModal(null);notify("Empresa guardada na demonstração. Nenhum domínio foi activado.");
 }
 function openCompany(co?:Company){setEditingCompany(co??null);setCompanyForm(co?{name:co.name,sector:co.sector,status:co.status}:{name:"",sector:"Loja",status:"teste"});setModal("company");}
 function toggleCompanyModule(id:string,module:string){setData(old=>({...old,companies:old.companies.map(c=>c.id===id?{...c,modules:c.modules.includes(module)?c.modules.filter(m=>m!==module):[...c.modules,module]}:c),audits:[audit("Módulos ajustados","Alteração de demonstração · "+module),...old.audits]}));}
 const searchResults=globalSearch.trim()?SECTIONS.filter(item=>item.label.toLocaleLowerCase("pt").includes(globalSearch.trim().toLocaleLowerCase("pt"))).slice(0,7):[];
 const activeGroup=navGroupFor(section);
 const sidebarAlerts=stockAlerts+data.customers.filter(c=>creditPosition(c.id,data.credits,todayKey()).overdue>0).length;
 const menuSections=NAV_GROUPS.map(group=>({...group,items:group.sections.map(id=>({id,label:sectionLabel(id),Icon:ICONS[id]}))}));
 return <div className="ubuntu-shell">
  <aside className={"sidebar "+(collapsed?"is-collapsed ":"")+(mobileMenu?"mobile-open":"")}>
   <div className="brand"><span className="brand-mark"><Store size={22} strokeWidth={2.3}/></span>{!collapsed&&<span className="brand-type"><strong>Ubuntu <b>POS 360</b></strong><small>by Ubuntu Service</small></span>}<button className="mobile-close" aria-label="Fechar menu" onClick={()=>setMobileMenu(false)}><X size={20}/></button></div>
   <nav aria-label="Navegação principal">
    {menuSections.map(group=><div className="ux-nav-group" key={group.id} data-group={group.id}>
      {!collapsed?<button type="button" className="ux-nav-group-toggle" aria-expanded={openGroups[group.id]} onClick={()=>setOpenGroups(prev=>({...prev,[group.id]:!prev[group.id]}))}>
       <span>{group.label}</span><ChevronDown size={15} className={openGroups[group.id]?"ux-chevron-open":""}/>
      </button>:<div className="ux-nav-divider" aria-hidden="true"/>}
      {(collapsed||compactLayout||openGroups[group.id])&&<div className="ux-nav-group-items">{group.items.map(item=><button type="button" key={item.id} title={item.label} aria-current={section===item.id?"page":undefined} className={"nav-link "+(section===item.id?"selected":"")} onClick={()=>navigate(item.id)}><item.Icon size={18} strokeWidth={2}/>{!collapsed&&<span>{item.label}</span>}{item.id==="companies"&&!collapsed&&<small className="nav-counter">{data.companies.length}</small>}</button>)}</div>}
    </div>)}
   </nav>
   <div className="sidebar-foot">{!collapsed&&<button className="ux-sidebar-user" onClick={()=>navigate("settings")}><span className="ux-sidebar-avatar">US</span><span><strong>Sessão de teste</strong><small>Ver definições</small></span><ChevronRight size={15}/></button>}<button className="collapse-toggle" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?"Expandir menu":"Recolher menu"} title={collapsed?"Expandir menu":"Recolher menu"}><Menu size={19}/>{!collapsed&&"Recolher menu"}</button></div>
  </aside>
  {mobileMenu&&<button className="mobile-screen" aria-label="Fechar menu" onClick={()=>setMobileMenu(false)}/>}
  <div className="workspace"><header className="topbar ux-topbar">
   <div className="top-left"><IconButton label="Abrir menu" className="mobile-menu" onClick={()=>{setCollapsed(false);setMobileMenu(true)}}><Menu size={21}/></IconButton><span className="breadcrumbs">Ubuntu POS 360 <ChevronRight size={15}/><span className="ux-breadcrumb-group">{activeGroup?.label}</span><ChevronRight size={15}/><b>{sectionLabel(section)}</b></span></div>
   <div className="top-right ux-top-right">
    <div className={"ux-top-search "+(headerPanel==="search"?"ux-search-open":"")}><button type="button" className="ux-mobile-search-trigger" aria-label="Abrir pesquisa de secções" onClick={()=>{setHeaderPanel("search");globalSearchRef.current?.focus()}}><Search size={17}/></button><Search size={17}/><input ref={globalSearchRef} type="search" aria-label="Pesquisar secções" placeholder="Ir para uma secção…" value={globalSearch} onFocus={()=>setHeaderPanel("search")} onChange={e=>{setGlobalSearch(e.target.value);setHeaderPanel("search")}} onKeyDown={e=>{if(e.key==="Escape"){setHeaderPanel(null);setGlobalSearch("")}if(e.key==="Enter"&&searchResults.length){e.preventDefault();navigate(searchResults[0]!.id)}}}/>
     {headerPanel==="search"&&globalSearch.trim()&&<div className="ux-search-popover" role="listbox" aria-label="Resultados da pesquisa">
      {searchResults.length?searchResults.map(result=><button key={result.id} role="option" aria-selected={section===result.id} onClick={()=>navigate(result.id)}><span>{result.label}</span><small>{navGroupFor(result.id)?.label}</small></button>):<p>Não foi encontrada nenhuma secção.</p>}
     </div>}
    </div>
    <Link to="/catalogo" className="ux-header-link" title="Abrir catálogo de demonstração"><Globe2 size={17}/><span>Catálogo</span></Link>
    <div className="ux-header-popovers">
     <button type="button" className="ux-header-icon" aria-label={"Alertas ("+sidebarAlerts+")"} aria-expanded={headerPanel==="alerts"} onClick={()=>setHeaderPanel(headerPanel==="alerts"?null:"alerts")}><Bell size={19}/>{sidebarAlerts>0&&<small>{sidebarAlerts>99?"99+":sidebarAlerts}</small>}</button>
     {headerPanel==="alerts"&&<div className="ux-header-popover" role="region" aria-label="Alertas da demonstração"><h3>O que precisa de atenção</h3><button onClick={()=>navigate("products")}><Package size={18}/><span><b>{stockAlerts} produtos com stock baixo</b><small>Consultar e actualizar stock</small></span><ChevronRight size={16}/></button><button onClick={()=>{navigate("customers");setDebtFilter("vencidas")}}><HandCoins size={18}/><span><b>{money(debtOverdue)} em dívidas vencidas</b><small>Ver clientes com pagamentos em atraso</small></span><ChevronRight size={16}/></button></div>}
    </div>
    <DemoBadge/>
    <div className="ux-header-popovers">
     <button type="button" className="ux-profile-button" aria-expanded={headerPanel==="profile"} aria-label="Perfil de demonstração" title="Perfil de demonstração" onClick={()=>setHeaderPanel(headerPanel==="profile"?null:"profile")}>US</button>
     {headerPanel==="profile"&&<div className="ux-header-popover ux-profile-popover" role="region" aria-label="Perfil de demonstração"><h3>Ambiente de testes</h3><p>Não existe sessão autenticada nem permissões reais.</p><button onClick={()=>navigate("settings")}><Settings size={17}/><span>Definições</span><ChevronRight size={16}/></button><Link to="/empresa" search={{tenant:undefined}} onClick={()=>setHeaderPanel(null)}><Building2 size={17}/> Painel de empresa (demo) <ArrowUpRight size={15}/></Link></div>}
    </div>
   </div>
  </header>
  <main className="page-area">
   {notice&&<div role={notice.kind==="error"?"alert":"status"} className={"toast "+notice.kind}><span>{notice.message}</span><IconButton label="Fechar aviso" onClick={()=>setNotice(null)}><X size={16}/></IconButton></div>}
   {section==="dashboard"&&<DashboardOverview data={data} go={navigate} addProduct={()=>{navigate("products");openProduct()}} addCustomer={()=>{navigate("customers");setModal("customer")}} openOverdue={()=>{navigate("customers");setDebtFilter("vencidas")}}/>}
   {section==="pos"&&<><PageHeading title="Ponto de venda" subtitle="Escolha os produtos e registe uma venda de demonstração." kicker="VENDAS" right={<button className="status-chip" onClick={()=>navigate("cash")}><span/>{activeCashSession(data)?"Caixa aberto":"Abrir caixa"} <ChevronRight size={14}/></button>}/><div id="mobile-pos-tabbar" className="mobile-pos-switch" role="group" aria-label="Etapas da venda">
 <button type="button" aria-pressed={mobilePosView==="products"} className={mobilePosView==="products"?"active":""} onClick={()=>setMobilePosView("products")}><Package size={18}/> Produtos</button>
 <button type="button" aria-pressed={mobilePosView==="cart"} className={mobilePosView==="cart"?"active":""} onClick={()=>setMobilePosView("cart")}><ShoppingCart size={18}/> Carrinho {cartCount>0&&<span className="mobile-tab-count">{cartCount}</span>}</button>
 </div><div className={"pos-layout mobile-pos-layout "+(mobilePosView==="cart"?"mobile-pos-show-cart":"mobile-pos-show-products")}><section className="pos-catalog"><div className="pos-search"><Search size={20}/><input ref={posSearchRef} aria-label="Pesquisar produto" placeholder="Pesquisar nome ou ler código de barras…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scanSku()}}}/>{query&&<IconButton label="Limpar pesquisa" onClick={()=>setQuery("")}><X size={17}/></IconButton>}</div><div className="mobile-scan-launch"><button type="button" className="mobile-camera-button" onClick={()=>{prepareScanAudio();setScannerMode("sale")}} aria-label="Ler código de barras com a câmara"><ScanBarcode size={20}/> Ler código com a câmara</button></div><div className="ux-pos-search-hint"><span>Atalho <kbd>/</kbd> para pesquisar</span><span><kbd>Enter</kbd> adiciona SKU ou código de barras</span></div>
 <div className="desktop-usb-status" role="note"><Usb size={19}/>
 <div><strong>Leitor de códigos USB (modo teclado)</strong><span>Leia o código sem seleccionar um campo, ou utilize a pesquisa. Configure o leitor para terminar com Enter ou Tab. O bip confirma quando o artigo entra no carrinho.</span></div>
 <button type="button" className="desktop-usb-focus" onClick={()=>posSearchRef.current?.focus()}>Focar pesquisa</button></div><div className="category-chips">{categories.map(c=><button key={c} className={"category-chip "+(category===c?"chosen":"")} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{filteredProducts.map(p=><button key={p.id} className="product-tile" onClick={()=>addToCart(p)} disabled={p.stock<=reservedQty(data,p.id)||data.pharmaLots.some(l=>l.productId===p.id)}><span className="product-image"><Package size={22}/></span><b>{p.name}</b><span className="product-sku">{p.sku} · {p.unit}</span><strong className="tile-price">{money(p.price)}</strong><span className={"stock-hint "+(p.stock<=10?"stock-low":"")}>{data.pharmaLots.some(l=>l.productId===p.id)?"Usar em Farmácias":p.stock<=reservedQty(data,p.id)?"Indisponível":(p.stock-reservedQty(data,p.id))+" livres"}</span><span className="add-indicator"><Plus size={18}/></span></button>)}</div>{filteredProducts.length===0&&<Empty icon={Search} title="Nenhum produto encontrado" description="Tente outra pesquisa ou categoria."/>}</section><aside className="cart-panel"><div className="cart-heading"><span className="cart-title"><ShoppingCart size={20}/> Venda actual</span><div className="ux-cart-heading-right"><span className="cart-count">{cartCount} itens</span>{cart.length>0&&<button className="ux-clear-cart" onClick={()=>{if(window.confirm("Esvaziar a venda actual?"))setCart([])}} title="Limpar os produtos da venda"><Trash2 size={15}/> Limpar</button>}</div></div><div className="cart-items">{cart.length===0?<Empty icon={ShoppingCart} title="O carrinho está vazio" description="Seleccione produtos para iniciar uma venda."/>:cart.map(i=><div className="cart-item" key={i.productId}><div className="cart-item-info"><b>{i.name}</b><span>{money(i.price)} / un.</span></div><div className="cart-item-bottom"><div className="qty-control"><button onClick={()=>updateQty(i.productId,-1)} aria-label={"Diminuir "+i.name}><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>updateQty(i.productId,1)} aria-label={"Aumentar "+i.name}><Plus size={14}/></button></div><strong>{money(i.price*i.qty)}</strong><IconButton label={"Retirar "+i.name} onClick={()=>setCart(items=>items.filter(x=>x.productId!==i.productId))}><Trash2 size={17}/></IconButton></div></div>)}</div><div className="cart-checkout"><div className="subtotal-line"><span>Subtotal</span><b>{money(cartTotal)}</b></div><p className="tax-note">Impostos e documentos fiscais: não configurados nesta demonstração.</p><div className="total-line"><span>Total</span><strong>{money(cartTotal)}</strong></div><span className="form-label">Forma de pagamento</span><div className="payment-methods">{(["dinheiro","mpesa","emola","cartao","fiado"] as Payment[]).map(p=><button key={p} className={"payment-tile "+(payment===p?"active":"")} onClick={()=>setPayment(p)}><PaymentIcon method={p}/><span>{paymentText[p]}</span></button>)}</div><div className="credit-checkout">
  <Field label={payment==="fiado"?"Cliente para fiado":"Cliente (opcional, para acumular pontos)"}><select value={customerId} onChange={e=>setCustomerId(e.target.value)} required={payment==="fiado"}><option value="">Seleccione um cliente</option>{data.customers.map(c=><option value={c.id} key={c.id}>{c.name} · {money(c.debt)} em dívida</option>)}</select></Field>
  {payment==="fiado"&&customerId&&<div className="credit-checkout-summary">{(()=>{const c=data.customers.find(c=>c.id===customerId);return c?<><span>Em dívida: <b>{money(c.debt)}</b></span><span>Limite: <b>{c.creditLimit==null?"Sem limite definido":money(c.creditLimit)}</b></span></>:null})()}</div>}
  {payment==="fiado"&&<Field label="Vencimento (opcional)"><input type="date" min={todayKey()} value={creditDueDate} onChange={e=>setCreditDueDate(e.target.value)}/></Field>}
  {payment==="fiado"&&<p className="safe-note">Sem data de vencimento, a dívida não será classificada como vencida.</p>}
  {data.customers.length===0&&<button className="text-link inline-help" onClick={()=>setModal("customer")}>Registar cliente <Plus size={14}/></button>}
  {payment==="fiado"&&customerId&&!canGrantCredit(data.customers.find(c=>c.id===customerId),cartTotal)&&<p className="validation-warning">O fiado ultrapassa o limite de crédito definido para este cliente.</p>}
 </div>
 <button className="primary-btn checkout-btn" onClick={checkout} disabled={!cart.length||(payment==="fiado"&&(!customerId||!canGrantCredit(data.customers.find(c=>c.id===customerId),cartTotal)))}><CheckCircle2 size={19}/> Registar venda · {money(cartTotal)}</button><p className="safe-note"><Info size={15}/> Registo local para testes. Não efectua cobranças reais.</p></div></aside></div></>}
   {section==="products"&&<><PageHeading title="Produtos e stock" kicker="INVENTÁRIO" subtitle="Registe o preço de compra, o preço de venda e o stock de cada produto." right={<button className="primary-btn" onClick={()=>openProduct()}><Plus size={18}/> Adicionar produto</button>}/><section className="surface table-panel"><div className="table-tools"><div className="input-search"><Search size={18}/><input placeholder="Pesquisar produtos…" aria-label="Pesquisar produtos" value={query} onChange={e=>{setQuery(e.target.value);setProductPage(1)}}/></div><div className="ux-product-table-options"><label>Ordenar<select aria-label="Ordenar produtos" value={productSort} onChange={e=>{setProductSort(e.target.value as "nome"|"preco"|"stock");setProductPage(1)}}><option value="nome">Nome</option><option value="preco">Maior preço</option><option value="stock">Menor stock</option></select></label><div className="table-counter">{displayedProducts.length} de {effectiveProducts.length} produtos</div></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Produto</th><th>Código</th><th>Categoria</th><th>Preço de compra</th><th>Preço de venda</th><th>Diferença bruta/un.</th><th>Stock</th><th className="right">Acções</th></tr></thead><tbody>{productsOnPage.map(p=><tr key={p.id}><td><span className="table-product-icon"><Package size={18}/></span><b>{p.name}</b></td><td>{p.sku}{p.barcode&&<small className="product-barcode-display">Barras: {p.barcode}</small>}</td><td>{p.category}</td><td className="num-text">{p.purchasePrice===undefined?"Por definir":money(p.purchasePrice)}</td><td className="num-text">{money(p.price)}</td><td className="num-text">{grossUnitDifference(p)===null?"—":<span className={grossUnitDifference(p)!<0?"product-pricing-negative":"product-pricing-positive"}>{money(grossUnitDifference(p)!)}</span>}</td><td><span className={"table-state "+(p.stock<=10?"warning":"good")}>{p.stock} {p.unit}</span></td><td className="right"><button className="small-btn" onClick={()=>openProduct(p)}>Editar</button><IconButton label={"Desactivar "+p.name} onClick={()=>disableProduct(p.id)}><Trash2 size={16}/></IconButton></td></tr>)}</tbody></table></div>{displayedProducts.length>10&&<div className="ux-pagination"><span>Página {Math.min(productPage,productPages)} de {productPages}</span><button className="outline-btn" disabled={productPage<=1} onClick={()=>setProductPage(p=>Math.max(1,p-1))}>Anterior</button><button className="outline-btn" disabled={productPage>=productPages} onClick={()=>setProductPage(p=>Math.min(productPages,p+1))}>Seguinte</button></div>}{displayedProducts.length===0&&<Empty icon={Package} title="Sem produtos" description="Adicione o primeiro produto ou altere a pesquisa."/>}</section></>}
   {section==="customers"&&<>
    <PageHeading title="Fiado e dívidas" kicker="CLIENTES" subtitle="Saiba quem deve, quando deve pagar e o que já foi recebido." right={<button className="primary-btn" onClick={()=>setModal("customer")}><Plus size={18}/> Novo cliente</button>}/>
    <div className="credit-overview">
      <div className="credit-summary-card"><span>Saldo em dívida</span><strong>{money(debtTotal)}</strong><small>Valores por receber</small></div>
      <div className="credit-summary-card"><span>Dívidas vencidas</span><strong className="credit-overdue">{money(debtOverdue)}</strong><small>Com prazo ultrapassado</small></div>
      <div className="credit-summary-card"><span>Clientes com fiado</span><strong>{customersWithDebt}</strong><small>De {data.customers.length} clientes registados</small></div>
    </div>
    <section className="surface table-panel">
      <div className="table-tools credit-tools">
        <div className="input-search"><Search size={18}/><input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} aria-label="Pesquisar cliente" placeholder="Pesquisar cliente ou telefone…"/></div>
        <div className="filter-chips" role="group" aria-label="Filtrar dívidas">
          {([{id:"todos",label:"Todos"},{id:"com-divida",label:"Com dívidas"},{id:"vencidas",label:"Vencidas"},{id:"perto-limite",label:"Perto do limite"}] as const).map(f=><button key={f.id} className={debtFilter===f.id?"filter-chip active":"filter-chip"} onClick={()=>setDebtFilter(f.id)}>{f.label}</button>)}
        </div>
      </div>
      {data.customers.length===0?<Empty icon={Users} title="Ainda não há clientes" description="Registe um cliente para gerir vendas a fiado." action={<button className="primary-btn" onClick={()=>setModal("customer")}><Plus size={17}/> Registar cliente</button>}/>:shownCustomers.length===0?<Empty icon={Search} title="Nenhum cliente encontrado" description="Altere a pesquisa ou o filtro de dívidas."/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Saldo em dívida</th><th>Vencimento</th><th>Em atraso</th><th>Limite de fiado</th><th className="right">Acções</th></tr></thead><tbody>{shownCustomers.map(c=>{const pos=creditPosition(c.id,data.credits,todayKey());return <tr key={c.id}><td><span className="customer-avatar">{c.name.slice(0,2).toUpperCase()}</span><b>{c.name}</b></td><td>{c.phone||"—"}</td><td><strong className={c.debt>0?"debt-red":""}>{money(c.debt)}</strong></td>
  <td>{(()=>{const earliestOverdue=pos.items.filter(i=>i.overdue).map(i=>i.entry.dueDate).filter((d):d is string=>!!d).sort()[0];const due=earliestOverdue??pos.nextDue;return due?<span className={earliestOverdue?"overdue-date":"due-date"}>{new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(due+"T12:00:00"))}</span>:<span className="quiet-cell">Não definido</span>})()}</td>
  <td>{pos.overdue>0?<span className="table-state warning">{money(pos.overdue)}</span>:<span className="table-state good">Sem atraso</span>}</td><td>{c.creditLimit==null?<span className="quiet-cell">Não definido</span>:<span>{money(c.creditLimit)}{nearCreditLimit(c)&&<small className="credit-limit-note">Limite próximo</small>}</span>}</td><td className="right"><button className="small-btn" onClick={()=>{setDetailCustomerId(c.id);setModal("credit-details")}}>Histórico</button><button disabled={c.debt<=0} className="small-btn" onClick={()=>setSettlement({id:c.id,amount:"",method:"dinheiro",note:""})}>Receber</button></td></tr>})}</tbody></table></div>}
    </section>
    <p className="credit-disclaimer"><Info size={16}/> O fiado e os pagamentos nesta versão são exemplos guardados neste navegador. Não representam transacções reais.</p>
   </>}
   {section==="companies"&&<><PageHeading title="Empresas" kicker="ADMINISTRAÇÃO" subtitle="Simule a gestão de empresas, sectores e módulos da Ubuntu Service." right={<button className="primary-btn" onClick={()=>openCompany()}><Plus size={18}/> Registar empresa</button>}/><div className="security-notice"><ShieldCheck size={20}/><div><strong>Pré-visualização do Super Admin</strong><p>Esta secção ainda não tem autenticação nem isolamento real. Não concede acesso ou subdomínios e não deve receber dados empresariais verdadeiros.</p></div></div><div className="companies-toolbar"><div className="input-search"><Search size={18}/><input value={companySearch} onChange={e=>setCompanySearch(e.target.value)} placeholder="Pesquisar empresas…" aria-label="Pesquisar empresas"/></div><span className="helper">{data.companies.length} empresas na demonstração</span></div><div className="companies-grid">{data.companies.filter(c=>c.name.toLowerCase().includes(companySearch.toLowerCase())).map(c=><article className="surface company-card" key={c.id}><div className="company-top"><div className="company-logo">{c.name.charAt(0).toUpperCase()}</div><span className={"company-status "+c.status}>{c.status}</span></div><h3>{c.name}</h3><p>{c.sector} · {c.modules.length} módulos de demonstração</p><div className="fake-domain">{c.slug}.pos.exemplo.invalid</div><div className="module-checklist">{MODULES.slice(0,7).map(m=><label key={m}><input type="checkbox" checked={c.modules.includes(m)} onChange={()=>toggleCompanyModule(c.id,m)}/><span>{m}</span></label>)}</div><button className="outline-btn full-width" onClick={()=>openCompany(c)}>Editar empresa</button></article>)}</div>{data.companies.length>0&&data.companies.every(c=>!c.name.toLowerCase().includes(companySearch.toLowerCase()))?<section className="surface"><Empty icon={Search} title="Nenhuma empresa encontrada" description="Experimente outro nome de empresa."/></section>:null}{data.companies.length===0?<section className="surface"><Empty icon={Building2} title="Nenhuma empresa registada" description="Crie uma empresa demonstrativa para explorar a gestão multitenant." action={<button className="primary-btn" onClick={()=>openCompany()}><Plus size={17}/> Registar empresa</button>}/></section>:null}</>}
   {(["farmacia","restaurante","bar","talho"] as const).includes(section as "farmacia")&&<SectorOperations section={section as "farmacia"|"restaurante"|"bar"|"talho"} data={data} onChange={setData} notify={notify} go={navigate}/>}
   {(["producao","grossistas"] as const).includes(section as "producao")&&<ExpansionOperations section={section as "producao"|"grossistas"} data={data} onChange={setData} notify={notify} go={navigate}/>}
   {(["catalogo","encomendas-online","entregas","fidelizacao"] as const).includes(section as "catalogo")&&<DigitalCommerce section={section as "catalogo"|"encomendas-online"|"entregas"|"fidelizacao"} data={data} onChange={setData} notify={notify} go={navigate}/>}
   {section==="modules"&&<><PageHeading title="Módulos da plataforma" kicker="FUNCIONALIDADES" subtitle="Escolha os recursos adequados a cada tipo de negócio."/><div className="modules-notice"><Info size={18}/><span>Os módulos de farmácias, restaurantes, bares, talhos, produção, grossistas, catálogo online, encomendas digitais, entregas e fidelização já podem ser testados no frontend.</span></div><div className="module-grid">{MODULES.map((m,i)=>{const iClass=i%6;return <article className="surface module-card" key={m}><span className={"module-icon module-"+iClass}><Boxes size={25}/></span><h3>{m}</h3><p>{moduleDescription(m)}</p></article>})}</div></>}
   {section==="reports"&&<><ProfitabilityReports data={data} go={navigate}/><section className="surface table-panel"><div className="panel-head"><div><h2>Histórico de vendas</h2><p>Dados locais — não constituem facturação</p></div></div>{data.sales.length===0?<Empty icon={Receipt} title="Nenhuma venda registada" description="As vendas simuladas realizadas no ponto de venda aparecem aqui." action={<button className="primary-btn" onClick={()=>navigate("pos")}>Ir para o ponto de venda</button>}/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Referência</th><th>Data</th><th>Artigos</th><th>Pagamento</th><th>Total</th></tr></thead><tbody>{data.sales.map(s=><tr key={s.id}><td><b>{s.id}</b></td><td>{shortDate(s.createdAt)}</td><td>{s.items.reduce((sum,p)=>sum+p.qty,0)}</td><td>{paymentText[s.method]}</td><td className="num-text">{money(s.total)}</td></tr>)}</tbody></table></div>}</section></>}
   {(["cash","suppliers","purchases","inventory","returns","expenses","finance"] as const).includes(section as "cash")&&<CommercialOperations section={section as "cash"|"suppliers"|"purchases"|"inventory"|"returns"|"expenses"|"finance"} data={data} onChange={setData} notify={notify} go={navigate}/>}
   {section==="settings"&&<><PageHeading title="Definições" kicker="CONFIGURAÇÃO" subtitle="Consulte o idioma, a moeda e as informações desta demonstração."/><section className="surface settings-panel"><div className="settings-heading"><div className="settings-icon"><SlidersHorizontal size={24}/></div><div><h2>Ambiente de demonstração</h2><p>Os dados são guardados apenas neste navegador e não são partilhados com outras empresas.</p></div></div><div className="setting-line"><div><b>Moeda principal</b><span>Metical moçambicano</span></div><strong>MZN</strong></div><div className="setting-line"><div><b>Idioma</b><span>Português de Moçambique</span></div><strong>pt-MZ</strong></div><div className="setting-line"><div><b>Ambiente</b><span>Sem ligação ao Supabase ou pagamentos externos</span></div><span className="table-state warning">Demonstração</span></div><div className="danger-zone"><h3>Limpar dados da demonstração</h3><p>Repõe os produtos de exemplo e apaga clientes, empresas e vendas simuladas guardados neste navegador.</p><button className="danger-btn" onClick={()=>{if(window.confirm("Tem a certeza de que pretende apagar os dados desta demonstração?")){setData(initialStore());setCart([]);notify("Dados de demonstração repostos.");}}}><Trash2 size={16}/> Repor demonstração</button></div></section></>}
   <footer className="app-footer">Uma plataforma desenvolvida pela <b>Ubuntu Service, Lda.</b> <span>·</span> Criando pontes entre o físico e o digital.</footer>
  </main><MobileQuickNav section={section} cartCount={cartCount} cartTotal={cartTotal} cartVisible={mobilePosView==="cart"} drawerOpen={mobileMenu} navigate={navigate} action={quickAction} showCart={showMobileCart}/></div>
  {scannerMode&&<CameraBarcodeScanner key={scannerMode} title={scannerMode==="product"?"Ler código para o cadastro":"Ler código para vender"}
    onClose={()=>setScannerMode(null)} onRead={onScannerRead}
    {...(scannerMode==="sale"?{onRegister:registerBarcodeProduct}:{})}/>}
  {modal==="product"&&scannerMode!=="product"&&<Modal title={editingProduct?"Editar produto":"Adicionar produto"} onClose={()=>setModal(null)}><form className="form-grid" onSubmit={saveProduct}><Field label="Nome do produto"><input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Ex.: Arroz 5 kg"/></Field><Field label="Código / SKU"><input required value={productForm.sku} onChange={e=>setProductForm({...productForm,sku:e.target.value})} placeholder="Ex.: ALI-001"/></Field><Field label="Código de barras (opcional)"><input autoComplete="off" maxLength={80} value={productForm.barcode} onChange={e=>setProductForm({...productForm,barcode:e.target.value})} placeholder="EAN, UPC ou Código 128"/></Field>
 <div className="mobile-scan-launch mobile-product-scan"><button type="button" className="mobile-camera-button" onClick={()=>{prepareScanAudio();setScannerMode("product")}}><ScanBarcode size={19}/> Ler código com a câmara</button></div>
 <Field label="Categoria"><input required value={productForm.category} onChange={e=>setProductForm({...productForm,category:e.target.value})}/></Field><Field label="Unidade de venda"><select value={productForm.unit} onChange={e=>setProductForm({...productForm,unit:e.target.value})}><option>un.</option><option>kg</option><option>g</option><option>L</option><option>caixa</option><option>saco</option><option>pacote</option></select></Field><div className="product-pricing-fields">
 <Field label="Preço de compra (MZN)"><input required type="number" step="0.01" min="0.01" value={productForm.purchasePrice} onChange={e=>setProductForm({...productForm,purchasePrice:e.target.value})} placeholder="Ex.: 100.00"/></Field>
 <Field label="Preço de venda (MZN)"><input required type="number" step="0.01" min="0.01" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} placeholder="Ex.: 125.00"/></Field>
 </div>
 {validUnitPrice(Number(productForm.purchasePrice))&&validUnitPrice(Number(productForm.price))&&
 <div className={"product-pricing-preview "+(Number(productForm.price)<Number(productForm.purchasePrice)?"negative":"")} role="status">
  <span>Diferença bruta por {productForm.unit}</span>
  <strong>{money(roundMoney(Number(productForm.price)-Number(productForm.purchasePrice)))}</strong>
  <small>{Number(productForm.price)<Number(productForm.purchasePrice)?"A venda está abaixo do preço de compra. Confirme se pretende manter esse valor.":"Antes de impostos, descontos, despesas e outros custos. Não corresponde ao lucro líquido."}</small>
 </div>}
 {editingProduct?.purchasePrice===undefined&&<p className="product-price-note">Este produto foi registado numa versão anterior. Introduza o preço de compra para completar os seus dados; o sistema não inventa custos antigos.</p>}
 <Field label="Stock inicial"><input required type="number" step={["kg","L"].includes(productForm.unit)?"0.001":"1"} min="0" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})}/></Field><div className="form-actions"><button className="outline-btn" type="button" onClick={()=>setModal(null)}>Cancelar</button><button className="primary-btn" type="submit"><Check size={18}/> Guardar produto</button></div></form></Modal>}
  {modal==="customer"&&<Modal title="Registar cliente" onClose={()=>setModal(null)}><form className="form-stack" onSubmit={addCustomer}><Field label="Nome completo"><input value={customerForm.name} required onChange={e=>setCustomerForm({...customerForm,name:e.target.value})} placeholder="Nome do cliente"/></Field><Field label="Contacto (opcional)"><input type="tel" value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm,phone:e.target.value})} placeholder="84 000 0000"/></Field><Field label="Limite de fiado em MZN (opcional)"><input type="number" min="0" step="0.01" value={customerForm.creditLimit} onChange={e=>setCustomerForm({...customerForm,creditLimit:e.target.value})} placeholder="Em branco = sem limite definido"/></Field><p className="subtle-note"><Info size={16}/> Um limite de 0 MZN impede novas vendas a fiado. Deixe vazio para não definir limite.</p><div className="form-actions"><button className="outline-btn" type="button" onClick={()=>setModal(null)}>Cancelar</button><button className="primary-btn" type="submit">Registar cliente</button></div></form></Modal>}
  {modal==="company"&&<Modal title={editingCompany?"Editar empresa demonstrativa":"Registar empresa demonstrativa"} onClose={()=>setModal(null)}><form className="form-stack" onSubmit={saveCompany}><Field label="Nome da empresa"><input required value={companyForm.name} onChange={e=>setCompanyForm({...companyForm,name:e.target.value})} placeholder="Ex.: Mercado Central"/></Field><Field label="Sector de actividade"><select value={companyForm.sector} onChange={e=>setCompanyForm({...companyForm,sector:e.target.value})}>{SECTORS.map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Estado da licença"><select value={companyForm.status} onChange={e=>setCompanyForm({...companyForm,status:e.target.value as Company["status"]})}><option value="teste">Em teste</option><option value="activa">Activa (demonstração)</option><option value="suspensa">Suspensa</option></select></Field><p className="subtle-note"><Info size={16}/> O endereço apresentado será ilustrativo. Não cria domínios nem permissões de acesso.</p><div className="form-actions"><button type="button" className="outline-btn" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="primary-btn">Guardar empresa</button></div></form></Modal>}
  {settlement&&<Modal title="Registar pagamento da dívida" onClose={()=>setSettlement(null)}><form className="form-stack" onSubmit={payDebt}>
    <p className="text-muted">Cliente: <b>{data.customers.find(c=>c.id===settlement.id)?.name}</b></p>
    <div className="credit-balance-banner">Saldo por pagar <strong>{money(data.customers.find(c=>c.id===settlement.id)?.debt??0)}</strong></div>
    <Field label="Valor recebido (MZN)"><input type="number" required min="0.01" step="0.01" max={data.customers.find(c=>c.id===settlement.id)?.debt??0} value={settlement.amount} onChange={e=>setSettlement({...settlement,amount:e.target.value})}/></Field>
    <Field label="Forma de pagamento"><select value={settlement.method} onChange={e=>setSettlement({...settlement,method:e.target.value as Exclude<Payment,"fiado">})}><option value="dinheiro">Dinheiro</option><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="cartao">Cartão</option></select></Field>
    <Field label="Observação (opcional)"><input value={settlement.note} maxLength={160} onChange={e=>setSettlement({...settlement,note:e.target.value})} placeholder="Ex.: pagamento parcial"/></Field>
    <p className="subtle-note"><Info size={16}/> Demonstração: o pagamento é registado localmente e abatido ao saldo mais antigo. Não confirma recebimento real.</p>
    <div className="form-actions"><button type="button" className="outline-btn" onClick={()=>setSettlement(null)}>Cancelar</button><button type="submit" className="primary-btn">Guardar pagamento</button></div>
   </form></Modal>}
  {modal==="credit-details"&&detailedCustomer&&detailPosition&&<Modal title={"Histórico de fiado · "+detailedCustomer.name} width="large" onClose={()=>{setDetailCustomerId(null);setModal(null)}}>
    <div className="credit-detail-stats"><div><span>Saldo por pagar</span><strong>{money(detailedCustomer.debt)}</strong></div><div><span>Vencido</span><strong className="credit-overdue">{money(detailPosition.overdue)}</strong></div><div><span>Limite de fiado</span><strong>{detailedCustomer.creditLimit==null?"Não definido":money(detailedCustomer.creditLimit)}</strong></div></div>
    <div className="credit-entry-heading"><h3>Movimentos da conta</h3>{detailedCustomer.debt>0&&<button className="primary-btn" onClick={()=>{setModal(null);setDetailCustomerId(null);setSettlement({id:detailedCustomer.id,amount:"",method:"dinheiro",note:""})}}>Registar pagamento</button>}</div>
    {data.credits.filter(e=>e.customerId===detailedCustomer.id).length===0?<Empty icon={HandCoins} title="Sem movimentos de fiado" description="As compras a fiado e os pagamentos aparecem aqui."/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Data</th><th>Movimento</th><th>Referência</th><th>Vencimento</th><th>Valor</th><th>Por pagar</th></tr></thead><tbody>{data.credits.filter(e=>e.customerId===detailedCustomer.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(entry=>{const pos=detailPosition.items.find(i=>i.entry.id===entry.id);return <tr key={entry.id}><td>{shortDate(entry.createdAt)}</td><td><span className={"movement-kind "+(entry.kind==="pagamento"||entry.kind==="devolucao"?"paid":"charged")}>{entry.kind==="pagamento"?"Pagamento":entry.kind==="devolucao"?"Devolução a fiado":entry.kind==="abertura"?"Saldo anterior":"Venda a fiado"}</span></td><td className="mono-text">{entry.saleId??(entry.method?paymentText[entry.method]:"—")}</td><td>{entry.dueDate?new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(entry.dueDate+"T12:00:00")):"Não definido"}</td><td className={entry.kind==="pagamento"?"positive-amount":"num-text"}>{entry.kind==="pagamento"||entry.kind==="devolucao"?"−":"+"}{money(entry.amount)}</td><td>{pos?pos.remaining>0?<span className={"table-state "+(pos.overdue?"warning":"good")}>{money(pos.remaining)}</span>:<span className="table-state good">Liquidado</span>:"—"}</td></tr>})}</tbody></table></div>}
    <p className="credit-disclaimer"><Info size={16}/> Os pagamentos são abatidos às dívidas mais antigas. Os movimentos já registados não são eliminados.</p>
   </Modal>}
  {modal==="receipt"&&receipt&&<Modal title="Venda registada na demonstração" onClose={()=>{setModal(null);setReceipt(null)}}><div className="receipt-complete"><div className="big-check"><CheckCircle2 size={44}/></div><h3>{money(receipt.total)}</h3><p>Referência {receipt.id}</p><div className="ux-printable-receipt"><div className="ux-print-head"><strong>Ubuntu POS 360</strong><span>RESUMO DE DEMONSTRAÇÃO — NÃO FISCAL</span><small>Ubuntu Service, Lda.</small></div><div className="receipt-detail"><span>Referência</span><b>{receipt.id}</b></div><div className="receipt-detail"><span>Data</span><b>{shortDate(receipt.createdAt)}</b></div><div className="receipt-detail"><span>Forma de pagamento</span><b>{paymentText[receipt.method]}</b></div><div className="receipt-detail"><span>Itens</span><b>{receipt.items.reduce((n,i)=>n+i.qty,0)}</b></div><div className="ux-print-items">{receipt.items.map(i=><div key={i.productId}><span>{i.name} · {i.qty} × {money(i.price)}</span><b>{money(i.price*i.qty)}</b></div>)}</div><div className="receipt-detail ux-print-total"><strong>Total</strong><strong>{money(receipt.total)}</strong></div><p className="ux-print-notice">DOCUMENTO DE DEMONSTRAÇÃO. Não comprova pagamento nem substitui factura ou recibo fiscal.</p></div><div className="ux-receipt-actions"><button className="outline-btn" onClick={()=>window.print()}><Printer size={17}/> Imprimir resumo (não fiscal)</button><button className="primary-btn" onClick={()=>{setModal(null);setReceipt(null)}}>Nova venda</button></div></div></Modal>}
 </div>;
}
function PageHeading({title,kicker,subtitle,right}:{title:string;kicker:string;subtitle:string;right?:ReactNode}){return <div className="page-title-row"><div><p className="eyebrow">{kicker}</p><h1>{title}</h1><p className="text-muted">{subtitle}</p></div>{right&&<div className="heading-action">{right}</div>}</div>}
function moduleDescription(name:string){const terms:Record<string,string>={
 "POS e caixa":"Vendas rápidas, meios de pagamento e gestão de caixa.",
 "Produtos e stock":"Catálogo, inventário, movimentos e alertas.",
 "Clientes e fiado":"Contas a receber, dívidas e pagamentos parciais.",
 "Farmácias":"Lotes, validade, rastreabilidade e dispensa.",
 "Restaurantes":"Mesas, comandas e pedidos para cozinha.",
 "Bares":"Vendas por dose, mesas e controlo de consumo.",
 "Talhos":"Venda por peso, cortes de carne e perdas.",
 "Produção":"Fichas técnicas, matérias-primas e transformação.",
 "Grossistas":"Compras em volume, listas de preços e distribuição.",
 "Catálogo online":"Vitrine da loja e recepção de encomendas.",
 "Entregas":"Gestão de entregadores e estados de entrega.",
 "Fidelização":"Pontos, benefícios e campanhas.",
 "Assistente IA":"Resumos e recomendações a partir de dados autorizados.",
 "Offline e sincronização":"Operação local, fila segura e reconciliação.",
 "Balanças e equipamentos":"Integrações com periféricos compatíveis.",
 "Auditoria e alertas":"Rastreabilidade de alterações e avisos de risco."};return terms[name]??"Funcionalidade especializada do Ubuntu POS 360.";}
function SalesChart({sales}:{sales:Sale[]}){if(sales.length===0)return <div className="chart-empty"><span><ChartNoAxesCombined size={25}/></span><h3>Ainda não há vendas</h3><p>Quando registar uma venda de demonstração, poderá acompanhar a evolução aqui.</p></div>;const now=new Date();const days=Array.from({length:7},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i);const key=todayKey(d);const total=sales.filter(s=>todayKey(new Date(s.createdAt))===key).reduce((n,s)=>n+s.total,0);return {key,label:new Intl.DateTimeFormat("pt-MZ",{weekday:"short"}).format(d).replace(".",""),total};});const max=Math.max(1,...days.map(d=>d.total));return <div className="sales-chart" role="img" aria-label="Gráfico demonstrativo de vendas nos últimos sete dias">{days.map((day,i)=><div className="chart-day" key={day.key}><div className="chart-bar-wrap" title={day.label+": "+money(day.total)}><div className={"chart-bar "+(i===6?"current":"")} style={{height:(day.total===0?2:Math.max(9,(day.total/max)*100))+"%"}}/></div><span>{day.label}</span></div>)}<p className="chart-caption">Os gráficos mostram apenas vendas efectuadas nesta demonstração.</p></div>}
