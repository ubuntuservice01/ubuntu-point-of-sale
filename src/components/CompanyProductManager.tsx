import "../styles/ubuntu-live.css";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {companyApi} from "../lib/supabase-company-auth";
type Branch={id:string;name:string;code:string};
type Product={id:string;tenant_id:string;branch_id:string;name:string;sku:string|null;unit:"un"|"kg"|"l";price_mzn:number;stock_qty:number;active:boolean};
const val=(v:string)=>Number(v.replace(",","."));
const fmt=(v:number)=>new Intl.NumberFormat("pt-MZ",{style:"currency",currency:"MZN"}).format(v);
export function CompanyProductManager({token,tenantId,canEdit}:{token:string;tenantId:string;canEdit:boolean}){
 const [branches,setBranches]=useState<Branch[]>([]);
 const [branch,setBranch]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [name,setName]=useState("");
 const [sku,setSku]=useState("");
 const [unit,setUnit]=useState<"un"|"kg"|"l">("un");
 const [price,setPrice]=useState("");
 const [stock,setStock]=useState("0");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const b=await companyApi<Branch[]>("/rest/v1/branches?select=id,name,code&tenant_id=eq."+tenantId+"&active=eq.true",token);
   setBranches(b);
   setBranch(prev=>b.some(x=>x.id===prev)?prev:(b[0]?.id??""));
  }catch(e){setError(e instanceof Error?e.message:"Erro ao carregar filiais.");}
  finally{setLoading(false)}
 },[token,tenantId]);
 useEffect(()=>{void load()},[load]);
 const reload=useCallback(async()=>{
  if(!branch){setProducts([]);return}
  try{setProducts(await companyApi<Product[]>("/rest/v1/pos_products?select=id,tenant_id,branch_id,name,sku,unit,price_mzn,stock_qty,active&tenant_id=eq."+tenantId+"&branch_id=eq."+branch+"&order=name.asc",token));}
  catch(e){setError(e instanceof Error?e.message:"Erro ao carregar produtos.");}
 },[branch,tenantId,token]);
 useEffect(()=>{void reload()},[reload]);
 const create=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!canEdit||busy||!branch)return;
  const p=val(price),q=val(stock);
  if(!Number.isFinite(p)||p<0||!Number.isFinite(q)||q<0||(!Number.isInteger(q)&&unit==="un")){setError("Verifique o preço e o stock.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   await companyApi("/rest/v1/pos_products",token,{method:"POST",headers:{"Prefer":"return=minimal"},
    body:JSON.stringify({tenant_id:tenantId,branch_id:branch,name:name.trim(),sku:sku.trim()||null,unit,price_mzn:p,stock_qty:q})});
   setName("");setSku("");setPrice("");setStock("0");setNotice("Produto registado no Supabase.");await reload();
  }catch(err){setError(err instanceof Error?err.message:"Falha ao guardar produto.");}
  finally{setBusy(false);}
 };
 return <section className="ubuntu-company" style={{background:"white",borderRadius:14,padding:20,marginTop:20}}>
  <h2>Produtos e stock da filial</h2>
  <label>Filial<select value={branch} onChange={e=>setBranch(e.target.value)} disabled={loading}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
  {error&&<p role="alert" style={{color:"#b52b2b"}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#137650"}}>{notice}</p>}
  {canEdit&&<form onSubmit={create} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:12,alignItems:"end",margin:"20px 0"}}>
   <label>Nome<input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Código (opcional)<input value={sku} onChange={e=>setSku(e.target.value)}/></label>
   <label>Unidade<select value={unit} onChange={e=>setUnit(e.target.value as "un"|"kg"|"l")}><option value="un">Unidades</option><option value="kg">Kg</option><option value="l">Litros</option></select></label>
   <label>Preço MZN<input required type="number" step="0.01" min="0" value={price} onChange={e=>setPrice(e.target.value)}/></label>
   <label>Stock inicial<input required type="number" min="0" step={unit==="un"?"1":"0.001"} value={stock} onChange={e=>setStock(e.target.value)}/></label>
   <button type="submit" disabled={busy||!branch}>{busy?"A guardar...":"Adicionar produto"}</button>
  </form>}
  {products.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
   <thead><tr><th style={{textAlign:"left",padding:10}}>Produto</th><th>Preço</th><th>Stock</th><th>Estado</th></tr></thead>
   <tbody>{products.map(p=><tr key={p.id} style={{borderTop:"1px solid #edf2f2"}}><td style={{padding:10}}>{p.name}</td><td>{fmt(Number(p.price_mzn))}</td><td>{p.stock_qty} {p.unit}</td><td>{p.active?"Activo":"Inactivo"}</td></tr>)}</tbody>
  </table></div>:<p>Sem produtos nesta filial. {canEdit?"Adicione o primeiro produto acima.":""}</p>}
 </section>;
}
