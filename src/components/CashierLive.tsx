import "../styles/ubuntu-live.css";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {companyApi} from "../lib/supabase-company-auth";
type Product={id:string;name:string;unit:"un"|"kg"|"l";price_mzn:number;stock_qty:number;active:boolean};
type Branch={id:string;name:string;code:string};
type CashSession={id:string;opening_float_mzn:number;opened_at:string};
type CashResult={sale_id:string;total_mzn:number;change_mzn:number;duplicate:boolean};
type CartItem={id:string;qty:number};
const money=(v:number)=>new Intl.NumberFormat("pt-MZ",{style:"currency",currency:"MZN"}).format(v);
const num=(v:string)=>Number(v.replace(",","."));
export function CashierLive({token,tenantId,membershipId,userId,role}:{token:string;tenantId:string;membershipId:string;userId:string;role:string}){
 const [branches,setBranches]=useState<Branch[]>([]);
 const [branch,setBranch]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [session,setSession]=useState<CashSession|null>(null);
 const [cart,setCart]=useState<CartItem[]>([]);
 const [opening,setOpening]=useState("0");
 const [received,setReceived]=useState("");
 const [actual,setActual]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const requestId=useRef<string|null>(null);
 const [receipt,setReceipt]=useState<CashResult|null>(null);
 const canSell=["cashier","manager","supervisor","company_admin"].includes(role);
 const loadBranches=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [grants,available]=await Promise.all([
    companyApi<{branch_id:string}[]>("/rest/v1/membership_branches?select=branch_id&membership_id=eq."+membershipId,token),
    companyApi<Branch[]>("/rest/v1/branches?select=id,name,code&tenant_id=eq."+tenantId+"&active=eq.true",token)
   ]);
   const allowed=new Set(grants.map(g=>g.branch_id));
   const scoped=role==="company_admin"?available:available.filter(b=>allowed.has(b.id));
   setBranches(scoped);setBranch(previous=>scoped.some(b=>b.id===previous)?previous:(scoped[0]?.id??""));
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar as filiais.");}
  finally{setLoading(false);}
 },[token,tenantId,membershipId,role]);
 useEffect(()=>{void loadBranches()},[loadBranches]);
 const refresh=useCallback(async()=>{
  if(!branch){setProducts([]);setSession(null);return;}
  try{
   const [items,sessions]=await Promise.all([
    companyApi<Product[]>("/rest/v1/pos_products?select=id,name,unit,price_mzn,stock_qty,active&tenant_id=eq."+tenantId+"&branch_id=eq."+branch+"&active=eq.true&order=name.asc",token),
    companyApi<CashSession[]>("/rest/v1/pos_cash_sessions?select=id,opening_float_mzn,opened_at&tenant_id=eq."+tenantId+"&branch_id=eq."+branch+"&opened_by=eq."+userId+"&closed_at=is.null&limit=1",token)
   ]);
   setProducts(items);setSession(sessions[0]??null);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar o caixa.");}
 },[branch,tenantId,token,userId]);
 useEffect(()=>{setCart([]);setReceipt(null);requestId.current=null;void refresh()},[refresh]);
 const available=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products]);
 const total=useMemo(()=>Math.round(cart.reduce((sum,row)=>sum+(available.get(row.id)?.price_mzn??0)*row.qty,0)*100)/100,[cart,available]);
 const change=Math.round((num(received)-total)*100)/100;
 const post=async(action:string,values:Record<string,unknown>)=>{
  const response=await companyApi<{ok:boolean;data:unknown}>("/functions/v1/pos-cash",token,{method:"POST",body:JSON.stringify({action,tenant_id:tenantId,branch_id:branch,...values})});
  return response.data;
 };
 const add=(p:Product)=>{
  if(!session||!canSell)return;
  setCart(old=>{const prev=old.find(row=>row.id===p.id);const next=(prev?.qty??0)+1;
   if(next>Number(p.stock_qty))return old;
   return prev?old.map(row=>row.id===p.id?{...row,qty:next}:row):[...old,{id:p.id,qty:1}];});
  requestId.current=null;setReceipt(null);
 };
 const quantity=(p:Product,value:string)=>{
  const qty=num(value);
  if(!Number.isFinite(qty)||qty<0||qty>p.stock_qty||Math.round(qty*1000)/1000!==qty||p.unit==="un"&&!Number.isInteger(qty))return;
  setCart(old=>qty===0?old.filter(x=>x.id!==p.id):old.map(row=>row.id===p.id?{...row,qty}:row));
  requestId.current=null;
 };
 const openCash=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{await post("open",{opening_amount:num(opening)});setNotice("Turno de caixa aberto.");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir o caixa.");}finally{setBusy(false);}
 };
 const sell=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!session||!cart.length||busy)return;
  if(!Number.isFinite(num(received))||num(received)<total){setError("Introduza um valor recebido suficiente.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   requestId.current??=crypto.randomUUID();
   const result=await post("sale",{session_id:session.id,request_id:requestId.current,
    items:cart.map(row=>({product_id:row.id,quantity:row.qty})),received_amount:num(received)}) as CashResult;
   setReceipt(result);setNotice(result.duplicate?"Venda já registada anteriormente.":"Venda registada no Supabase.");
   setCart([]);setReceived("");requestId.current=null;await refresh();
  }catch(err){setError(err instanceof Error?err.message:"A venda falhou; não altere o carrinho antes de tentar novamente.");}
  finally{setBusy(false);}
 };
 const closeCash=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!session||busy)return;
  setBusy(true);setError("");setNotice("");
  try{const expected=await post("close",{session_id:session.id,actual_amount:num(actual)}) as number;
   setNotice("Caixa fechado. Valor esperado: "+money(Number(expected))+".");setActual("");setCart([]);await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível fechar o caixa.");}finally{setBusy(false);}
 };
 return <main className="ubuntu-company" style={{maxWidth:1150,margin:"auto",padding:24,color:"#163b41"}}>
  <header><small>UBUNTU POS 360 · PILOTO NÃO FISCAL</small><h1>Caixa e ponto de venda</h1>
   <p>Vendas reais em dinheiro registadas no Supabase da empresa e filial autorizadas. Não emite documentos fiscais.</p></header>
  <p style={{background:"#fff4d6",padding:12,borderRadius:12}}>Este POS básico está em validação. Não utilize vendas ou pagamentos comerciais até concluirmos os testes e requisitos fiscais de Moçambique.</p>
  {notice&&<p role="status" style={{color:"#056c49"}}>{notice}</p>}
  {error&&<p role="alert" style={{color:"#b42525"}}>{error}</p>}
  <label>Filial<select value={branch} disabled={loading||busy} onChange={e=>setBranch(e.target.value)}>{branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
  {!branches.length&&!loading&&<p>Nenhuma filial atribuída a este operador. Contacte o administrador da empresa.</p>}
  {branch&&(!session?<form onSubmit={openCash} style={{background:"white",padding:20,borderRadius:12,margin:"18px 0",maxWidth:470}}>
   <h2>Iniciar turno</h2><label>Fundo inicial em MZN<input type="number" step="0.01" min="0" value={opening} onChange={e=>setOpening(e.target.value)} required/></label>
   <button disabled={busy||!canSell} type="submit">{busy?"A abrir...":"Abrir caixa"}</button>
  </form>:<section style={{background:"white",borderRadius:12,padding:18,margin:"16px 0"}}>
   <h2>Caixa aberto</h2><p>Abertura: {new Date(session.opened_at).toLocaleString("pt-MZ")} · Fundo: {money(Number(session.opening_float_mzn))}</p>
   <form onSubmit={closeCash} style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"}}>
    <label>Dinheiro contado para fechar (MZN)<input min="0" type="number" step="0.01" required value={actual} onChange={e=>setActual(e.target.value)}/></label>
    <button type="submit" disabled={busy||cart.length>0}>Fechar caixa</button>
   </form>
  </section>)}
  {session&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:18}}>
   <section style={{background:"white",padding:18,borderRadius:12}}>
    <h2>Produtos disponíveis</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
     {products.map(p=><button type="button" key={p.id} disabled={busy||p.stock_qty<=0} onClick={()=>add(p)}
      style={{textAlign:"left",minHeight:95}}><strong>{p.name}</strong><span style={{display:"block"}}>{money(Number(p.price_mzn))}</span>
      <small>Stock: {p.stock_qty} {p.unit}</small></button>)}
    </div>
    {!products.length&&<p>Sem produtos. O administrador da empresa deve cadastrá-los primeiro.</p>}
   </section>
   <section style={{background:"white",padding:18,borderRadius:12}}>
    <h2>Carrinho</h2>
    {cart.map(row=>{const p=available.get(row.id);if(!p)return null;return <div key={row.id} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #e5eeee"}}>
     <div><strong>{p.name}</strong><small style={{display:"block"}}>{money(Number(p.price_mzn))}/{p.unit}</small></div>
     <input aria-label={"Quantidade de "+p.name} style={{maxWidth:88}} type="number" min="0" max={p.stock_qty}
      step={p.unit==="un"?"1":"0.001"} value={row.qty} onChange={e=>quantity(p,e.target.value)}/>
    </div>})}
    {!cart.length&&<p>Seleccione um produto para começar.</p>}
    <h2>Total: {money(total)}</h2>
    <form onSubmit={sell}>
     <label>Dinheiro recebido (MZN)<input required disabled={!cart.length||busy} type="number" min={total} step="0.01" value={received} onChange={e=>setReceived(e.target.value)}/></label>
     <p>Troco: <strong>{money(Number.isFinite(change)?Math.max(0,change):0)}</strong></p>
     <button type="submit" disabled={!cart.length||busy||!Number.isFinite(change)||change<0}>{busy?"A processar...":"Registar venda"}</button>
    </form>
    {receipt&&<p role="status" style={{marginTop:16}}>Referência: {receipt.sale_id}<br/>Total: {money(Number(receipt.total_mzn))} · Troco: {money(Number(receipt.change_mzn))}</p>}
   </section>
  </div>}
 </main>;
}
