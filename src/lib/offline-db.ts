import {initialStore,safeStore,type Store} from "./domain";
import {
 OFFLINE_DB_NAME,OFFLINE_LEGACY_KEY,OFFLINE_LOCAL_JOURNAL_KEY,OFFLINE_SCHEMA,
 backupEnvelope,deviceId,newOpId,queueCounts,type LocalMode,type OfflineOp,type Snapshot
} from "./offline-model";

type DbSnapshot=Snapshot&{writeId:string};
export type OfflineBoot={
 state:Store;clientId:string;writeId:string|null;mode:LocalMode;savedAt:string|null;
 pending:number;conflicts:number;warning:string|null
};
export type OfflineWrite={writeId:string|null;mode:LocalMode;savedAt:string;pending:number;conflicts:number;warning:string|null};
let databasePromise:Promise<IDBDatabase|null>|null=null;
const dbAvailable=()=>typeof indexedDB!=="undefined";
function db():Promise<IDBDatabase|null>{
 if(!dbAvailable())return Promise.resolve(null);
 if(databasePromise)return databasePromise;
 databasePromise=new Promise(resolve=>{
  let request:IDBOpenDBRequest;
  try{request=indexedDB.open(OFFLINE_DB_NAME,1)}
  catch{resolve(null);return}
  request.onupgradeneeded=()=>{
   const database=request.result;
   if(!database.objectStoreNames.contains("snapshots"))database.createObjectStore("snapshots");
   if(!database.objectStoreNames.contains("outbox"))database.createObjectStore("outbox",{keyPath:"id"});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>resolve(null);
  request.onblocked=()=>resolve(null);
 });
 return databasePromise;
}
function readLegacy():Store|null{
 try{const raw=window.localStorage.getItem(OFFLINE_LEGACY_KEY);return raw?safeStore(JSON.parse(raw)):null}
 catch{return null}
}
function readLegacyOps():OfflineOp[]{
 try{
  const raw=window.localStorage.getItem(OFFLINE_LOCAL_JOURNAL_KEY);
  const result=raw?JSON.parse(raw) as unknown:null;
  return Array.isArray(result)?result.filter((x):x is OfflineOp=>
   !!x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.collection==="string"&&
   (x.status==="pending"||x.status==="conflict")&&typeof x.recordId==="string"):[]; 
 }catch{return []}
}
function mirror(store:Store):boolean{
 try{window.localStorage.setItem(OFFLINE_LEGACY_KEY,JSON.stringify(store));return true}
 catch{return false}
}
const requestResult=<T>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error??new Error("Falhou a consulta ao IndexedDB."));
});
function transactionComplete(tx:IDBTransaction):Promise<void>{
 return new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();
  tx.onabort=()=>reject(tx.error??new Error("Transacção local interrompida."));
  tx.onerror=()=>{/* onabort devolve o erro final */};
 });
}
async function readDatabase(db:IDBDatabase):Promise<DbSnapshot|null>{
 const tx=db.transaction("snapshots","readonly");
 const done=transactionComplete(tx);
 const result=await requestResult(tx.objectStore("snapshots").get("current")) as DbSnapshot|undefined;
 await done;
 return result??null;
}
export async function queuedOperations():Promise<OfflineOp[]>{
 const database=await db();
 if(!database)return readLegacyOps();
 const tx=database.transaction("outbox","readonly");
 const done=transactionComplete(tx);
 const items=await requestResult(tx.objectStore("outbox").getAll()) as OfflineOp[];
 await done;
 return items;
}
/** Abre IndexedDB, adoptando o histórico do localStorage apenas na primeira migração. */
export async function loadOffline():Promise<OfflineBoot>{
 const clientId=deviceId();
 const database=await db();
 const fallback=readLegacy()??initialStore();
 if(!database){
  const ops=readLegacyOps(),count=queueCounts(ops);
  return {state:fallback,clientId,writeId:null,mode:"localStorage",savedAt:null,
   pending:count.pending,conflicts:count.conflicts,warning:"IndexedDB indisponível: os dados ficam apenas no armazenamento local simples."};
 }
 try{
  const existing=await readDatabase(database);
  if(existing?.state){
   const ops=await queuedOperations(),count=queueCounts(ops);
   return {state:safeStore(existing.state),clientId:existing.clientId||clientId,
    writeId:existing.writeId,mode:"indexeddb",savedAt:existing.savedAt,
    pending:count.pending,conflicts:count.conflicts,warning:null};
  }
  // Primeira abertura: importa sem gerar operações retroactivas ou vendas fictícias.
  const imported=await persistOffline(fallback,[],clientId,null,{baseline:true});
  return {state:fallback,clientId,writeId:imported.writeId,mode:imported.mode,
   savedAt:imported.savedAt,pending:imported.pending,conflicts:imported.conflicts,warning:imported.warning};
 }catch{
  const ops=readLegacyOps(),count=queueCounts(ops);
  return {state:fallback,clientId,writeId:null,mode:"localStorage",savedAt:null,
   pending:count.pending,conflicts:count.conflicts,warning:"Erro ao ler IndexedDB. O armazenamento local simples foi utilizado."};
 }
}
/**
 * O instantâneo e as operações pendentes são confirmados na mesma transacção.
 * writeId evita que um segundo separador substitua silenciosamente outro estado.
 * Sem Supabase, todas as operações permanecem pendentes.
 */
export async function persistOffline(
 state:Store,append:readonly OfflineOp[],clientId:string,expectedWriteId:string|null,
 options:{baseline?:boolean;reset?:boolean}={}
):Promise<OfflineWrite>{
 const savedAt=new Date().toISOString();
 const database=await db();
 if(database){
  const writeId=newOpId();
  const tx=database.transaction(["snapshots","outbox"],"readwrite");
  const completed=transactionComplete(tx);
  try{
   const snapshots=tx.objectStore("snapshots"),outbox=tx.objectStore("outbox");
   const old=await requestResult(snapshots.get("current")) as DbSnapshot|undefined;
   if(!options.baseline&&(old?.writeId??null)!==expectedWriteId){
    tx.abort();
    await completed.catch(()=>{});
    throw new Error("Outra aba alterou os dados locais. Exporte uma cópia de segurança e recarregue para evitar perder alterações.");
   }
   if(options.reset)outbox.clear();
   const snapshot:DbSnapshot={schema:OFFLINE_SCHEMA,state,clientId,savedAt,writeId};
   snapshots.put(snapshot,"current");
   for(const item of append)outbox.put(item);
   await completed;
   const ops=await queuedOperations(),count=queueCounts(ops);
   const didMirror=mirror(state);
   return {writeId,mode:"indexeddb",savedAt,pending:count.pending,conflicts:count.conflicts,
    warning:didMirror?null:"A cópia secundária em localStorage não pôde ser guardada. Os dados principais estão no IndexedDB."};
  }catch(error){
   try{tx.abort()}catch{/* já concluída */}
   await completed.catch(()=>{});
   throw error;
  }
 }
 // Degradação graciosa: sem IndexedDB nunca declarar armazenamento transaccional.
 try{
  if(options.reset)window.localStorage.setItem(OFFLINE_LOCAL_JOURNAL_KEY,"[]");
  else{
   const previous=readLegacyOps();
   window.localStorage.setItem(OFFLINE_LOCAL_JOURNAL_KEY,JSON.stringify([...previous,...append]));
  }
  if(!mirror(state))throw Error("Armazenamento local cheio ou bloqueado.");
  const count=queueCounts(readLegacyOps());
  return {writeId:null,mode:"localStorage",savedAt,pending:count.pending,conflicts:count.conflicts,
   warning:"Modo de compatibilidade: não há transacções IndexedDB nem garantias contra conflitos de outras abas."};
 }catch{
  throw new Error("Não foi possível guardar a operação neste dispositivo. Exporte uma cópia imediatamente e liberte espaço.");
 }
}
export async function exportOfflineBackup(state:Store,clientId:string):Promise<string>{
 const pending=await queuedOperations();
 return JSON.stringify(backupEnvelope(state,pending,clientId),null,2);
}
