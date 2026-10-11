import {useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {AlertTriangle,ArrowRight,Beef,CalendarClock,Check,CheckCircle2,ChefHat,ClipboardList,Clock,GlassWater,Info,Layers,Minus,Package,Plus,Receipt,Search,ShieldAlert,ShoppingBag,Store,Table2,Trash2,Wallet,X} from "lucide-react";
import {useDialogFocus} from "../lib/useDialogFocus";
import {money,type Payment,type Product,type Section,type Store as StoreData,type ServiceArea,type ServiceOrder} from "../lib/domain";
import {availablePharmaLots,nearExpiry,registerPharmaLot,registerPharmaDispense,registerServiceTable,startServiceOrder,addServiceOrderItem,removeServiceOrderItem,advanceServiceOrder,cancelServiceOrder,finishServiceOrder,serviceOrderTotal,serviceActiveOrders,registerButcherBatch,registerWeightedSale,three,reservedQty} from "../lib/sectors";

type SectorSection=Extract<Section,"farmacia"|"restaurante"|"bar"|"talho">;
type PayMethod=Exclude<Payment,"fiado">;
type Dialog="lot"|"dispense"|"table"|"order"|"batch"|"weighted"|null;
type Props={section:SectorSection;data:StoreData;onChange:(store:StoreData)=>void;notify:(message:string,kind?:"success"|"error")=>void;go:(section:Section)=>void};
const TODAY=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const paymentLabel:Record<PayMethod,string>={dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão"};
const orderLabel:Record<ServiceOrder["state"],string>={aberta:"Aberta",preparacao:"Em preparação",pronta:"Pronta",servida:"Servida",fechada:"Fechada",anulada:"Anulada"};
const nextLabel:Partial<Record<ServiceOrder["state"],string>>={aberta:"Enviar à preparação",preparacao:"Marcar como pronta",pronta:"Marcar como servida"};
const moneyNumber=(v:string)=>Number(v.replace(",","."));
const timestamp=(iso:string)=>new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const findName=(p:Product[],id:string)=>p.find(x=>x.id===id)?.name??"Produto indisponível";
function Title({eyebrow,name,sub,children}:{eyebrow:string;name:string;sub:string;children?:ReactNode}){
 return <header className="sc-title"><div><span className="sc-eyebrow">{eyebrow}</span><h1>{name}</h1><p>{sub}</p></div>{children&&<div className="sc-actions">{children}</div>}</header>;
}
function Stat({title,value,info,icon:Icon}:{title:string;value:string;info:string;icon:typeof Package}){
 return <article className="sc-stat"><div><span>{title}</span><span className="sc-stat-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{info}</small></article>;
}
function Field({label,children,help}:{label:string;children:ReactNode;help?:string}){
 return <label className="sc-field"><span>{label}</span>{children}{help&&<small>{help}</small>}</label>;
}
function Empty({icon:Icon,title,description,action}:{icon:typeof Package;title:string;description:string;action?:ReactNode}){
 return <div className="sc-empty"><span><Icon size={25}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function Modal({title,children,onClose,error,wide=false}:{title:string;children:ReactNode;onClose:()=>void;error?:string|undefined;wide?:boolean}){
 const dialogRef=useDialogFocus<HTMLDivElement>(onClose);
 return <div className="sc-mask" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><div ref={dialogRef} tabIndex={-1} className={"sc-dialog "+(wide?"wide":"")} role="dialog" aria-modal="true" aria-label={title}><div className="sc-dialog-head"><h2>{title}</h2><button aria-label="Fechar" onClick={onClose}><X size={20}/></button></div><div className="sc-dialog-body">{error&&<div className="sc-error" role="alert"><AlertTriangle size={17}/>{error}</div>}{children}</div></div></div>;
}
function Method({value,onChange}:{value:PayMethod;onChange:(method:PayMethod)=>void}){
 return <Field label="Pagamento demonstrativo"><select value={value} onChange={e=>onChange(e.target.value as PayMethod)}>{(Object.keys(paymentLabel) as PayMethod[]).map(p=><option key={p} value={p}>{paymentLabel[p]}</option>)}</select></Field>;
}
function Hint({children,warning=false}:{children:ReactNode;warning?:boolean}){
 return <div className={"sc-hint "+(warning?"warning":"")}><Info size={18}/><span>{children}</span></div>;
}
const SectionMessage=({children}:{children:ReactNode})=><p className="sc-help">{children}</p>;
export function SectorOperations({section,data,onChange,notify,go}:Props){
 const today=TODAY();
 const activeProducts=data.products.filter(p=>p.active);
 const trackedIds=new Set(data.pharmaLots.map(l=>l.productId));
 const pharmaProducts=activeProducts.filter(p=>trackedIds.has(p.id));
 const kgProducts=activeProducts.filter(p=>p.unit.toLowerCase()==="kg");
 const sectorArea:ServiceArea=section==="bar"?"bar":"restaurante";
 const tables=data.serviceTables.filter(t=>t.area===sectorArea);
 const orders=data.serviceOrders.filter(o=>o.area===sectorArea);
 const opened=serviceActiveOrders(data,sectorArea);
 const expired=data.pharmaLots.filter(l=>l.qty>0&&l.expiryDate<today);
 const soon=nearExpiry(data,today);
 const [dialog,setDialog]=useState<Dialog>(null);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [lotProduct,setLotProduct]=useState("");
 const [lotNumber,setLotNumber]=useState("");
 const [lotExpiry,setLotExpiry]=useState("");
 const [lotQty,setLotQty]=useState("1");
 const [lotNote,setLotNote]=useState("");
 const [dispenseProduct,setDispenseProduct]=useState("");
 const [dispenseQty,setDispenseQty]=useState("1");
 const [dispenseNote,setDispenseNote]=useState("");
 const [dispenseMethod,setDispenseMethod]=useState<PayMethod>("dinheiro");
 const [tableLabel,setTableLabel]=useState("");
 const [tableId,setTableId]=useState("");
 const [orderId,setOrderId]=useState("");
 const [orderProduct,setOrderProduct]=useState("");
 const [orderQty,setOrderQty]=useState("1");
 const [orderNote,setOrderNote]=useState("");
 const [orderMethod,setOrderMethod]=useState<PayMethod>("dinheiro");
 const [sourceKg,setSourceKg]=useState("");
 const [sourceProduct,setSourceProduct]=useState("");
 const [outputs,setOutputs]=useState<{productId:string;qty:string}[]>([{productId:"",qty:""}]);
 const [batchNote,setBatchNote]=useState("");
 const [weightProduct,setWeightProduct]=useState("");
 const [weightQty,setWeightQty]=useState("");
 const [weightMethod,setWeightMethod]=useState<PayMethod>("dinheiro");
 useEffect(()=>{setQuery("");setDialog(null);setError("");setOrderId("");},[section]);
 const close=()=>{setDialog(null);setError("")};
 const show=(kind:Dialog)=>{setError("");setDialog(kind)};
 const submit=(process:(store:StoreData)=>StoreData,message:string)=>{
  try{const changed=process(data);onChange(changed);close();notify(message);return true}catch(err){setError(err instanceof Error?err.message:"Não foi possível completar a operação.");return false}
 };
 const activeOrder=orders.find(o=>o.id===orderId);
 const lotStocks=useMemo(()=>data.pharmaLots.filter(l=>(findName(data.products,l.productId)+" "+l.lotNumber).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)),[data.pharmaLots,data.products,query]);
 const displayedOrders=orders.filter(o=>(o.id+" "+(tables.find(t=>t.id===o.tableId)?.label??"")).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const openLot=()=>{setLotProduct(activeProducts[0]?.id??"");setLotNumber("");setLotQty("1");setLotExpiry("");setLotNote("");show("lot")};
 const openDispense=()=>{setDispenseProduct(pharmaProducts[0]?.id??"");setDispenseQty("1");setDispenseNote("");setDispenseMethod("dinheiro");show("dispense")};
 const openTable=()=>{setTableLabel("");show("table")};
 const openOrder=(id?:string)=>{
  const available=tables.find(t=>t.active&&!opened.some(o=>o.tableId===t.id));
  setTableId(id??available?.id??"");setOrderNote("");show("order");
 };
 const openBatch=()=>{setSourceProduct(kgProducts[0]?.id??"");setSourceKg("");setOutputs([{productId:kgProducts.find(p=>p.id!==kgProducts[0]?.id)?.id??"",qty:""}]);setBatchNote("");show("batch")};
 const openWeighted=()=>{setWeightProduct(kgProducts[0]?.id??"");setWeightQty("");setWeightMethod("dinheiro");show("weighted")};
 const assignOrder=(id:string)=>{setOrderId(id);setOrderQty("1");setOrderProduct(activeProducts[0]?.id??"");setOrderMethod("dinheiro")};
 const currentLots=availablePharmaLots(data,dispenseProduct,today);
 const currentAvailable=currentLots.reduce((sum,l)=>sum+l.qty,0);
 const chosenProduct=activeProducts.find(p=>p.id===dispenseProduct);
 const weightChosen=kgProducts.find(p=>p.id===weightProduct);
 const saleTotal=weightChosen?money((moneyNumber(weightQty)||0)*weightChosen.price):money(0);
 const onCreateLot=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();submit(s=>registerPharmaLot(s,lotProduct,lotNumber,lotExpiry,Number(lotQty),today,lotNote),"Lote criado e stock actualizado.")};
 const onDispense=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();submit(s=>registerPharmaDispense(s,dispenseProduct,Number(dispenseQty),dispenseMethod,today,dispenseNote),"Dispensa demonstrativa registada, com controlo FEFO.")};
 const onNewTable=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();submit(s=>registerServiceTable(s,sectorArea,tableLabel),"Mesa registada na demonstração.")};
 const onNewOrder=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();
  try{const next=startServiceOrder(data,tableId,orderNote);onChange(next);assignOrder(next.serviceOrders[0]!.id);close();notify("Comanda aberta.");}catch(err){setError(err instanceof Error?err.message:"Não foi possível abrir a comanda.");}
 };
 const onAddOrderItem=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();try{const next=addServiceOrderItem(data,orderId,orderProduct,Number(orderQty));onChange(next);notify("Artigo acrescentado à comanda.");setOrderQty("1");setError("");}catch(err){notify(err instanceof Error?err.message:"Erro ao adicionar artigo.","error")}};
 const onAdvance=(id:string)=>{try{const next=advanceServiceOrder(data,id);onChange(next);notify("Estado da comanda actualizado.");}catch(err){notify(err instanceof Error?err.message:"Estado indisponível.","error")}};
 const onRemoveItem=(id:string,productId:string)=>{try{onChange(removeServiceOrderItem(data,id,productId));notify("Artigo retirado da comanda.");}catch(err){notify(err instanceof Error?err.message:"Não foi possível retirar artigo.","error")}};
 const onCancel=(id:string)=>{if(!window.confirm("Anular esta comanda?"))return;try{onChange(cancelServiceOrder(data,id));setOrderId("");notify("Comanda anulada na demonstração.");}catch(err){notify(err instanceof Error?err.message:"Não foi possível anular.","error")}};
 const onFinish=(id:string)=>{try{onChange(finishServiceOrder(data,id,orderMethod));setOrderId("");notify("Comanda recebida. Venda e stock actualizados.");}catch(err){notify(err instanceof Error?err.message:"Não foi possível receber.","error")}};
 const onBatch=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();submit(s=>registerButcherBatch(s,sourceProduct,moneyNumber(sourceKg),outputs.map(o=>({productId:o.productId,qty:moneyNumber(o.qty)})),batchNote),"Transformação por peso registada.")};
 const onWeighted=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();submit(s=>registerWeightedSale(s,weightProduct,moneyNumber(weightQty),weightMethod),"Venda por peso registada na demonstração.")};
 return <section className="sc-root">
 {section==="farmacia"&&<>
  <Title eyebrow="GESTÃO FARMACÊUTICA" name="Farmácias" sub="Controle os lotes, as datas de validade e as dispensas demonstrativas." >
   <button className="sc-outline" onClick={()=>go("products")}><Package size={17}/> Produtos</button>
   <button className="sc-primary" onClick={openLot} disabled={!activeProducts.length}><Plus size={17}/> Receber lote</button>
  </Title>
  <Hint warning><b>Atenção:</b> este módulo é um protótipo de inventário. Não substitui validação de receitas médicas, controlo de medicamentos sujeitos a receita, rastreabilidade legal ou procedimentos profissionais. Os produtos com lotes devem ser dispensados aqui para respeitar o FEFO.</Hint>
  <div className="sc-stats">
   <Stat title="Lotes registados" value={String(data.pharmaLots.length)} info="Por produto e validade" icon={Layers}/>
   <Stat title="A expirar (30 dias)" value={String(soon.length)} info="Com unidades por vender" icon={CalendarClock}/>
   <Stat title="Lotes vencidos" value={String(expired.length)} info="Venda bloqueada neste módulo" icon={AlertTriangle}/>
   <Stat title="Dispensas" value={String(data.pharmaDispenses.length)} info="Operações simuladas" icon={Receipt}/>
  </div>
  <div className="sc-panel">
   <div className="sc-panel-heading"><div><h2>Inventário por lote</h2><p>FEFO — dispensar primeiro o lote com validade mais próxima</p></div><div className="sc-inline"><label className="sc-search"><Search size={17}/><input aria-label="Pesquisar lotes" placeholder="Produto ou número do lote" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="sc-primary" disabled={!data.pharmaLots.some(l=>l.qty>0&&l.expiryDate>=today)} onClick={openDispense}>Registar dispensa</button></div></div>
   {lotStocks.length===0?<Empty icon={Package} title={query?"Nenhum lote encontrado":"Ainda não existem lotes"} description="Registe um produto no catálogo e receba o primeiro lote com validade." action={!query?<button className="sc-primary" onClick={openLot} disabled={!activeProducts.length}>Receber lote</button>:undefined}/>:
   <div className="sc-scroll"><table className="sc-table"><thead><tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Disponível</th><th>Estado</th></tr></thead><tbody>{lotStocks.map(l=><tr key={l.id}><td><strong>{findName(data.products,l.productId)}</strong></td><td><code>{l.lotNumber}</code></td><td>{l.expiryDate}</td><td>{l.qty} un.</td><td><span className={"sc-status "+(l.expiryDate<today?"danger":l.qty===0?"muted":soon.some(x=>x.id===l.id)?"warning":"ok")}>{l.qty===0?"Esgotado":l.expiryDate<today?"Vencido":soon.some(x=>x.id===l.id)?"A expirar":"Válido"}</span></td></tr>)}</tbody></table></div>}
  </div>
  <div className="sc-panel sc-later"><div className="sc-panel-heading"><div><h2>Histórico de dispensas</h2><p>Com identificação dos lotes utilizados</p></div></div>{data.pharmaDispenses.length===0?<Empty icon={Receipt} title="Sem dispensas" description="As dispensas simuladas aparecerão nesta lista."/>:<div className="sc-scroll"><table className="sc-table"><thead><tr><th>Data</th><th>Produto</th><th>Lotes</th><th>Quantidade</th><th>Venda</th></tr></thead><tbody>{data.pharmaDispenses.map(d=><tr key={d.id}><td>{timestamp(d.createdAt)}</td><td><strong>{findName(data.products,d.productId)}</strong></td><td>{d.allocations.map(a=>{const l=data.pharmaLots.find(x=>x.id===a.lotId);return (l?.lotNumber??"—")+" ("+a.qty+")"}).join("; ")}</td><td>{d.qty}</td><td><code>{d.saleId}</code></td></tr>)}</tbody></table></div>}</div>
 </>}
 {(section==="restaurante"||section==="bar")&&<>
  <Title eyebrow={section==="bar"?"SERVIÇO DE BAR":"SERVIÇO DE RESTAURAÇÃO"} name={section==="bar"?"Bares e consumo":"Restaurantes e cozinha"} sub="Organize mesas, comandas, preparação e recebimentos.">
   <button className="sc-outline" onClick={openTable}><Plus size={17}/> Nova mesa</button>
   <button className="sc-primary" onClick={()=>openOrder()} disabled={!tables.some(t=>t.active&&!opened.some(o=>o.tableId===t.id))}><ClipboardList size={17}/> Abrir comanda</button>
  </Title>
  <Hint>Os artigos da comanda reservam quantidades enquanto o pedido está aberto. O stock é descontado no fecho. A preparação e o pagamento são simulações; ainda não existe impressora de cozinha ou integração com entregas.</Hint>
  <div className="sc-stats">
   <Stat title="Mesas registadas" value={String(tables.length)} info="Este sector de actividade" icon={Table2}/>
   <Stat title="Comandas abertas" value={String(opened.length)} info="Inclui pedidos em preparação" icon={ClipboardList}/>
   <Stat title="Pedidos prontos" value={String(opened.filter(o=>o.state==="pronta").length)} info="A aguardar serviço" icon={ChefHat}/>
   <Stat title="Serviços concluídos" value={String(orders.filter(o=>o.state==="fechada").length)} info="Pagamentos simulados" icon={CheckCircle2}/>
  </div>
  <div className="sc-service-grid">
   <section className="sc-panel"><div className="sc-panel-heading"><div><h2>Planta de mesas</h2><p>Seleccione uma mesa para abrir ou acompanhar o pedido</p></div></div>
    {tables.length===0?<Empty icon={Table2} title="Sem mesas registadas" description="Comece por criar uma mesa para o estabelecimento." action={<button className="sc-primary" onClick={openTable}><Plus size={16}/> Criar mesa</button>}/>:
    <div className="sc-table-cards">{tables.map(t=>{const order=opened.find(o=>o.tableId===t.id);return <button key={t.id} className={"sc-table-card "+(order?"occupied":"")} onClick={()=>{if(order)assignOrder(order.id);else if(t.active)openOrder(t.id)}} disabled={!t.active}>
     <span className="sc-table-icon">{section==="bar"?<GlassWater size={22}/>:<Table2 size={22}/>}</span><strong>{t.label}</strong><small>{!t.active?"Indisponível":order?orderLabel[order.state]:"Livre"}</small>{order&&<b>{money(serviceOrderTotal(order))}</b>}</button>})}</div>}
   </section>
   <section className="sc-panel sc-order-panel"><div className="sc-panel-heading"><div><h2>Comanda seleccionada</h2><p>Produtos, quantidades e andamento do pedido</p></div></div>
    {!activeOrder?<Empty icon={ClipboardList} title="Seleccione uma comanda" description="Clique numa mesa ocupada para consultar ou actualizar o pedido."/>:<>
     <div className="sc-current-order"><div><small>{tables.find(t=>t.id===activeOrder.tableId)?.label}</small><strong>{activeOrder.id}</strong></div><span className={"sc-status "+(activeOrder.state==="servida"?"ok":activeOrder.state==="pronta"?"warning":"muted")}>{orderLabel[activeOrder.state]}</span></div>
     {activeOrder.state==="aberta"&&<form className="sc-order-add" onSubmit={onAddOrderItem}><Field label="Produto"><select value={orderProduct} onChange={e=>setOrderProduct(e.target.value)}>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.price)} · disp. {Math.max(0,p.stock-reservedQty(data,p.id,activeOrder.id)- (activeOrder.items.find(i=>i.productId===p.id)?.qty??0))}</option>)}</select></Field><Field label="Quantidade"><input type="number" min="1" step="1" value={orderQty} onChange={e=>setOrderQty(e.target.value)}/></Field><button className="sc-primary" disabled={!activeProducts.length}><Plus size={16}/> Adicionar</button></form>}
     {activeOrder.items.length===0?<SectionMessage>A comanda ainda não tem artigos.</SectionMessage>:<div className="sc-order-items">{activeOrder.items.map(item=><div key={item.productId}><div><b>{findName(data.products,item.productId)}</b><small>{item.qty} × {money(item.unitPrice)}</small></div><strong>{money(item.qty*item.unitPrice)}</strong>{activeOrder.state==="aberta"&&<button title="Retirar artigo" aria-label={"Retirar "+findName(data.products,item.productId)} onClick={()=>onRemoveItem(activeOrder.id,item.productId)}><Trash2 size={16}/></button>}</div>)}</div>}
     <div className="sc-order-total"><span>Total da comanda</span><strong>{money(serviceOrderTotal(activeOrder))}</strong></div>
     {activeOrder.state==="servida"&&<Method value={orderMethod} onChange={setOrderMethod}/>}
     <div className="sc-order-footer">
      {nextLabel[activeOrder.state]&&<button className="sc-primary" onClick={()=>onAdvance(activeOrder.id)} disabled={!activeOrder.items.length}><Check size={16}/>{nextLabel[activeOrder.state]}</button>}
      {activeOrder.state==="servida"&&<button className="sc-primary" onClick={()=>onFinish(activeOrder.id)}><Wallet size={16}/> Registar pagamento</button>}
      {activeOrder.state==="aberta"&&<button className="sc-danger" onClick={()=>onCancel(activeOrder.id)}>Anular comanda</button>}
     </div></>}
   </section>
  </div>
  <section className="sc-panel sc-later"><div className="sc-panel-heading"><div><h2>Comandas do {section==="bar"?"bar":"restaurante"}</h2><p>Estados e histórico de atendimento</p></div><label className="sc-search"><Search size={17}/><input value={query} aria-label="Pesquisar comandas" onChange={e=>setQuery(e.target.value)} placeholder="Mesa ou referência"/></label></div>
  {displayedOrders.length===0?<Empty icon={ClipboardList} title="Sem comandas" description="Abra uma comanda numa mesa para iniciar o serviço."/>:<div className="sc-scroll"><table className="sc-table"><thead><tr><th>Referência</th><th>Mesa</th><th>Última alteração</th><th>Artigos</th><th>Valor</th><th>Estado</th><th>Acção</th></tr></thead><tbody>{displayedOrders.map(o=><tr key={o.id}><td><strong>{o.id}</strong></td><td>{tables.find(t=>t.id===o.tableId)?.label??"—"}</td><td>{timestamp(o.updatedAt)}</td><td>{o.items.reduce((n,i)=>n+i.qty,0)}</td><td>{money(serviceOrderTotal(o))}</td><td><span className={"sc-status "+(o.state==="fechada"?"ok":o.state==="anulada"?"danger":"muted")}>{orderLabel[o.state]}</span></td><td>{o.state!=="fechada"&&o.state!=="anulada"?<button className="sc-inline-link" onClick={()=>assignOrder(o.id)}>Abrir</button>:"—"}</td></tr>)}</tbody></table></div>}
  </section>
 </>}
 {section==="talho"&&<>
  <Title eyebrow="GESTÃO POR PESO" name="Talhos e cortes" sub="Registe a transformação de carne, as quebras e as vendas por quilo.">
   <button className="sc-outline" onClick={openBatch} disabled={kgProducts.length<2}><Beef size={17}/> Registar corte</button>
   <button className="sc-primary" onClick={openWeighted} disabled={!kgProducts.length}><Plus size={17}/> Venda por peso</button>
  </Title>
  <Hint warning>Os pesos são introduzidos manualmente em kg, até três casas decimais. Ainda não existem balanças ligadas, pesagem certificada, rastreio sanitário ou documentação fiscal. A quebra é calculada pela diferença entre matéria-prima e cortes.</Hint>
  <div className="sc-stats">
   <Stat title="Produtos em kg" value={String(kgProducts.length)} info="Unidade de medida kg" icon={Beef}/>
   <Stat title="Cortes registados" value={String(data.butcherBatches.length)} info="Transformações realizadas" icon={Layers}/>
   <Stat title="Peso transformado" value={three(data.butcherBatches.reduce((n,b)=>n+b.sourceQty,0)).toLocaleString("pt-MZ")+" kg"} info="Peso das matérias-primas" icon={Package}/>
   <Stat title="Quebras registadas" value={three(data.butcherBatches.reduce((n,b)=>n+b.wasteQty,0)).toLocaleString("pt-MZ")+" kg"} info="Diferenças declaradas" icon={AlertTriangle}/>
  </div>
  {kgProducts.length<2&&<div className="sc-hint"><Info size={18}/><span>Para simular a transformação, crie pelo menos dois produtos activos com unidade <b>kg</b> em «Produtos e stock», como «Carne em peça» e «Bifes». <button className="sc-inline-link" onClick={()=>go("products")}>Ir para produtos <ArrowRight size={15}/></button></span></div>}
  <section className="sc-panel"><div className="sc-panel-heading"><div><h2>Produtos vendidos por peso</h2><p>Preços e saldos em quilogramas</p></div><button className="sc-outline" onClick={()=>go("products")}><Package size={16}/> Gerir catálogo</button></div>
  {kgProducts.length===0?<Empty icon={Beef} title="Sem produtos em kg" description="Adicione produtos com unidade kg para começar a vender por peso."/>:<div className="sc-scroll"><table className="sc-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço por kg</th><th>Stock em kg</th><th>Acção</th></tr></thead><tbody>{kgProducts.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.category}</td><td>{money(p.price)}</td><td>{three(p.stock).toLocaleString("pt-MZ")}</td><td><button className="sc-inline-link" disabled={p.stock<=0} onClick={()=>{openWeighted();setWeightProduct(p.id)}}>Vender por peso</button></td></tr>)}</tbody></table></div>}</section>
  <section className="sc-panel sc-later"><div className="sc-panel-heading"><div><h2>Transformações e quebras</h2><p>Histórico dos cortes e dos pesos produzidos</p></div></div>
  {data.butcherBatches.length===0?<Empty icon={Layers} title="Ainda não há transformações" description="Registe a entrada de uma matéria-prima e a produção dos cortes associados."/>:<div className="sc-scroll"><table className="sc-table"><thead><tr><th>Data</th><th>Referência</th><th>Matéria-prima</th><th>Peso utilizado</th><th>Cortes resultantes</th><th>Quebra</th></tr></thead><tbody>{data.butcherBatches.map(b=><tr key={b.id}><td>{timestamp(b.createdAt)}</td><td><strong>{b.id}</strong></td><td>{findName(data.products,b.sourceProductId)}</td><td>{b.sourceQty} kg</td><td>{b.outputs.map(o=>findName(data.products,o.productId)+" ("+o.qty+" kg)").join("; ")}</td><td>{b.wasteQty} kg</td></tr>)}</tbody></table></div>}</section>
  <section className="sc-panel sc-later"><div className="sc-panel-heading"><div><h2>Vendas por peso</h2><p>Operações simuladas associadas ao stock</p></div></div>{data.sales.filter(s=>s.source==="talho").length===0?<Empty icon={Receipt} title="Sem vendas por peso" description="Registe uma venda por quilo para ver o histórico."/>:<div className="sc-scroll"><table className="sc-table"><thead><tr><th>Data</th><th>Produto</th><th>Peso</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>{data.sales.filter(s=>s.source==="talho").map(s=><tr key={s.id}><td>{timestamp(s.createdAt)}</td><td><strong>{s.items[0]?.name}</strong></td><td>{s.items[0]?.qty} kg</td><td>{money(s.total)}</td><td>{s.method==="fiado"?"Fiado":paymentLabel[s.method]}</td></tr>)}</tbody></table></div>}</section>
 </>}
 {dialog==="lot"&&<Modal title="Receber lote da farmácia" onClose={close} error={error}><form className="sc-form" onSubmit={onCreateLot}>
  <Field label="Produto"><select required value={lotProduct} onChange={e=>setLotProduct(e.target.value)}>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></Field>
  <Field label="Número do lote"><input required minLength={2} value={lotNumber} onChange={e=>setLotNumber(e.target.value)} placeholder="Ex.: LOTE-2027-01"/></Field>
  <div className="sc-form-grid"><Field label="Validade"><input type="date" min={today} required value={lotExpiry} onChange={e=>setLotExpiry(e.target.value)}/></Field><Field label="Unidades recebidas"><input type="number" min="1" step="1" required value={lotQty} onChange={e=>setLotQty(e.target.value)}/></Field></div>
  <Field label="Observação (opcional)"><input value={lotNote} onChange={e=>setLotNote(e.target.value)} placeholder="Ex.: Conferência de recepção"/></Field><SectionMessage>A recepção adiciona estas unidades ao stock global do produto.</SectionMessage><div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Receber lote</button></div>
 </form></Modal>}
 {dialog==="dispense"&&<Modal title="Dispensa demonstrativa por lote" onClose={close} error={error}><form className="sc-form" onSubmit={onDispense}>
  <Field label="Produto com lote"><select required value={dispenseProduct} onChange={e=>setDispenseProduct(e.target.value)}>{pharmaProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></Field>
  <Field label="Quantidade (unidades)"><input type="number" min="1" max={currentAvailable} step="1" required value={dispenseQty} onChange={e=>setDispenseQty(e.target.value)}/></Field>
  <div className="sc-preview"><span>Unidades em lotes válidos: <b>{currentAvailable}</b></span><span>Preço unitário: <b>{money(chosenProduct?.price??0)}</b></span><span>Total estimado: <strong>{money((Number(dispenseQty)||0)*(chosenProduct?.price??0))}</strong></span></div>
  <Method value={dispenseMethod} onChange={setDispenseMethod}/><Field label="Nota interna (opcional)"><input value={dispenseNote} onChange={e=>setDispenseNote(e.target.value)}/></Field>
  <SectionMessage>A dispensa utiliza automaticamente os lotes com a data de validade mais próxima (FEFO) e bloqueia lotes vencidos. Sem verificação de receita ou pagamento real.</SectionMessage>
  <div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Registar dispensa</button></div>
 </form></Modal>}
 {dialog==="table"&&<Modal title={section==="bar"?"Registar mesa do bar":"Registar mesa do restaurante"} onClose={close} error={error}><form className="sc-form" onSubmit={onNewTable}><Field label="Identificação da mesa"><input required minLength={2} value={tableLabel} onChange={e=>setTableLabel(e.target.value)} placeholder="Ex.: Mesa 01 / Balcão 1"/></Field><div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Guardar mesa</button></div></form></Modal>}
 {dialog==="order"&&<Modal title="Abrir nova comanda" onClose={close} error={error}><form className="sc-form" onSubmit={onNewOrder}><Field label="Mesa livre"><select required value={tableId} onChange={e=>setTableId(e.target.value)}>{tables.filter(t=>t.active&&!opened.some(o=>o.tableId===t.id)).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field><Field label="Observações (opcional)"><textarea rows={2} value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Ex.: Sem picante, mesa exterior"/></Field><SectionMessage>Após criar a comanda, seleccione os artigos na ficha da mesa.</SectionMessage><div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Abrir comanda</button></div></form></Modal>}
 {dialog==="batch"&&<Modal title="Registar corte / transformação" onClose={close} error={error} wide><form className="sc-form" onSubmit={onBatch}>
  <div className="sc-form-grid"><Field label="Matéria-prima em kg"><select required value={sourceProduct} onChange={e=>{setSourceProduct(e.target.value);setOutputs(x=>x.map(o=>o.productId===e.target.value?{...o,productId:""}:o))}}>{kgProducts.map(p=><option key={p.id} value={p.id}>{p.name} · stock {p.stock} kg</option>)}</select></Field><Field label="Peso utilizado (kg)"><input required min=".001" step=".001" type="number" value={sourceKg} onChange={e=>setSourceKg(e.target.value)}/></Field></div>
  <h3 className="sc-form-heading">Cortes produzidos</h3><div className="sc-batch-rows">{outputs.map((o,index)=><div className="sc-batch-row" key={index}><Field label="Produto resultante"><select required value={o.productId} onChange={e=>setOutputs(xs=>xs.map((x,i)=>i===index?{...x,productId:e.target.value}:x))}><option value="">Seleccione</option>{kgProducts.filter(p=>p.id!==sourceProduct).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Peso (kg)"><input type="number" min=".001" step=".001" value={o.qty} required onChange={e=>setOutputs(xs=>xs.map((x,i)=>i===index?{...x,qty:e.target.value}:x))}/></Field><button title="Remover corte" aria-label={"Remover corte "+(index+1)} type="button" disabled={outputs.length===1} onClick={()=>setOutputs(xs=>xs.filter((_,i)=>i!==index))}><X size={18}/></button></div>)}</div>
  <button type="button" className="sc-inline-link" disabled={outputs.length>=kgProducts.length-1} onClick={()=>setOutputs(xs=>[...xs,{productId:"",qty:""}])}><Plus size={16}/> Adicionar corte</button>
  <div className="sc-preview"><span>Total produzido: <b>{three(outputs.reduce((n,o)=>n+(moneyNumber(o.qty)||0),0)).toLocaleString("pt-MZ")} kg</b></span><span>Quebra prevista: <strong>{three((moneyNumber(sourceKg)||0)-outputs.reduce((n,o)=>n+(moneyNumber(o.qty)||0),0)).toLocaleString("pt-MZ")} kg</strong></span></div>
  <Field label="Motivo / referência"><input value={batchNote} onChange={e=>setBatchNote(e.target.value)} required minLength={3} placeholder="Ex.: Desmanche da peça 01"/></Field><div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Registar transformação</button></div>
 </form></Modal>}
 {dialog==="weighted"&&<Modal title="Venda por peso (kg)" onClose={close} error={error}><form className="sc-form" onSubmit={onWeighted}>
  <Field label="Produto"><select value={weightProduct} onChange={e=>setWeightProduct(e.target.value)} required>{kgProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.price)}/kg</option>)}</select></Field>
  <Field label="Peso vendido (kg)"><input type="number" min=".001" step=".001" required value={weightQty} onChange={e=>setWeightQty(e.target.value)} placeholder="Ex.: 1.250"/></Field>
  <div className="sc-preview"><span>Disponível: <b>{weightChosen?.stock??0} kg</b></span><span>Total previsto: <strong>{saleTotal}</strong></span></div>
  <Method value={weightMethod} onChange={setWeightMethod}/><SectionMessage>Se escolher dinheiro, abra primeiro o caixa. A pesagem e o recebimento são simulados.</SectionMessage>
  <div className="sc-form-actions"><button type="button" className="sc-outline" onClick={close}>Cancelar</button><button className="sc-primary">Registar venda</button></div>
 </form></Modal>}
 </section>;
}
