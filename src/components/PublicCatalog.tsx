import {useEffect,useMemo,useState,type FormEvent} from "react";
import {Link} from "@tanstack/react-router";
import {ArrowLeft,ArrowRight,CheckCircle2,ClipboardList,Info,MapPin,Minus,Package,Plus,Search,ShoppingBag,ShoppingCart,Store,Truck,Wallet,X} from "lucide-react";
import {initialStore,safeStore,money,type Store as StoreData,type Product,type Payment} from "../lib/domain";
import {storeKey,listedProducts,getCatalogListing,catalogStockFree,submitOnlineOrder} from "../lib/online";

type CartLine={productId:string;qty:number};
type CashMethod=Exclude<Payment,"fiado">;
const methods:CashMethod[]=["dinheiro","mpesa","emola","cartao"];
const methodLabels:Record<CashMethod,string>={dinheiro:"Dinheiro (na recepção)",mpesa:"M-Pesa (preferência)",emola:"e-Mola (preferência)",cartao:"Cartão (preferência)"};
function productIcon(name:string,category:string){
 const value=(name+" "+category).toLowerCase();
 if(/água|sumo|bebida|leite/.test(value))return "🥤";
 if(/pão|bolacha|farinha|açúcar/.test(value))return "🥖";
 if(/arroz|óleo|mercearia/.test(value))return "🛒";
 if(/higiene|sabão|papel/.test(value))return "🧼";
 return "📦";
}
export function PublicCatalog(){
 const [store,setStore]=useState<StoreData>(()=>initialStore());
 const [loaded,setLoaded]=useState(false);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Todos");
 const [cart,setCart]=useState<CartLine[]>([]);
 const [cartOpen,setCartOpen]=useState(false);
 const [checkout,setCheckout]=useState(false);
 const [name,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [address,setAddress]=useState("");
 const [note,setNote]=useState("");
 const [fulfilment,setFulfilment]=useState<"entrega"|"levantamento">("levantamento");
 const [method,setMethod]=useState<CashMethod>("dinheiro");
 const [error,setError]=useState("");
 const [placed,setPlaced]=useState<string|null>(null);
 const [sending,setSending]=useState(false);
 useEffect(()=>{
  const read=()=>{try{const s=window.localStorage.getItem(storeKey);setStore(s?safeStore(JSON.parse(s)):initialStore())}catch{setStore(initialStore())}};
  read();setLoaded(true);
  window.addEventListener("storage",read);
  return()=>window.removeEventListener("storage",read);
 },[]);
 const catalog=store.catalogSettings;
 const products=listedProducts(store);
 const filtered=useMemo(()=>products.filter(p=>(category==="Todos"||p.category===category)&&(p.name+" "+p.sku).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt"))).sort((a,b)=>Number(getCatalogListing(store,b.id).featured)-Number(getCatalogListing(store,a.id).featured)||a.name.localeCompare(b.name,"pt")),[products,query,category,store]);
 const categories=["Todos",...Array.from(new Set(products.map(p=>p.category)))];
 const cartLines=cart.map(line=>({line,product:products.find(p=>p.id===line.productId)})).filter((v):v is {line:CartLine;product:Product}=>!!v.product);
 const subtotal=cartLines.reduce((sum,{line,product})=>sum+line.qty*product.price,0);
 const deliveryFee=fulfilment==="entrega"?catalog.deliveryFee:0;
 const total=subtotal+deliveryFee;
 const cartCount=cart.reduce((n,l)=>n+l.qty,0);
 const featuredCount=products.filter(p=>getCatalogListing(store,p.id).featured).length;
 const add=(p:Product)=>{
  const free=catalogStockFree(store,p.id),existing=cart.find(i=>i.productId===p.id)?.qty??0;
  if(existing>=free){setError("Não existem mais unidades disponíveis deste produto.");return}
  setCart(old=>old.some(i=>i.productId===p.id)?old.map(i=>i.productId===p.id?{...i,qty:i.qty+1}:i):[...old,{productId:p.id,qty:1}]);setError("");setPlaced(null);
 };
 const adjust=(id:string,amount:number)=>{
  const free=catalogStockFree(store,id);
  setCart(old=>old.map(i=>i.productId===id?{...i,qty:Math.max(0,Math.min(free,i.qty+amount))}:i).filter(i=>i.qty>0));setError("");
 };
 const openCheckout=()=>{
  if(!cartLines.length){setError("Adicione produtos ao carrinho.");return}
  if(subtotal<catalog.minimumOrder){setError("O mínimo de encomenda é "+money(catalog.minimumOrder)+".");return}
  if(!catalog.pickupEnabled&&catalog.deliveryEnabled)setFulfilment("entrega");
  else if(catalog.pickupEnabled&&!catalog.deliveryEnabled)setFulfilment("levantamento");
  setCheckout(true);setError("");
 };
 const saveOrder=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(sending)return;setSending(true);setError("");
  try{
   // Reler o estado mais recente para detectar alterações feitas noutra aba.
   const raw=window.localStorage.getItem(storeKey);
   const latest=raw?safeStore(JSON.parse(raw)):store;
   const next=submitOnlineOrder(latest,{name,phone,items:cartLines.map(({line})=>({...line})),fulfilment,address,method,note});
   window.localStorage.setItem(storeKey,JSON.stringify(next));
   setStore(next);setPlaced(next.onlineOrders[0]!.id);setCart([]);setCheckout(false);setCartOpen(false);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível registar a encomenda na demonstração.");}finally{setSending(false)}
 };
 if(!loaded)return <div className="pu-loading">A preparar o catálogo de demonstração…</div>;
 return <div className="pu-shell">
  <header className="pu-header"><div className="pu-header-inner"><div className="pu-brand"><span><Store size={22}/></span><div><strong>{catalog.name}</strong><small>Catálogo digital · Ubuntu POS 360</small></div></div><nav aria-label="Navegação do catálogo"><a href="#produtos">Produtos</a><button onClick={()=>{setCartOpen(true);setCheckout(false)}}><ShoppingCart size={18}/> Carrinho {cartCount>0&&<b>{cartCount}</b>}</button></nav></div></header>
  <main>
   {!catalog.enabled?<section className="pu-disabled"><Store size={45}/><h1>O catálogo está temporariamente indisponível</h1><p>O administrador desactivou a montra de demonstração. Volte mais tarde ou contacte a loja.</p><Link to="/" search={{tenant:undefined}} className="pu-outline">Regressar ao Ubuntu POS 360</Link></section>:<>
    <section className="pu-hero"><div className="pu-hero-inner"><div className="pu-hero-copy"><span className="pu-kicker">UMA NOVA FORMA DE COMPRAR</span><h1>Encontre o que precisa, sem complicações.</h1><p>{catalog.description}</p><div className="pu-hero-actions"><a href="#produtos" className="pu-primary">Explorar produtos <ArrowRight size={17}/></a><span><CheckCircle2 size={18}/> Compras de demonstração, sem pagamento real</span></div></div><div className="pu-hero-visual" aria-hidden="true"><div className="pu-visual-box"><ShoppingBag size={43}/><strong>{products.length} produtos</strong><span>À sua escolha</span></div><div className="pu-visual-small"><Truck size={25}/><span>{catalog.deliveryEnabled?"Entregas previstas":"Levantamento na loja"}</span></div></div></div></section>
    <div className="pu-content"><div className="pu-warning"><Info size={19}/><span><b>Ambiente de demonstração.</b> Este catálogo funciona apenas no mesmo navegador que o POS, não envia encomendas para servidores nem processa pagamentos. Utilize somente dados fictícios nos testes.</span></div>
     {placed&&<div role="status" className="pu-success"><CheckCircle2 size={26}/><div><strong>Encomenda simulada registada!</strong><p>Referência: <b>{placed}</b>. Pode acompanhar a sua evolução na secção «Encomendas digitais» do POS neste navegador. Não foi efectuado nenhum pagamento nem envio de mensagem.</p></div><button onClick={()=>setPlaced(null)} aria-label="Fechar confirmação"><X size={18}/></button></div>}
     {error&&!cartOpen&&<div role="alert" className="pu-error"><Info size={17}/>{error}<button aria-label="Fechar aviso" onClick={()=>setError("")}><X size={16}/></button></div>}
     <section id="produtos" className="pu-products"><div className="pu-section-heading"><div><span>ESCOLHIDOS PARA SI</span><h2>Os nossos produtos</h2><p>{products.length} artigos disponíveis para consulta e encomendas de teste{featuredCount>0?" · "+featuredCount+" em destaque":""}.</p></div><label className="pu-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar produtos..." aria-label="Pesquisar produtos"/></label></div>
      <div className="pu-categories" role="group" aria-label="Filtrar categorias">{categories.map(c=><button type="button" key={c} aria-pressed={category===c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      {filtered.length===0?<div className="pu-empty"><Package size={32}/><h3>Nenhum produto encontrado</h3><p>Altere a pesquisa ou a categoria para ver outras opções.</p></div>:
      <div className="pu-grid">{filtered.map(p=>{const free=catalogStockFree(store,p.id),featured=getCatalogListing(store,p.id).featured;return <article className="pu-product" key={p.id}><div className="pu-product-art"><span>{productIcon(p.name,p.category)}</span>{featured&&<b>Em destaque</b>}</div><div className="pu-product-detail"><small>{p.category}</small><h3>{p.name}</h3><p>Código: {p.sku} · {p.unit}</p><div className="pu-product-bottom"><strong>{money(p.price)}</strong><span className={free>0?"pu-available":"pu-unavailable"}>{free>0?free+" disponíveis":"Sem stock livre"}</span></div><button className="pu-add" onClick={()=>add(p)} disabled={free<=0}><Plus size={17}/> {free>0?"Adicionar ao carrinho":"Indisponível"}</button></div></article>})}</div>}
     </section>
     <section className="pu-benefits"><div><ShoppingBag size={24}/><b>Escolha no catálogo</b><p>Procure os produtos e confirme a quantidade.</p></div><div><ClipboardList size={24}/><b>Prepare a encomenda</b><p>Seleccione levantamento ou entrega, conforme disponível.</p></div><div><Wallet size={24}/><b>Pague só na simulação</b><p>O método escolhido é apenas informativo, sem cobrança.</p></div></section>
    </div>
   </>}
  </main>
  <footer className="pu-footer"><span>{catalog.name} · Catálogo de demonstração</span><span>Uma plataforma desenvolvida pela <b>Ubuntu Service, Lda.</b></span></footer>
  {cartOpen&&<><button className="pu-scrim" aria-label="Fechar carrinho" onClick={()=>{setCartOpen(false);setCheckout(false)}}/><aside className="pu-cart" aria-label="Carrinho de encomenda">
   <header><div><strong>{checkout?"Finalizar encomenda":"O meu carrinho"}</strong><small>{checkout?"Introduza dados fictícios para testar o fluxo":cartCount+" artigo(s) no carrinho"}</small></div><button onClick={()=>{setCartOpen(false);setCheckout(false);setError("")}} aria-label="Fechar carrinho"><X size={20}/></button></header>
   {error&&<div role="alert" className="pu-cart-error">{error}<button aria-label="Fechar aviso" onClick={()=>setError("")}><X size={15}/></button></div>}
   {!checkout?<><div className="pu-cart-items">{cartLines.length===0?<div className="pu-empty"><ShoppingCart size={29}/><h3>O carrinho está vazio</h3><p>Adicione produtos para preparar uma encomenda de demonstração.</p></div>:cartLines.map(({line,product})=><div className="pu-cart-item" key={line.productId}><span>{productIcon(product.name,product.category)}</span><div><strong>{product.name}</strong><small>{money(product.price)} / {product.unit}</small><div className="pu-quantity"><button aria-label={"Remover uma unidade de "+product.name} onClick={()=>adjust(product.id,-1)}><Minus size={15}/></button><b>{line.qty}</b><button aria-label={"Adicionar uma unidade de "+product.name} onClick={()=>adjust(product.id,1)} disabled={line.qty>=catalogStockFree(store,product.id)}><Plus size={15}/></button></div></div><strong>{money(product.price*line.qty)}</strong></div>)}</div>
    <div className="pu-cart-bottom"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>Taxa de entrega calculada no próximo passo.</small><button className="pu-primary" onClick={openCheckout} disabled={!cartLines.length}>Continuar <ArrowRight size={18}/></button></div></>:
    <form className="pu-checkout" onSubmit={saveOrder}><button type="button" className="pu-back" onClick={()=>{setCheckout(false);setError("")}}><ArrowLeft size={16}/> Voltar ao carrinho</button><div className="pu-checkout-fields">
      <label>Nome completo<input required minLength={3} maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Cliente de Teste"/></label>
      <label>Telemóvel moçambicano<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="84 123 4567"/></label>
      <div className="pu-option-label">Como pretende receber?</div>
      <div className="pu-options">{catalog.pickupEnabled&&<label><input type="radio" name="fulfilment" checked={fulfilment==="levantamento"} onChange={()=>setFulfilment("levantamento")}/> Levantamento</label>}{catalog.deliveryEnabled&&<label><input type="radio" name="fulfilment" checked={fulfilment==="entrega"} onChange={()=>setFulfilment("entrega")}/> Entrega</label>}</div>
      {fulfilment==="entrega"&&<label>Morada completa para entrega<textarea required minLength={8} maxLength={220} rows={3} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Ex.: Bairro, avenida, ponto de referência"/></label>}
      <label>Forma de pagamento preferida<select value={method} onChange={e=>setMethod(e.target.value as CashMethod)}>{methods.map(m=><option key={m} value={m}>{methodLabels[m]}</option>)}</select></label>
      <label>Observações (opcional)<textarea rows={2} maxLength={250} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex.: Entregar durante a tarde"/></label>
     </div>
     <div className="pu-totals"><div><span>Produtos</span><b>{money(subtotal)}</b></div><div><span>Taxa de entrega</span><b>{money(deliveryFee)}</b></div><div className="pu-grand"><span>Total do pedido</span><strong>{money(total)}</strong></div><small>A encomenda será registada apenas neste navegador. Nenhum dinheiro será debitado.</small></div><button className="pu-primary" disabled={sending}>{sending?"A processar...":"Registar encomenda de demonstração"} <CheckCircle2 size={17}/></button>
    </form>}
  </aside></>}
 </div>;
}
