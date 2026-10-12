import {useEffect,useState,type FormEvent} from "react";
import {companyApi,type CompanyMember} from "../lib/supabase-company-auth";
type Tenant={id:string;name:string;sector:string;city:string;status:string;license_expires_at:string};
type Branch={id:string;name:string;code:string};
type Role="manager"|"supervisor"|"cashier"|"stock";
const roleLabels:Record<string,string>={company_admin:"Administrador da empresa",manager:"Gerente",supervisor:"Supervisor",cashier:"Operador de caixa",stock:"Responsável de stock"};
export function CompanyLive({token,tenantId}:{token:string;tenantId:string}){
 const [tenant,setTenant]=useState<Tenant|null>(null);
 const [employees,setEmployees]=useState<CompanyMember[]>([]);
 const [branches,setBranches]=useState<Branch[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [open,setOpen]=useState(false);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [role,setRole]=useState<Role>("cashier");
 const [branch,setBranch]=useState("");
 const refresh=async()=>{
  setLoading(true);
  try{
   const [companies,members,locations]=await Promise.all([
    companyApi<Tenant[]>("/rest/v1/tenants?select=id,name,sector,city,status,license_expires_at&id=eq."+tenantId,token),
    companyApi<CompanyMember[]>("/rest/v1/tenant_memberships?select=id,tenant_id,user_id,display_name,email,role,active&tenant_id=eq."+tenantId+"&order=display_name",token),
    companyApi<Branch[]>("/rest/v1/branches?select=id,name,code&tenant_id=eq."+tenantId,token)
   ]);
   setTenant(companies[0]??null);setEmployees(members);setBranches(locations);setBranch(current=>current||locations[0]?.id||"");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os dados.");}
  finally{setLoading(false);}
 };
 useEffect(()=>{void refresh();},[token,tenantId]);
 const invite=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await companyApi("/functions/v1/invite-tenant-operator",token,{method:"POST",body:JSON.stringify({
    tenant_id:tenantId,display_name:name.trim(),email:email.trim(),role,branch_id:branch
   })});
   setNotice("Convite enviado para "+email.trim()+". O funcionário deverá definir a sua palavra-passe.");
   setOpen(false);setName("");setEmail("");await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar o convite.");}
  finally{setBusy(false);}
 };
 return <main style={{maxWidth:1100,margin:"auto",padding:24,color:"#193846"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",flexWrap:"wrap"}}>
   <div><small>UBUNTU POS 360 · A MINHA EMPRESA</small><h1>{tenant?.name??"Painel empresarial"}</h1>
    <p>{tenant?.sector} · {tenant?.city} · {tenant?.status==="trial"?"Em teste":"Licença "+(tenant?.status??"")}</p></div>
   <button type="button" onClick={()=>setOpen(true)} disabled={!tenant}>+ Convidar funcionário</button>
  </header>
  <p style={{background:"#fff4cf",padding:14,borderRadius:12}}>Área empresarial em integração. Os utilizadores abaixo pertencem ao Supabase; o POS, stocks e vendas ainda estão em demonstração.</p>
  {notice&&<p role="status" style={{color:"#087b55"}}>{notice}</p>}
  {error&&<p role="alert" style={{color:"#be3232"}}>{error}</p>}
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,margin:"20px 0"}}>
   <article style={{background:"white",borderRadius:12,padding:18}}><small>Colaboradores</small><h2>{employees.length}</h2></article>
   <article style={{background:"white",borderRadius:12,padding:18}}><small>Filiais</small><h2>{branches.length}</h2></article>
   <article style={{background:"white",borderRadius:12,padding:18}}><small>Validade da licença</small><h2>{tenant?.license_expires_at??"—"}</h2></article>
  </section>
  <section style={{background:"white",padding:20,borderRadius:14}}>
   <h2>A minha equipa</h2><p>O administrador pode convidar gerentes, supervisores, operadores de caixa e responsáveis de stock.</p>
   {loading?<p>A carregar equipa...</p>:employees.length===0?<p>Ainda não existem funcionários.</p>:
    <div style={{display:"grid",gap:10}}>{employees.map(e=><article key={e.id} style={{display:"flex",justifyContent:"space-between",gap:16,borderBottom:"1px solid #e5ebef",padding:"12px 0"}}>
     <span><strong>{e.display_name}</strong><small style={{display:"block"}}>{e.email}</small></span>
     <span>{roleLabels[e.role]||e.role} · {e.active?"Activo":"Desactivado"}</span>
    </article>)}</div>}
  </section>
  {open&&<div style={{position:"fixed",inset:0,display:"grid",placeItems:"center",background:"#0c203cbf",padding:16,zIndex:1000}}>
   <section role="dialog" aria-modal="true" aria-label="Convidar funcionário" style={{width:"min(480px,100%)",background:"white",padding:24,borderRadius:14}}>
    <h2>Novo funcionário</h2><p>Enviaremos um convite individual, sem partilhar palavras-passe.</p>
    <form onSubmit={invite} style={{display:"grid",gap:14}}>
     <label>Nome completo<input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label>Função<select value={role} onChange={e=>setRole(e.target.value as Role)}>{(Object.keys(roleLabels) as Role[]).filter(r=>r!=="company_admin").map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></label>
     <label>Filial<select required value={branch} onChange={e=>setBranch(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
     <div style={{display:"flex",justifyContent:"flex-end",gap:12}}>
      <button type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button>
      <button type="submit" disabled={busy||!branch}>{busy?"A enviar...":"Enviar convite"}</button>
     </div>
    </form>
   </section>
  </div>}
 </main>;
}
