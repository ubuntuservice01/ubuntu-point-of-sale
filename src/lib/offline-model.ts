import type {Store} from "./domain";

export const OFFLINE_DB_NAME="ubuntu-pos360-offline-v1";
export const OFFLINE_LEGACY_KEY="ubuntu-pos360-demo-v1";
export const OFFLINE_LOCAL_META_KEY="ubuntu-pos360-offline-meta-v1";
export const OFFLINE_LOCAL_JOURNAL_KEY="ubuntu-pos360-pending-ops-v1";
export const OFFLINE_SCHEMA=1;
export const JOURNALED_COLLECTIONS=[
 "products","customers","sales","credits","suppliers","purchases","supplierPayments",
 "stockMovements","returns","expenses","cashSessions","cashMovements","pharmaLots",
 "pharmaDispenses","serviceTables","serviceOrders","butcherBatches","productionRecipes",
 "productionRuns","wholesaleTiers","wholesaleOrders","onlineOrders","couriers",
 "loyaltyMovements","loyaltyRewards","catalogListings"
] as const satisfies readonly (keyof Store)[];
export const JOURNALED_SETTINGS=["catalogSettings","loyaltySettings","receiptSettings","alertSettings"] as const satisfies readonly (keyof Store)[];
export type JournalCollection=(typeof JOURNALED_COLLECTIONS)[number]|(typeof JOURNALED_SETTINGS)[number];
export type OfflineOp={
 id:string;clientId:string;collection:JournalCollection;recordId:string;action:"upsert"|"delete";
 payload:unknown;createdAt:string;status:"pending"|"conflict";attempts:number;
 baseRevision:string|null;
};
export type Snapshot={schema:number;state:Store;savedAt:string;clientId:string};
export type LocalMode="indexeddb"|"localStorage"|"memory";
export type OfflineOverview={
 mode:LocalMode;savedAt:string|null;pending:number;conflicts:number;error:string|null;serviceWorker:"unsupported"|"registering"|"ready"|"error";
};
export const startingOverview=():OfflineOverview=>({
 mode:"memory",savedAt:null,pending:0,conflicts:0,error:null,serviceWorker:"registering"
});
export function deviceId():string{
 try{
  const stored=window.localStorage.getItem(OFFLINE_LOCAL_META_KEY);
  if(stored&&/^[a-zA-Z0-9-]{8,80}$/.test(stored))return stored;
  const next=globalThis.crypto?.randomUUID?.()??("device-"+Date.now()+"-"+Math.random().toString(36).slice(2));
  window.localStorage.setItem(OFFLINE_LOCAL_META_KEY,next);
  return next;
 }catch{return globalThis.crypto?.randomUUID?.()??"memory-"+Date.now()}
}
export function newOpId():string{
 return globalThis.crypto?.randomUUID?.()??Date.now()+"-"+Math.random().toString(36).slice(2);
}
const rowId=(item:unknown):string|undefined=>{
 if(!item||typeof item!=="object")return;
 const id=(item as {id?:unknown;productId?:unknown}).id??(item as {productId?:unknown}).productId;
 return typeof id==="string"&&id.length>0?id:undefined;
};
/** 
 * Todas as colecções com ids próprios geram operações de inserção/edição/remoção.
 * O outbox usa um identificador novo por alteração lógica e preserva a ordem.
 * A última versão do registo é gravada como payload, sem supor uma revisão remota.
 */
export function changedOperations(before:Store,after:Store,clientId:string,now=new Date()):OfflineOp[]{
 const operations:OfflineOp[]=[];
 for(const collection of JOURNALED_COLLECTIONS){
  const existing=new Map((before[collection] as readonly unknown[]).map(item=>[rowId(item),item]));
  const current=new Map((after[collection] as readonly unknown[]).map(item=>[rowId(item),item]));
  for(const [id,value] of current){
   if(!id)continue;
   const prev=existing.get(id);
   if(prev!==undefined&&JSON.stringify(prev)===JSON.stringify(value))continue;
   operations.push({id:newOpId(),clientId,collection,recordId:id,
    action:"upsert",payload:value,createdAt:now.toISOString(),status:"pending",attempts:0,baseRevision:null});
  }
  for(const [id] of existing){
   if(id&&!current.has(id))operations.push({id:newOpId(),clientId,collection,recordId:id,
    action:"delete",payload:null,createdAt:now.toISOString(),status:"pending",attempts:0,baseRevision:null});
  }
 }
 for(const collection of JOURNALED_SETTINGS){
  if(JSON.stringify(before[collection])!==JSON.stringify(after[collection])){
   operations.push({id:newOpId(),clientId,collection,recordId:collection,action:"upsert",
    payload:after[collection],createdAt:now.toISOString(),status:"pending",attempts:0,baseRevision:null});
  }
 }
 return operations;
}
export function queueCounts(ops:readonly OfflineOp[]){
 return {pending:ops.filter(x=>x.status==="pending").length,conflicts:ops.filter(x=>x.status==="conflict").length};
}
export type RemoteRevision={exists:boolean;revision:string|null};
export type ConflictVerdict="send"|"conflict"|"already-applied";
/**
 * Contrato para uma futura API autenticada: nunca substituir alterações de outro
 * terminal quando a revisão original não coincide. Não é uma sincronização activa.
 */
export function checkRemoteRevision(op:OfflineOp,remote:RemoteRevision,remoteAppliedIds:ReadonlySet<string>):ConflictVerdict{
 if(remoteAppliedIds.has(op.id))return "already-applied";
 if(op.baseRevision===null){
  // Sem revisão do servidor a operação não é segura para envio automático.
  return "conflict";
 }
 return op.baseRevision===remote.revision?"send":"conflict";
}
export function backupEnvelope(store:Store,ops:readonly OfflineOp[],clientId:string,now=new Date()){
 return {format:"ubuntu-pos360-offline-backup",schema:OFFLINE_SCHEMA,exportedAt:now.toISOString(),clientId,
  warning:"Dados pessoais e comerciais locais. Guardar em local seguro. Não é cópia fiscal nem prova de sincronização.",
  state:store,pendingOperations:ops};
}
