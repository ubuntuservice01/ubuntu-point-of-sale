import "../styles/ubuntu-live.css";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {supabaseAdminConfig} from "../lib/supabase-admin-auth";
type Sector="farmacia"|"talho"|"restaurante"|"bar"|"padaria"|"grossista"|"loja";
type Tenant={id:string;name:string;slug:string;sector:Sector;city:string;status:string;license_expires_at:string};
type Plan={code:string;name:string};
const groups:{id:Sector;label:string}[]=[{id:"farmacia",label:"Farmácias"},{id:"talho",label:"Talhos"},{id:"restaurante",label:"Restaurantes"},{id:"bar",label:"Bares"},{id:"padaria",label:"Padarias"},{id:"grossista",label:"Grossistas"},{id:"loja",label:"Lojas"}];
const empty=(sector:Sector)=>({name:"",slug:"",sector,city:"",province:"",nuit:"",phone:"",email:"",admin_name:"",admin_email:"",plan_code:"piloto"});
const slugify=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
async function api<T>(token:string,path:string,options?:RequestInit):Promise<T>{
 const cfg=supabaseAdminConfig();if(!cfg)throw new Error("Configuração do Supabase em falta.");
 let response:Response;
 try{
  response=await fetch(cfg.url+path,{...options,headers:{"apikey":cfg.key,"Authorization":"Bearer "+token,"Content-Type":"application/json",...options?.headers}});
 }catch{
  throw new Error("Não foi possível concluir a comunicação com o Supabase. Confirme a ligação à Internet, desactive temporariamente bloqueadores para esta aplicação e volte a tentar.");
 }
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(json.error||json.message||"O servidor não conseguiu processar o pedido.");
 return json as T;
}
export function SuperAdminLive({token}:{token:string}){
 const [companies,setCompanies]=useState<Tenant[]>([]);
 const [plans,setPlans]=useState<Plan[]>([]);
 const [sector,setSector]=useState<Sector|"todos">("todos");
 const [filter,setFilter]=useState("");
 const [form,setForm]=useState(empty("talho"));
 const [creating,setCreating]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   // Endpoint único com CORS explícito. O servidor verifica o perfil do Super Admin
   // antes de consultar os dados; evita que a interface confunda falhas de rede com lista vazia.
   const response=await api<{companies:Tenant[];plans:Plan[]}>(
    token,"/functions/v1/admin-dashboard",{method:"POST",body:JSON.stringify({})}
   );
   if(!Array.isArray(response.companies)||!Array.isArray(response.plans)){
    throw new Error("O servidor devolveu dados incompletos. Tente actualizar.");
   }
   setCompanies(response.companies);setPlans(response.plans);setLoaded(true);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar as empresas.");}
  finally{setLoading(false);}
 },[token]);
 useEffect(()=>{void refresh()},[refresh]);
 const selected=useMemo(()=>companies.filter(c=>(sector==="todos"||c.sector===sector)&&
  (c.name+" "+c.city+" "+c.slug).toLowerCase().includes(filter.toLowerCase())),[companies,sector,filter]);
 const start=(kind:Sector)=>{setForm(empty(kind));setCreating(true);setError("");setSuccess("");};
 const field=(key:keyof ReturnType<typeof empty>,value:string)=>setForm(prev=>({...prev,[key]:value}));
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy)return;setBusy(true);setError("");
  try{
   const answer=await api<{slug:string;admin_email:string}>(token,"/functions/v1/create-tenant-admin",{method:"POST",body:JSON.stringify(form)});
   setSuccess("Empresa "+answer.slug+" criada. Convite enviado para "+answer.admin_email+".");
   setSector(form.sector);setCreating(false);await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível criar a empresa.");}
  finally{setBusy(false);}
 };
 return <section className="ubuntu-live" style={{padding:24,maxWidth:1240,margin:"auto",color:"#163342"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"center"}}>
   <div><small>UBUNTU SERVICE · GESTÃO REAL</small><h1>Empresas por sector</h1><p>Registos e licenças guardados no Supabase.</p></div>
   <button type="button" onClick={()=>start(sector==="todos"?"talho":sector)} disabled={!loaded||plans.length===0||loading}>+ Criar empresa</button>
  </header>
  <div role="note" style={{padding:12,background:"#fff4cf",borderRadius:12,margin:"16px 0"}}>A criação de empresas e os convites são reais. O POS dos comerciantes continua em integração e ainda não deve receber vendas reais.</div>
  {success&&<p role="status" style={{color:"#116d49"}}>{success}</p>}
  {error&&<div role="alert" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12,margin:"13px 0",color:"#a52b2b",background:"#fff3f0",padding:13,borderRadius:10}}>
   <span>{error}</span><button type="button" onClick={()=>void refresh()} disabled={loading}>Tentar novamente</button>
  </div>}
  <nav aria-label="Sectores" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
   <button aria-pressed={sector==="todos"} onClick={()=>setSector("todos")}>Todas ({companies.length})</button>
   {groups.map(g=><button key={g.id} aria-pressed={sector===g.id} onClick={()=>setSector(g.id)}>{g.label} ({companies.filter(c=>c.sector===g.id).length})</button>)}
  </nav>
  <label>Pesquisar empresas <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nome ou localidade"/></label>
  {loading?<p role="status">A carregar empresas do Supabase...</p>:!loaded?
   <p role="status" style={{padding:28,background:"#fff5e9",borderRadius:12}}>A lista ainda não pôde ser carregada. Clique em «Tentar novamente».</p>:selected.length===0?<p style={{padding:28,background:"white",borderRadius:12}}>Ainda não há empresas nesta categoria. Clique em «Criar empresa» para começar.</p>:
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12,marginTop:18}}>
    {selected.map(c=><article key={c.id} style={{background:"white",border:"1px solid #d6e4e9",borderRadius:12,padding:16}}>
     <small>{groups.find(g=>g.id===c.sector)?.label} · {c.city}</small><h2>{c.name}</h2>
     <p>{c.status==="trial"?"Em teste":c.status==="active"?"Activa":"Suspensa"} · até {c.license_expires_at}</p><small>{c.slug}</small>
    </article>)}
   </div>}
  {creating&&<div style={{position:"fixed",inset:0,background:"#101d2fc9",display:"grid",placeItems:"center",zIndex:1000,padding:12}}>
   <section role="dialog" aria-modal="true" aria-label="Criar empresa" style={{background:"white",padding:24,borderRadius:16,maxWidth:720,width:"100%",maxHeight:"90vh",overflow:"auto"}}>
    <h2>Criar {groups.find(g=>g.id===form.sector)?.label.toLowerCase()}</h2><p>O administrador receberá um convite para definir as suas credenciais.</p>
    <form onSubmit={submit} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
     <label>Sector<select value={form.sector} onChange={e=>field("sector",e.target.value)}>{groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
     <label>Nome da empresa<input required minLength={3} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value,slug:slugify(e.target.value)}))}/></label>
     <label>Identificador<input required value={form.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e=>field("slug",slugify(e.target.value))}/></label>
     <label>Cidade<input value={form.city} onChange={e=>field("city",e.target.value)}/></label>
     <label>Província<input value={form.province} onChange={e=>field("province",e.target.value)}/></label>
     <label>NUIT<input value={form.nuit} onChange={e=>field("nuit",e.target.value)}/></label>
     <label>Telefone<input value={form.phone} onChange={e=>field("phone",e.target.value)}/></label>
     <label>Email comercial<input type="email" value={form.email} onChange={e=>field("email",e.target.value)}/></label>
     <label>Nome do administrador<input required minLength={2} value={form.admin_name} onChange={e=>field("admin_name",e.target.value)}/></label>
     <label>Email do administrador<input required type="email" value={form.admin_email} onChange={e=>field("admin_email",e.target.value)}/></label>
     <label>Plano<select value={form.plan_code} onChange={e=>field("plan_code",e.target.value)}>{plans.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
     <div style={{gridColumn:"1/-1",display:"flex",gap:10,justifyContent:"flex-end"}}>
      <button type="button" onClick={()=>setCreating(false)} disabled={busy}>Cancelar</button>
      <button type="submit" disabled={busy||plans.length===0}>{busy?"A criar...":"Criar e enviar convite"}</button>
     </div>
    </form>
   </section></div>}
 </section>;
}
