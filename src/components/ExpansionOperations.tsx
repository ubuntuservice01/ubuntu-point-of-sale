import {useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {ArrowRight,AlertTriangle,CalendarDays,Check,ChevronRight,ClipboardList,Factory,FileText,Info,Layers,Minus,Package,Plus,Search,ShoppingBag,Store,Truck,Users,Wallet,X} from "lucide-react";
import {money,type Product,type Section,type Store as StoreData,type ProductionRecipe,type WholesaleOrder,type WholesaleTier,type Payment} from "../lib/domain";
import {
 validQuantity,qty3,lastPurchaseCost,recipeCostEstimate,freeQuantity,
 saveRecipe,toggleRecipe,produceBatch,saveWholesaleTier,toggleWholesaleTier,
 wholesaleUnitPrice,reserveWholesaleOrder,cancelWholesaleOrder,dispatchWholesaleOrder,deliverWholesaleOrder,
 type WholesaleDraft
} from "../lib/expansion";
type CommerceSector=Extract<Section,"producao"|"grossistas">;
type CashMethod=Exclude<Payment,"fiado">;
type Props={section:CommerceSector;data:StoreData;onChange:(state:StoreData)=>void;notify:(msg:string,kind?:"success"|"error")=>void;go:(section:Section)=>void};
type Dialog="recipe"|"run"|"tier"|"order"|null;
type RecipeLine={productId:string;qty:string};
type DraftOrderLine={productId:string;qty:string};
type RecipeForm={name:string;productId:string;outputQty:string;notes:string;ingredients:RecipeLine[]};
type TierForm={productId:string;minimumQty:string;unitPrice:string};
const methods:CashMethod[]=["dinheiro","mpesa","emola","cartao"];
const payLabels:Record<CashMethod,string>={dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão"};
const orderStates:Record<WholesaleOrder["state"],string>={reservada:"Reservada",expedida:"Expedida",entregue:"Entregue",cancelada:"Cancelada"};
const todayISO=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const dateTime=(v:string)=>new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
const formatQty=(qty:number)=>new Intl.NumberFormat("pt-MZ",{maximumFractionDigits:3}).format(qty);
const toNumber=(str:string)=>Number(str.replace(",","."));
function PageHeading({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:ReactNode}){
 return <header className="ex-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children&&<div className="ex-head-actions">{children}</div>}</header>;
}
function Tile({icon:Icon,label,value,description}:{icon:typeof Package;label:string;value:string;description:string}){
 return <article className="ex-metric"><div><span>{label}</span><span className="ex-metric-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{description}</small></article>;
}
function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){
 return <label className="ex-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
function Empty({icon:Icon,title,description,action}:{icon:typeof Package;title:string;description:string;action?:ReactNode}){
 return <div className="ex-empty"><span><Icon size={25}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function Modal({title,error,onClose,children,wide=false}:{title:string;error?:string|undefined;onClose:()=>void;children:ReactNode;wide?:boolean}){
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[onClose]);
 return <div className="ex-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className={"ex-modal "+(wide?"wide":"")} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button aria-label="Fechar" onClick={onClose}><X size={19}/></button></header><div className="ex-modal-body">{error&&<div className="ex-form-error" role="alert"><AlertTriangle size={18}/>{error}</div>}{children}</div></section></div>;
}
function Notice({warning=false,children}:{warning?:boolean;children:ReactNode}){
 return <div className={"ex-notice "+(warning?"warning":"")}><Info size={18}/><p>{children}</p></div>;
}
const disabledWithReason=(disabled:boolean,reason:string)=>disabled?reason:undefined;
export function ExpansionOperations({section,data,onChange,notify,go}:Props){
 const activeProducts=data.products.filter(p=>p.active&&!data.pharmaLots.some(l=>l.productId===p.id));
 const [dialog,setDialog]=useState<Dialog>(null);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [recipeEditing,setRecipeEditing]=useState<string|null>(null);
 const [recipeForm,setRecipeForm]=useState<RecipeForm>({name:"",productId:"",outputQty:"1",notes:"",ingredients:[]});
 const [runRecipeId,setRunRecipeId]=useState("");
 const [runCount,setRunCount]=useState("1");
 const [runNote,setRunNote]=useState("");
 const [tierEditing,setTierEditing]=useState<string|null>(null);
 const [tierForm,setTierForm]=useState<TierForm>({productId:"",minimumQty:"5",unitPrice:""});
 const [orderCustomer,setOrderCustomer]=useState("");
 const [orderLines,setOrderLines]=useState<DraftOrderLine[]>([]);
 const [orderTerm,setOrderTerm]=useState<"imediato"|"fiado">("imediato");
 const [orderMethod,setOrderMethod]=useState<CashMethod>("dinheiro");
 const [orderDue,setOrderDue]=useState("");
 const [orderNote,setOrderNote]=useState("");
 const [orderFilter,setOrderFilter]=useState("todos");
 const [recipeFilter,setRecipeFilter]=useState("todos");
 useEffect(()=>{setSearch("");setDialog(null);setError("");setOrderFilter("todos");setRecipeFilter("todos")},[section]);
 const close=()=>{setDialog(null);setError("")};
 const open=(which:Dialog)=>{setError("");setDialog(which)};
 const apply=(op:(value:StoreData)=>StoreData,message:string)=>{
  try{onChange(op(data));close();notify(message);return true}
  catch(err){setError(err instanceof Error?err.message:"Não foi possível concluir a operação.");return false}
 };
 const perform=(op:(value:StoreData)=>StoreData,message:string)=>{
  try{onChange(op(data));notify(message)}
  catch(err){notify(err instanceof Error?err.message:"Não foi possível concluir a operação.","error")}
 };
 const productName=(id:string)=>data.products.find(p=>p.id===id)?.name??"Produto não encontrado";
 const customerName=(id:string)=>data.customers.find(c=>c.id===id)?.name??"Cliente não encontrado";
 const productUnit=(id:string)=>data.products.find(p=>p.id===id)?.unit??"un.";
 const activeRecipes=data.productionRecipes.filter(r=>r.active);
 const selectedRecipe=data.productionRecipes.find(r=>r.id===runRecipeId);
 const runFactor=Number(runCount);
 const needed=selectedRecipe?.ingredients.map(i=>({productId:i.productId,required:qty3(i.qty*(Number.isSafeInteger(runFactor)&&runFactor>0?runFactor:0)),
  free:freeQuantity(data,i.productId),unit:productUnit(i.productId)}))??[];
 const recipeOutput=selectedRecipe?data.products.find(p=>p.id===selectedRecipe.productId):undefined;
 const recipeCost=selectedRecipe&&Number.isSafeInteger(runFactor)&&runFactor>0?recipeCostEstimate(data,selectedRecipe,runFactor):undefined;
 const hasIngredientProduct=activeProducts.length>=2;
 const [recipesSearched,runsSearched]=useMemo(()=>[
  data.productionRecipes.filter(r=>(r.name+" "+productName(r.productId)).toLowerCase().includes(search.toLowerCase())&&(recipeFilter==="todos"||(recipeFilter==="activas"&&r.active)||(recipeFilter==="inactivas"&&!r.active))),
  data.productionRuns.filter(r=>(productName(r.outputProductId)+" "+r.id).toLowerCase().includes(search.toLowerCase()))
 ] as const,[data.productionRecipes,data.productionRuns,data.products,search,recipeFilter]);
 const estimatedOrderLines=orderLines.map(row=>{
  const qty=toNumber(row.qty);
  const product=data.products.find(p=>p.id===row.productId);
  const price=product&&Number.isFinite(qty)&&qty>0?wholesaleUnitPrice(data,product.id,qty).price:0;
  const chosenTier=product&&Number.isFinite(qty)&&qty>0?wholesaleUnitPrice(data,product.id,qty).tier:null;
  return {...row,qty,product,unitPrice:price,total:qty*price,tier:chosenTier};
 });
 const estimatedOrderTotal=estimatedOrderLines.reduce((n,i)=>n+(Number.isFinite(i.total)?i.total:0),0);
 const orders=data.wholesaleOrders.filter(o=>orderFilter==="todos"||o.state===orderFilter)
  .filter(o=>(o.id+" "+customerName(o.customerId)).toLowerCase().includes(search.toLowerCase()))
  .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const reservedOrders=data.wholesaleOrders.filter(o=>o.state==="reservada");
 const openRecipe=(r?:ProductionRecipe)=>{
  setRecipeEditing(r?.id??null);
  const firstOutput=r?.productId??activeProducts[0]?.id??"";
  const fallback=activeProducts.find(p=>p.id!==firstOutput)?.id??"";
  setRecipeForm(r?{name:r.name,productId:r.productId,outputQty:String(r.outputQty),notes:r.notes,
   ingredients:r.ingredients.map(i=>({productId:i.productId,qty:String(i.qty)}))}:
   {name:"",productId:firstOutput,outputQty:"10",notes:"",ingredients:[{productId:fallback,qty:"1"}]});
  open("recipe");
 };
 const openRun=(r:ProductionRecipe)=>{setRunRecipeId(r.id);setRunCount("1");setRunNote("");open("run")};
 const openTier=(tier?:WholesaleTier)=>{
  setTierEditing(tier?.id??null);setTierForm(tier?{productId:tier.productId,minimumQty:String(tier.minimumQty),unitPrice:String(tier.unitPrice)}:
   {productId:activeProducts[0]?.id??"",minimumQty:"5",unitPrice:""});
  open("tier");
 };
 const openOrder=()=>{
  setOrderCustomer(data.customers[0]?.id??"");
  setOrderLines([{productId:activeProducts[0]?.id??"",qty:"5"}]);
  setOrderTerm("imediato");setOrderMethod("dinheiro");setOrderDue("");setOrderNote("");
  open("order");
 };
 const updateIngredient=(index:number,key:keyof RecipeLine,val:string)=>{
  setRecipeForm(f=>({...f,ingredients:f.ingredients.map((r,i)=>i===index?{...r,[key]:val}:r)}))
 };
 const updateOrder=(index:number,key:keyof DraftOrderLine,val:string)=>{
  setOrderLines(lines=>lines.map((r,i)=>i===index?{...r,[key]:val}:r))
 };
 const onSaveRecipe=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  apply(s=>saveRecipe(s,{name:recipeForm.name,productId:recipeForm.productId,outputQty:toNumber(recipeForm.outputQty),
   ingredients:recipeForm.ingredients.map(i=>({productId:i.productId,qty:toNumber(i.qty)})),notes:recipeForm.notes},
   recipeEditing??undefined),recipeEditing?"Receita actualizada.":"Receita de produção criada.");
 };
 const onProduce=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();apply(s=>produceBatch(s,runRecipeId,Number(runCount),runNote),"Lote de produção concluído. Stock actualizado.")};
 const onTier=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();apply(s=>saveWholesaleTier(s,{productId:tierForm.productId,minimumQty:toNumber(tierForm.minimumQty),unitPrice:toNumber(tierForm.unitPrice)},tierEditing??undefined),"Escalão de preço guardado.")};
 const onReserve=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const draft:WholesaleDraft={customerId:orderCustomer,items:orderLines.map(i=>({productId:i.productId,qty:toNumber(i.qty)})),
   paymentTerm:orderTerm,method:orderMethod,dueDate:orderDue,note:orderNote};
  apply(s=>reserveWholesaleOrder(s,draft),"Encomenda reservada. Quantidades comprometidas no stock.");
 };
 const canCreateOrder=data.customers.length>0&&activeProducts.length>0;
 return <section className="ex-root">
  {section==="producao"&&<>
   <PageHeading eyebrow="FABRICO E TRANSFORMAÇÃO" title="Produção e padarias" description="Defina receitas, calcule necessidades e registe lotes produzidos com movimentos de stock.">
    <button className="ex-outline" onClick={()=>go("products")}><Package size={16}/> Produtos</button>
    <button className="ex-primary" onClick={()=>openRecipe()} disabled={!hasIngredientProduct}><Plus size={17}/> Criar receita</button>
   </PageHeading>
   <Notice>As receitas são estruturas de demonstração. Ao concluir um lote, o sistema consome matérias-primas e aumenta o stock do produto acabado. O custo é apenas estimado quando existem preços de compra registados para todos os ingredientes.</Notice>
   <div className="ex-stats">
    <Tile icon={Layers} label="Receitas activas" value={String(activeRecipes.length)} description="Fórmulas disponíveis"/>
    <Tile icon={Factory} label="Lotes concluídos" value={String(data.productionRuns.length)} description="Transformações de demonstração"/>
    <Tile icon={Package} label="Produtos fabricados" value={String(new Set(data.productionRuns.map(r=>r.outputProductId)).size)} description="Tipos de produtos acabados"/>
    <Tile icon={ClipboardList} label="Receitas utilizadas" value={String(new Set(data.productionRuns.map(r=>r.recipeId)).size)} description="Fórmulas usadas na produção"/>
   </div>
   {!hasIngredientProduct&&<Notice warning>É necessário criar pelo menos dois produtos activos, um produto acabado e uma matéria-prima. Pode começar em <button className="ex-link" onClick={()=>go("products")}>Produtos e stock <ArrowRight size={14}/></button>.</Notice>}
   <section className="ex-panel"><div className="ex-panel-heading"><div><h2>Receitas e fórmulas</h2><p>Ingredientes necessários por rendimento de referência</p></div><div className="ex-toolbar"><label className="ex-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar receita" aria-label="Pesquisar receitas"/></label><select aria-label="Filtrar receitas" value={recipeFilter} onChange={e=>setRecipeFilter(e.target.value)}><option value="todos">Todas</option><option value="activas">Activas</option><option value="inactivas">Inactivas</option></select></div></div>
    {recipesSearched.length===0?<Empty icon={Layers} title={search?"Nenhuma receita encontrada":"Comece por criar uma receita"} description="Escolha um produto acabado, indique o rendimento e as matérias-primas." action={!search?<button className="ex-primary" disabled={!hasIngredientProduct} onClick={()=>openRecipe()}><Plus size={16}/> Criar receita</button>:undefined}/>:
    <div className="ex-recipe-grid">{recipesSearched.map(r=>{
     const estimate=recipeCostEstimate(data,r);
     const ingredients=r.ingredients.map(i=>productName(i.productId)+" ("+formatQty(i.qty)+" "+productUnit(i.productId)+")");
     const output=data.products.find(p=>p.id===r.productId);
     return <article key={r.id} className="ex-recipe-card">
      <div className="ex-recipe-top"><span className="ex-recipe-icon"><Factory size={20}/></span><span className={"ex-pill "+(r.active?"ok":"off")}>{r.active?"Activa":"Inactiva"}</span></div>
      <h3>{r.name}</h3><p>{output?.name??"Produto indisponível"} · rendimento: <b>{formatQty(r.outputQty)} {output?.unit??"un."}</b></p>
      <div className="ex-recipe-list"><b>Matérias-primas</b>{ingredients.map((name,i)=><div key={r.ingredients[i]!.productId}><Check size={15}/><span>{name}</span></div>)}</div>
      <div className="ex-recipe-price"><span>Custo estimado dos ingredientes</span><strong>{estimate.total!==undefined?money(estimate.total):"Por apurar"}</strong></div>
      <div className="ex-recipe-actions"><button className="ex-outline" onClick={()=>openRecipe(r)}>Editar</button><button className="ex-primary" onClick={()=>openRun(r)} disabled={!r.active}>Produzir</button><button className="ex-link" onClick={()=>perform(s=>toggleRecipe(s,r.id),r.active?"Receita desactivada.":"Receita reactivada.")}>{r.active?"Desactivar":"Reactivar"}</button></div>
     </article>})}</div>}
   </section>
   <section className="ex-panel ex-later"><div className="ex-panel-heading"><div><h2>Histórico de produção</h2><p>Movimentos de matérias-primas e produtos acabados</p></div></div>
    {runsSearched.length===0?<Empty icon={Factory} title="Ainda sem produção" description="Conclua um lote para criar automaticamente as entradas e saídas de stock."/>:
    <div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Referência</th><th>Data</th><th>Produto acabado</th><th>Quantidade</th><th>Matérias-primas</th><th>Custo estimado</th></tr></thead><tbody>{runsSearched.map(r=><tr key={r.id}><td><strong>{r.id}</strong><small>{r.note||"—"}</small></td><td>{dateTime(r.createdAt)}</td><td>{productName(r.outputProductId)}</td><td>{formatQty(r.outputQty)} {productUnit(r.outputProductId)}</td><td>{r.ingredients.map(i=>productName(i.productId)+" ("+formatQty(i.qty)+" "+productUnit(i.productId)+")").join("; ")}</td><td>{r.estimatedCost!==undefined?money(r.estimatedCost):"Por apurar"}</td></tr>)}</tbody></table></div>}
   </section>
  </>}
  {section==="grossistas"&&<>
   <PageHeading eyebrow="DISTRIBUIÇÃO E VENDA POR VOLUME" title="Grossistas e distribuidores" description="Defina preços por quantidade, reserve encomendas e acompanhe expedições e entregas.">
    <button className="ex-outline" onClick={()=>go("customers")}><Users size={16}/> Clientes</button>
    <button className="ex-primary" disabled={!canCreateOrder} onClick={openOrder}><Plus size={17}/> Nova encomenda</button>
   </PageHeading>
   <Notice>A reserva compromete stock sem criar uma venda. A <b>expedição</b> regista a venda, baixa o stock e, se for a fiado, cria a dívida do cliente. A entrega é apenas confirmada nesta demonstração — não há transportadoras, localização em tempo real nem cobranças reais.</Notice>
   <div className="ex-stats">
    <Tile icon={ClipboardList} label="Encomendas reservadas" value={String(reservedOrders.length)} description="À espera de expedição"/>
    <Tile icon={Package} label="Artigos reservados" value={formatQty(reservedOrders.reduce((n,o)=>n+o.items.reduce((a,i)=>a+i.qty,0),0))} description="Quantidades comprometidas"/>
    <Tile icon={Truck} label="Em expedição" value={String(data.wholesaleOrders.filter(o=>o.state==="expedida").length)} description="À espera de entrega"/>
    <Tile icon={Wallet} label="Volume expedido" value={money(data.wholesaleOrders.filter(o=>o.state==="expedida"||o.state==="entregue").reduce((n,o)=>n+o.total,0))} description="Vendas demonstrativas"/>
   </div>
   {!canCreateOrder&&<Notice warning>Para criar uma encomenda, precisa de pelo menos um cliente e um produto activo. <button className="ex-link" onClick={()=>go(!data.customers.length?"customers":"products")}>Ir para {!data.customers.length?"clientes":"produtos"} <ArrowRight size={14}/></button>.</Notice>}
   <section className="ex-panel"><div className="ex-panel-heading"><div><h2>Encomendas dos clientes</h2><p>Reservadas, expedidas, entregues e canceladas</p></div><div className="ex-toolbar"><label className="ex-search"><Search size={17}/><input aria-label="Pesquisar encomendas" placeholder="Cliente ou referência" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filtrar encomendas" value={orderFilter} onChange={e=>setOrderFilter(e.target.value)}><option value="todos">Todos os estados</option><option value="reservada">Reservadas</option><option value="expedida">Expedidas</option><option value="entregue">Entregues</option><option value="cancelada">Canceladas</option></select></div></div>
    {orders.length===0?<Empty icon={ClipboardList} title={search?"Nenhuma encomenda encontrada":"Ainda sem encomendas"} description="Seleccione um cliente, indique os artigos e reserve a mercadoria." action={!search&&canCreateOrder?<button className="ex-primary" onClick={openOrder}><Plus size={16}/> Nova encomenda</button>:undefined}/>:
    <div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Encomenda</th><th>Cliente</th><th>Artigos</th><th>Valor</th><th>Pagamento</th><th>Estado</th><th>Acções</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}>
     <td><strong>{o.id}</strong><small>{dateTime(o.createdAt)} · {o.note||"Sem nota"}</small></td>
     <td>{customerName(o.customerId)}</td>
     <td><div className="ex-order-products">{o.items.map(i=><span key={i.productId}>{productName(i.productId)} · {formatQty(i.qty)} {productUnit(i.productId)} × {money(i.unitPrice)}</span>)}</div></td>
     <td><strong>{money(o.total)}</strong></td><td>{o.paymentTerm==="fiado"?"Fiado até "+o.dueDate:payLabels[o.method??"dinheiro"]}</td>
     <td><span className={"ex-pill "+(o.state==="entregue"?"ok":o.state==="cancelada"?"off":"warning")}>{orderStates[o.state]}</span></td>
     <td><div className="ex-table-actions">{o.state==="reservada"&&<>
      <button className="ex-small-primary" onClick={()=>{
       if(!window.confirm("Confirmar expedição de "+o.id+"? A venda será registada e o stock será reduzido."))return;
       perform(s=>dispatchWholesaleOrder(s,o.id),"Encomenda expedida, stock actualizado e venda criada.");
      }}>Expedir</button>
      <button className="ex-inline-danger" onClick={()=>{
       if(!window.confirm("Cancelar a encomenda "+o.id+" e libertar o stock reservado?"))return;
       perform(s=>cancelWholesaleOrder(s,o.id),"Encomenda cancelada e reserva libertada.");
      }}>Cancelar</button></>}
      {o.state==="expedida"&&<button className="ex-small-primary" onClick={()=>perform(s=>deliverWholesaleOrder(s,o.id),"Entrega confirmada na demonstração.")}>Confirmar entrega</button>}
      {(o.state==="entregue"||o.state==="cancelada")&&<span className="ex-finished">Concluída</span>}</div></td>
    </tr>)}</tbody></table></div>}
   </section>
   <section className="ex-panel ex-later"><div className="ex-panel-heading"><div><h2>Escalões de preços por quantidade</h2><p>Quanto maior a encomenda, poderá aplicar-se um preço unitário diferente</p></div><button className="ex-outline" onClick={()=>openTier()} disabled={!activeProducts.length}><Plus size={17}/> Criar escalão</button></div>
   {data.wholesaleTiers.length===0?<Empty icon={Layers} title="Sem escalões personalizados" description="Enquanto não definir escalões, aplica-se o preço do catálogo." action={<button className="ex-primary" disabled={!activeProducts.length} onClick={()=>openTier()}>Criar escalão</button>}/>:
   <div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Produto</th><th>Quantidade mínima</th><th>Preço do catálogo</th><th>Preço grossista</th><th>Estado</th><th>Acções</th></tr></thead><tbody>{[...data.wholesaleTiers].sort((a,b)=>productName(a.productId).localeCompare(productName(b.productId))||a.minimumQty-b.minimumQty).map(t=><tr key={t.id}>
    <td><strong>{productName(t.productId)}</strong></td><td>{formatQty(t.minimumQty)} {productUnit(t.productId)}</td><td>{money(data.products.find(p=>p.id===t.productId)?.price??0)}</td><td><strong>{money(t.unitPrice)}</strong></td>
    <td><span className={"ex-pill "+(t.active?"ok":"off")}>{t.active?"Activo":"Desactivado"}</span></td>
    <td><div className="ex-table-actions"><button className="ex-link" onClick={()=>openTier(t)}>Editar</button><button className="ex-link" onClick={()=>perform(s=>toggleWholesaleTier(s,t.id),t.active?"Escalão desactivado.":"Escalão reactivado.")}>{t.active?"Desactivar":"Reactivar"}</button></div></td></tr>)}</tbody></table></div>}
   </section>
  </>}
  {dialog==="recipe"&&<Modal title={recipeEditing?"Editar receita de produção":"Criar receita de produção"} error={error} wide onClose={close}><form className="ex-form" onSubmit={onSaveRecipe}>
   <div className="ex-grid-two"><Field label="Nome da receita"><input required value={recipeForm.name} onChange={e=>setRecipeForm(f=>({...f,name:e.target.value}))} placeholder="Ex.: Pão tradicional"/></Field>
    <Field label="Produto acabado"><select value={recipeForm.productId} required onChange={e=>setRecipeForm(f=>({...f,productId:e.target.value,ingredients:f.ingredients.map(i=>i.productId===e.target.value?{...i,productId:""}:i)}))}>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></Field></div>
   <Field label={"Quantidade de produto acabado por receita ("+productUnit(recipeForm.productId)+")"}><input type="number" required min={productUnit(recipeForm.productId)==="kg"?".001":"1"} step={productUnit(recipeForm.productId)==="kg"?".001":"1"} value={recipeForm.outputQty} onChange={e=>setRecipeForm(f=>({...f,outputQty:e.target.value}))}/></Field>
   <div className="ex-form-heading"><h3>Matérias-primas por receita</h3><small>Introduza as quantidades necessárias para o rendimento acima.</small></div>
   <div className="ex-rows">{recipeForm.ingredients.map((line,i)=><div className="ex-line" key={i}>
    <Field label="Ingrediente"><select required value={line.productId} onChange={e=>updateIngredient(i,"productId",e.target.value)}><option value="">Seleccione</option>{activeProducts.filter(p=>p.id!==recipeForm.productId).map(p=><option key={p.id} value={p.id}>{p.name} · {p.unit}</option>)}</select></Field>
    <Field label={"Quantidade ("+productUnit(line.productId)+")"}><input type="number" min={["kg","L"].includes(productUnit(line.productId))?".001":"1"} step={["kg","L"].includes(productUnit(line.productId))?".001":"1"} required value={line.qty} onChange={e=>updateIngredient(i,"qty",e.target.value)}/></Field>
    <button type="button" title="Remover ingrediente" aria-label={"Remover ingrediente "+(i+1)} disabled={recipeForm.ingredients.length===1} onClick={()=>setRecipeForm(f=>({...f,ingredients:f.ingredients.filter((_,j)=>j!==i)}))}><X size={18}/></button>
   </div>)}</div>
   <button className="ex-link" type="button" disabled={recipeForm.ingredients.length>=Math.max(1,activeProducts.length-1)} onClick={()=>setRecipeForm(f=>({...f,ingredients:[...f.ingredients,{productId:"",qty:"1"}]}))}><Plus size={17}/> Adicionar matéria-prima</button>
   <Field label="Notas (opcional)"><textarea rows={2} value={recipeForm.notes} onChange={e=>setRecipeForm(f=>({...f,notes:e.target.value}))}/></Field>
   <div className="ex-form-actions"><button className="ex-outline" type="button" onClick={close}>Cancelar</button><button className="ex-primary" type="submit">Guardar receita</button></div>
  </form></Modal>}
  {dialog==="run"&&selectedRecipe&&<Modal title="Registar lote de produção" error={error} wide onClose={close}><form className="ex-form" onSubmit={onProduce}>
   <div className="ex-run-info"><Factory size={24}/><div><strong>{selectedRecipe.name}</strong><span>{productName(selectedRecipe.productId)} · {formatQty(selectedRecipe.outputQty)} {productUnit(selectedRecipe.productId)} por receita</span></div></div>
   <Field label="Número de vezes a executar a receita"><input required type="number" min="1" max="10000" step="1" value={runCount} onChange={e=>setRunCount(e.target.value)}/></Field>
   <div className="ex-summary-line"><span>Quantidade a produzir</span><strong>{formatQty(selectedRecipe.outputQty*(Number.isSafeInteger(runFactor)&&runFactor>0?runFactor:0))} {recipeOutput?.unit}</strong></div>
   <div className="ex-form-heading"><h3>Verificação dos ingredientes</h3><small>Considera as comandas e as encomendas grossistas reservadas.</small></div>
   <div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Ingrediente</th><th>Necessário</th><th>Disponível</th><th>Estado</th></tr></thead><tbody>{needed.map(n=><tr key={n.productId}><td><strong>{productName(n.productId)}</strong></td><td>{formatQty(n.required)} {n.unit}</td><td>{formatQty(n.free)} {n.unit}</td><td><span className={"ex-pill "+(n.required>0&&n.free>=n.required?"ok":"warning")}>{n.required>0&&n.free>=n.required?"Disponível":"Insuficiente"}</span></td></tr>)}</tbody></table></div>
   <div className="ex-summary-line"><span>Estimativa de custo da matéria-prima</span><strong>{recipeCost?.total===undefined?"Não disponível":money(recipeCost.total)}</strong></div>
   {recipeCost?.total===undefined&&<Notice warning>Faltam preços de compra para uma ou mais matérias-primas. O custo da produção não será inventado.</Notice>}
   <Field label="Observação do lote (opcional)"><input value={runNote} onChange={e=>setRunNote(e.target.value)} placeholder="Ex.: Fornada da manhã"/></Field>
   <div className="ex-form-actions"><button type="button" className="ex-outline" onClick={close}>Cancelar</button><button className="ex-primary" disabled={!Number.isSafeInteger(runFactor)||runFactor<1||needed.some(n=>n.free<n.required)}>Concluir produção</button></div>
  </form></Modal>}
  {dialog==="tier"&&<Modal title={tierEditing?"Editar escalão de preço":"Criar escalão grossista"} error={error} onClose={close}><form className="ex-form" onSubmit={onTier}>
   <Field label="Produto"><select required value={tierForm.productId} onChange={e=>setTierForm(f=>({...f,productId:e.target.value}))}>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.unit}</option>)}</select></Field>
   <div className="ex-grid-two"><Field label={"Quantidade mínima ("+productUnit(tierForm.productId)+")"}><input required type="number" min={["kg","L"].includes(productUnit(tierForm.productId))?".001":"1"} step={["kg","L"].includes(productUnit(tierForm.productId))?".001":"1"} value={tierForm.minimumQty} onChange={e=>setTierForm(f=>({...f,minimumQty:e.target.value}))}/></Field>
   <Field label="Preço unitário (MZN)"><input required type="number" min=".01" step=".01" value={tierForm.unitPrice} onChange={e=>setTierForm(f=>({...f,unitPrice:e.target.value}))}/></Field></div>
   <Notice>O preço do escalão aplica-se às encomendas que atinjam a quantidade mínima. Encomendas já reservadas mantêm o preço definido no momento do registo.</Notice>
   <div className="ex-form-actions"><button className="ex-outline" type="button" onClick={close}>Cancelar</button><button className="ex-primary">Guardar escalão</button></div>
  </form></Modal>}
  {dialog==="order"&&<Modal title="Nova encomenda grossista" error={error} wide onClose={close}><form className="ex-form" onSubmit={onReserve}>
   <Field label="Cliente"><select required value={orderCustomer} onChange={e=>setOrderCustomer(e.target.value)}>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name} · fiado {money(c.debt)}</option>)}</select></Field>
   <div className="ex-form-heading"><h3>Produtos e quantidades</h3><small>O melhor escalão de preço será aplicado automaticamente.</small></div>
   <div className="ex-rows">{orderLines.map((line,index)=>{
    const calculated=estimatedOrderLines[index];
    return <div key={index} className="ex-order-line">
     <Field label="Produto"><select required value={line.productId} onChange={e=>updateOrder(index,"productId",e.target.value)}>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {formatQty(freeQuantity(data,p.id))} {p.unit} livres</option>)}</select></Field>
     <Field label={"Quantidade ("+productUnit(line.productId)+")"}><input required type="number" min={["kg","L"].includes(productUnit(line.productId))?".001":"1"} step={["kg","L"].includes(productUnit(line.productId))?".001":"1"} value={line.qty} onChange={e=>updateOrder(index,"qty",e.target.value)}/></Field>
     <div className="ex-line-price"><small>{calculated?.tier?"Escalão aplicado":"Preço do catálogo"}</small><strong>{money(calculated?.total??0)}</strong></div>
     <button type="button" title="Retirar artigo" aria-label={"Retirar artigo "+(index+1)} disabled={orderLines.length===1} onClick={()=>setOrderLines(lines=>lines.filter((_,i)=>i!==index))}><X size={18}/></button>
    </div>})}</div>
   <button type="button" className="ex-link" disabled={orderLines.length>=activeProducts.length} onClick={()=>setOrderLines(rows=>[...rows,{productId:activeProducts.find(p=>!rows.some(row=>row.productId===p.id))?.id??"",qty:"1"}])}><Plus size={16}/> Adicionar artigo</button>
   <div className="ex-grid-two"><Field label="Condição de pagamento"><select value={orderTerm} onChange={e=>setOrderTerm(e.target.value as "imediato"|"fiado")}><option value="imediato">Pagamento na expedição (demo)</option><option value="fiado">A fiado</option></select></Field>
   {orderTerm==="imediato"?<Field label="Método na expedição"><select value={orderMethod} onChange={e=>setOrderMethod(e.target.value as CashMethod)}>{methods.map(m=><option key={m} value={m}>{payLabels[m]}</option>)}</select></Field>:<Field label="Data de vencimento do fiado"><input type="date" min={todayISO()} required value={orderDue} onChange={e=>setOrderDue(e.target.value)}/></Field>}
   </div>
   <Field label="Observações (opcional)"><textarea rows={2} value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Ex.: Distribuição para loja de bairro"/></Field>
   <div className="ex-summary-line"><span>Valor total reservado</span><strong>{money(Number.isFinite(estimatedOrderTotal)?estimatedOrderTotal:0)}</strong></div>
   <Notice>Reservar a encomenda não cria dívida nem vende produtos. Esses movimentos só acontecem ao confirmar a expedição, com validação do stock e do limite de fiado.</Notice>
   <div className="ex-form-actions"><button className="ex-outline" type="button" onClick={close}>Cancelar</button><button className="ex-primary">Reservar encomenda</button></div>
  </form></Modal>}
 </section>;
}
