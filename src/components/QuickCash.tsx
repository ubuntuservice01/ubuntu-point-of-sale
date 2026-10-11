import {useEffect,useMemo,useRef,useState} from "react";
import {Banknote,CheckCircle2,ChevronRight,Delete,Keyboard,Minus,Package,Plus,ScanBarcode,Search,ShoppingCart,Trash2,Wallet,X} from "lucide-react";
import {
 money,type CartItem,type Customer,type Payment,type Product
} from "../lib/domain";
import {canGrantCredit} from "../lib/credit";
import {quickCashChange,quickCheckoutReady,quickKeypadValue,quickQuantityCheck,type KeypadMode} from "../lib/quick-cash";
import {findProductByScan} from "../lib/barcodes";

export type QuickCashProps={
 products:Product[];cart:CartItem[];payment:Payment;customers:Customer[];
 customerId:string;creditDueDate:string;total:number;cashOpen:boolean;disabled:boolean;
 reserved:(id:string)=>number;controlledByLot:(id:string)=>boolean;
 onAdd:(product:Product)=>boolean;onScan:(code:string)=>boolean;onCamera:()=>void;
 onQtyDelta:(id:string,delta:number)=>void;onQtyExact:(id:string,quantity:number)=>void;
 onRemove:(id:string)=>void;onClear:()=>void;onPayment:(method:Payment)=>void;
 onCustomer:(id:string)=>void;onDueDate:(date:string)=>void;
 onCheckout:()=>void;onOpenCash:()=>void;onNewCustomer:()=>void;
};
const paymentName:Record<Payment,string>={
 dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão",fiado:"Fiado"
};
const payments:Payment[]=["dinheiro","mpesa","emola","cartao","fiado"];
const keyLabels=["7","8","9","4","5","6","1","2","3","C","0","⌫"] as const;
function isFormTarget(target:EventTarget|null){
 return target instanceof HTMLElement&&Boolean(target.closest("input,textarea,select,[contenteditable], [role='textbox']"));
}
export function QuickCash(props:QuickCashProps){
 const {
  products,cart,payment,customers,customerId,creditDueDate,total,cashOpen,disabled,
  reserved,controlledByLot,onAdd,onScan,onCamera,onQtyDelta,onQtyExact,onRemove,
  onClear,onPayment,onCustomer,onDueDate,onCheckout,onOpenCash,onNewCustomer
 }=props;
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Todos");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [mode,setMode]=useState<KeypadMode>("qty");
 const [qtyEntry,setQtyEntry]=useState("");
 const [cashEntry,setCashEntry]=useState("");
 const [showAll,setShowAll]=useState(false);
 const searchRef=useRef<HTMLInputElement>(null);
 const cartRef=useRef<HTMLDivElement>(null);
 const selected=selectedId?cart.find(item=>item.productId===selectedId):undefined;
 const selectedProduct=products.find(p=>p.id===selectedId);
 const selectedFree=selectedProduct?Math.max(0,selectedProduct.stock-reserved(selectedProduct.id)):0;
 const categories=["Todos",...Array.from(new Set(products.filter(p=>p.active).map(p=>p.category)))];
 const filtered=useMemo(()=>products.filter(p=>p.active&&
  (category==="Todos"||p.category===category)&&
  (p.name+" "+p.sku+" "+(p.barcode??"")).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt"))),
  [products,query,category]);
 const visible=showAll||query.trim()?filtered:filtered.slice(0,30);
 const change=quickCashChange(cashEntry,total);
 const creditAllowed=canGrantCredit(customers.find(c=>c.id===customerId),total);
 const state=quickCheckoutReady({cart,payment,customerId,creditAllowed,cashSessionOpen:cashOpen,cashEntry,total});
 const quantity=quickQuantityCheck(qtyEntry,selectedProduct,selectedFree);
 const select=(id:string)=>{setSelectedId(id);setMode("qty");setQtyEntry("")};
 const add=(product:Product)=>{
  if(disabled)return;
  if(onAdd(product)){select(product.id)}
 };
 const scan=()=>{
  if(!query.trim())return;
  const exactProduct=findProductByScan(products,query.trim());
  if(exactProduct){
   const accepted=onScan(query.trim());
   if(accepted){setQuery("");setCategory("Todos");setShowAll(false)}
  }else if(filtered.length===1){
   add(filtered[0]!);setQuery("");setCategory("Todos");setShowAll(false);
  }
 };
 const press=(key:string)=>{
  if(disabled)return;
  if(mode==="qty")setQtyEntry(value=>quickKeypadValue(value,key,"qty"));
  else setCashEntry(value=>quickKeypadValue(value,key,"cash"));
 };
 const applyQty=()=>{
  if(!selected||!quantity.valid||disabled)return;
  onQtyExact(selected.productId,quantity.qty);setQtyEntry("");
 };
 const confirmSale=()=>{
  if(!disabled&&state.ready)onCheckout();
 };
 useEffect(()=>{
  if(!cart.some(i=>i.productId===selectedId)){setSelectedId(null);setQtyEntry("")}
  if(cart.length===0){setCashEntry("");setQtyEntry("");setSelectedId(null);setMode("qty")}
 },[cart,selectedId]);
 useEffect(()=>{
  const keys=(e:KeyboardEvent)=>{
   if(disabled||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.repeat)return;
   if(e.key==="F2"){e.preventDefault();searchRef.current?.focus();searchRef.current?.select();return}
   if(e.key==="F4"){e.preventDefault();confirmSale();return}
   if(e.key==="F8"&&!isFormTarget(e.target)){e.preventDefault();if(cart.length)onClear();return}
   if(e.key==="/"&&!isFormTarget(e.target)){e.preventDefault();searchRef.current?.focus();return}
   if(isFormTarget(e.target))return;
   if(e.key==="Escape"){e.preventDefault();setQtyEntry("");setCashEntry("");return}
   // Numerais físicos são aceites apenas com a área do teclado numérico focada.
  };
  window.addEventListener("keydown",keys);
  return()=>window.removeEventListener("keydown",keys);
 },[disabled,state.ready,cart.length,onCheckout,onClear]);
 const methodChange=(value:Payment)=>{
  onPayment(value);
  if(value==="dinheiro")setMode("cash");
  else setMode("qty");
 };
 return <section className="qc-root" aria-label="Modo Caixa Rápido">
  <div className="qc-intro">
   <div><span className="qc-kicker"><Keyboard size={15}/> BALCÃO · MODO OPERADOR</span>
    <h2>Caixa rápido</h2><p>Artigos e quantidades à esquerda, cobrança à direita. As operações continuam a ser demonstrativas.</p></div>
   <div className="qc-shortcuts" aria-label="Atalhos do caixa"><span><kbd>F2</kbd> Procurar</span><span><kbd>F4</kbd> Registar</span><span><kbd>F8</kbd> Limpar</span></div>
  </div>
  <div className="qc-main-grid">
   <section className="qc-products" aria-label="Catálogo de venda rápida">
    <div className="qc-section-head"><h3><Package size={19}/> Produtos</h3><span>{filtered.length} encontrado(s)</span></div>
    <div className="qc-search-line">
     <label className="qc-search"><Search size={20}/><input ref={searchRef} aria-label="Pesquisar código ou produto no caixa rápido" value={query}
      onChange={e=>setQuery(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scan()}}}
      placeholder="Código de barras, SKU ou nome…"/></label>
     <button className="qc-scan-btn" type="button" onClick={onCamera} disabled={disabled} aria-label="Ler código pela câmara no caixa rápido"><ScanBarcode size={21}/><span>Câmara</span></button>
    </div>
    <div className="qc-category-list" role="group" aria-label="Categorias do caixa rápido">
     {categories.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);setShowAll(false)}}>{c}</button>)}
    </div>
    <div className="qc-product-grid">
     {visible.map(p=>{
      const free=Math.max(0,p.stock-reserved(p.id));
      const unavailable=free<=0||controlledByLot(p.id);
      return <button key={p.id} type="button" className="qc-product"
       onClick={()=>add(p)} disabled={unavailable||disabled} aria-label={"Adicionar "+p.name}>
       <span className="qc-product-icon"><Package size={23}/></span>
       <strong>{p.name}</strong><small>{p.sku} · {p.unit}</small>
       <span className="qc-product-footer"><b>{money(p.price)}</b><span>{unavailable?"Indisponível":free+" livres"}</span></span>
       <span className="qc-add-icon"><Plus size={19}/></span>
      </button>
     })}
    </div>
    {visible.length===0&&<div className="qc-no-products">Nenhum artigo encontrado. Experimente outro código, nome ou categoria.</div>}
    {!showAll&&!query.trim()&&filtered.length>30&&<button className="qc-more-products" type="button" onClick={()=>setShowAll(true)}>Mostrar os restantes {filtered.length-30} produtos <ChevronRight size={17}/></button>}
   </section>
   <section className="qc-sale" aria-label="Carrinho e pagamento rápido" ref={cartRef}>
    <div className="qc-section-head"><h3><ShoppingCart size={19}/> Venda actual</h3><span>{cart.reduce((sum,i)=>sum+i.qty,0)} artigos</span></div>
    <div className="qc-cart">
     {cart.length===0?<div className="qc-empty"><ShoppingCart size={28}/><p>Adicione um artigo para começar.</p></div>:
      cart.map(item=><div key={item.productId} className={"qc-line "+(selectedId===item.productId?"is-selected":"")}>
       <button type="button" className="qc-line-info" onClick={()=>select(item.productId)} aria-pressed={selectedId===item.productId} aria-label={"Seleccionar "+item.name+" para alterar quantidade"}>
        <strong>{item.name}</strong><span>{money(item.price)} × {item.qty} <b>{money(item.price*item.qty)}</b></span>
       </button>
       <div className="qc-line-actions"><button type="button" aria-label={"Diminuir "+item.name} onClick={()=>onQtyDelta(item.productId,-1)} disabled={disabled}><Minus size={17}/></button>
        <button type="button" className="qc-line-qty" onClick={()=>select(item.productId)} aria-label={"Quantidade de "+item.name+": "+item.qty}>{item.qty}</button>
        <button type="button" aria-label={"Aumentar "+item.name} onClick={()=>onQtyDelta(item.productId,1)} disabled={disabled}><Plus size={17}/></button>
        <button type="button" className="qc-remove" aria-label={"Retirar "+item.name} onClick={()=>onRemove(item.productId)} disabled={disabled}><X size={17}/></button>
       </div>
      </div>)}
    </div>
    <div className="qc-cart-total"><span>TOTAL</span><strong>{money(total)}</strong></div>
    <div className="qc-payment-methods" role="group" aria-label="Formas de pagamento do caixa rápido">
     {payments.map(method=><button key={method} type="button" aria-pressed={payment===method} onClick={()=>methodChange(method)} disabled={disabled}>
      {method==="dinheiro"?<Banknote size={18}/>:method==="fiado"?<Wallet size={18}/>:<CheckCircle2 size={18}/>}
      <span>{paymentName[method]}</span>
     </button>)}
    </div>
    <div className="qc-customer">
     <label htmlFor="qc-customer">Cliente {payment==="fiado"?"(obrigatório)":"(opcional)"}</label>
     <div className="qc-customer-row"><select id="qc-customer" value={customerId} onChange={e=>onCustomer(e.target.value)} disabled={disabled}>
       <option value="">Sem cliente seleccionado</option>
       {customers.map(c=><option value={c.id} key={c.id}>{c.name} · {money(c.debt)} em dívida</option>)}
      </select><button type="button" className="qc-new-customer" onClick={onNewCustomer} title="Registar cliente" aria-label="Registar cliente no caixa rápido" disabled={disabled}><Plus size={20}/></button></div>
     {payment==="fiado"&&<><label htmlFor="qc-due">Vencimento do fiado (opcional)</label><input id="qc-due" type="date" value={creditDueDate} min={(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")})()} onChange={e=>onDueDate(e.target.value)} disabled={disabled}/></>}
    </div>
    <div className="qc-keypad-header"><strong>Teclado numérico</strong><div className="qc-keypad-tabs" role="group" aria-label="Função do teclado numérico">
     <button type="button" aria-pressed={mode==="qty"} onClick={()=>setMode("qty")}>Quantidade</button>
     <button type="button" aria-pressed={mode==="cash"} onClick={()=>setMode("cash")}>Valor recebido</button>
    </div></div>
    <div className="qc-keypad-area">
     <div className="qc-keypad-input">
      <small>{mode==="qty"?(selected?selected.name:"Seleccione um artigo do carrinho"):"Montante entregue pelo cliente"}</small>
      <strong data-testid="quick-keypad-display">{mode==="qty"?(qtyEntry||String(selected?.qty??"—")):(cashEntry?money(Number(cashEntry)):"0,00 MT")}</strong>
      {mode==="qty"&&<small>{selectedProduct?"Disponível: "+selectedFree+" "+selectedProduct.unit:"Toque na quantidade para editar"}</small>}
      {mode==="cash"&&payment!=="dinheiro"&&<small>O troco aplica-se apenas a pagamentos em dinheiro.</small>}
     </div>
     <div className="qc-keypad" role="group" aria-label="Teclado numérico grande">
      {keyLabels.map(key=><button type="button" key={key} onClick={()=>press(key)} disabled={disabled||mode==="qty"&&!selected} aria-label={key==="⌫"?"Apagar último dígito":key==="C"?"Limpar entrada":key}>{key==="⌫"?<Delete size={23}/>:key}</button>)}
      <button type="button" className="qc-keypad-comma" onClick={()=>press(".")} disabled={disabled||mode==="qty"&&!selected} aria-label="Vírgula decimal">,</button>
      {mode==="qty"?<button type="button" className="qc-keypad-apply" onClick={applyQty} disabled={disabled||!quantity.valid}>Aplicar quantidade</button>:
       <button type="button" className="qc-keypad-apply" onClick={()=>setCashEntry(String(total))} disabled={disabled||total<=0}>Valor exacto</button>}
     </div>
    </div>
    {mode==="qty"&&qtyEntry&&!quantity.valid&&<p role="alert" className="qc-validation">{quantity.reason}</p>}
    {payment==="dinheiro"&&<div className="qc-change" aria-live="polite"><span>Troco previsto</span><strong>{change.valid?money(change.change):"—"}</strong></div>}
    {payment==="dinheiro"&&!cashOpen&&<div className="qc-hint" role="status"><Wallet size={17}/> Abra o caixa antes de receber dinheiro. <button type="button" onClick={onOpenCash}>Abrir caixa <ChevronRight size={14}/></button></div>}
    {!state.ready&&state.reason&&<p className="qc-validation" role="status">{state.reason}</p>}
    <button type="button" className="qc-confirm" disabled={disabled||!state.ready} onClick={confirmSale} title="F4">
     <CheckCircle2 size={22}/> Registar venda · {money(total)}
    </button>
    <div className="qc-last-row"><button type="button" className="qc-clear" onClick={onClear} disabled={disabled||!cart.length}><Trash2 size={18}/> Limpar venda (F8)</button>
     <span>Não processa cobranças reais.</span></div>
   </section>
  </div>
  {cart.length>0&&<button className="qc-mobile-goto-sale" type="button" onClick={()=>cartRef.current?.scrollIntoView({behavior:"smooth",block:"start"})}><ShoppingCart size={20}/> Ver venda · {money(total)} <ChevronRight size={18}/></button>}
 </section>;
}
