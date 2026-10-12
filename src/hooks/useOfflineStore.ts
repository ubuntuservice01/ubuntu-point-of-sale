import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from "react";
import {initialStore,type Store} from "../lib/domain";
import {changedOperations,startingOverview,scopedOfflineKey,OFFLINE_LEGACY_KEY,type OfflineOverview} from "../lib/offline-model";
import {exportOfflineBackup,loadOffline,persistOffline} from "../lib/offline-db";
import {registerOfflineShell} from "../lib/offline-sw";

export type OfflineStoreController={
 data:Store;setData:Dispatch<SetStateAction<Store>>;loaded:boolean;
 overview:OfflineOverview;online:boolean;clientId:string;
 resetDemo:()=>void;downloadBackup:()=>Promise<void>;
};
function saveBackup(text:string){
 const url=URL.createObjectURL(new Blob([text],{type:"application/json;charset=utf-8"}));
 const link=document.createElement("a");
 const today=new Date().toISOString().slice(0,10);
 link.href=url;link.download="ubuntu-pos360-backup-"+today+".json";
 document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/** Dados do POS: IndexedDB transaccional com diário pendente para futura API segura. */
export function useOfflineStore(scope?:string):OfflineStoreController{
 const [data,setData]=useState<Store>(initialStore);
 const [loaded,setLoaded]=useState(false);
 const [overview,setOverview]=useState<OfflineOverview>(startingOverview);
 const [online,setOnline]=useState(()=>typeof navigator!=="undefined"?navigator.onLine:true);
 const [clientId,setClientId]=useState("");
 const idRef=useRef("");
 const writeIdRef=useRef<string|null>(null);
 const persistedRef=useRef<Store|null>(null);
 const scheduledRef=useRef<Store|null>(null);
 const tasksRef=useRef<Promise<void>>(Promise.resolve());
 const resetRef=useRef(false);
 const activeRef=useRef(true);
 useEffect(()=>{
  activeRef.current=true;
  let cancelled=false;
  void loadOffline(scope).then(boot=>{
   if(cancelled)return;
   idRef.current=boot.clientId;
   writeIdRef.current=boot.writeId;
   persistedRef.current=boot.state;
   scheduledRef.current=boot.state;
   setClientId(boot.clientId);
   setData(boot.state);
   setOverview(prev=>({...prev,mode:boot.mode,savedAt:boot.savedAt,pending:boot.pending,conflicts:boot.conflicts,error:boot.warning}));
   setLoaded(true);
  }).catch(error=>{
   if(cancelled)return;
   const value=initialStore();
   persistedRef.current=value;scheduledRef.current=value;
   setData(value);
   setOverview(prev=>({...prev,mode:"memory",error:error instanceof Error?error.message:"Dados locais indisponíveis."}));
   setLoaded(true);
  });
  return()=>{cancelled=true;activeRef.current=false};
 },[]);
 useEffect(()=>{
  const set=()=>setOnline(navigator.onLine);
  window.addEventListener("online",set);window.addEventListener("offline",set);
  return()=>{window.removeEventListener("online",set);window.removeEventListener("offline",set)};
 },[]);
 useEffect(()=>registerOfflineShell(worker=>{
  if(activeRef.current)setOverview(old=>({...old,serviceWorker:worker}));
 }),[]);
 useEffect(()=>{
  const onChange=(event:StorageEvent)=>{
   if(event.key===scopedOfflineKey(OFFLINE_LEGACY_KEY,scope)&&event.newValue){
    setOverview(old=>({...old,error:"Outra aba do POS alterou os dados locais. Para evitar conflitos, guarde uma cópia de segurança e recarregue antes de continuar."}));
   }
  };
  window.addEventListener("storage",onChange);
  return()=>window.removeEventListener("storage",onChange);
 },[scope]);
 useEffect(()=>{
  if(!loaded||!persistedRef.current||data===scheduledRef.current)return;
  scheduledRef.current=data;
  const clear=resetRef.current;
  resetRef.current=false;
  tasksRef.current=tasksRef.current.then(async()=>{
   const before=persistedRef.current;
   if(!before)return;
   const append=clear?[]:changedOperations(before,data,idRef.current);
   const result=await persistOffline(data,append,idRef.current,writeIdRef.current,clear?{reset:true}:{},scope);
   persistedRef.current=data;
   writeIdRef.current=result.writeId;
   if(activeRef.current)setOverview(prev=>({...prev,
    mode:result.mode,savedAt:result.savedAt,pending:result.pending,
    conflicts:result.conflicts,error:result.warning
   }));
  }).catch(error=>{
   if(activeRef.current)setOverview(prev=>({...prev,error:error instanceof Error?error.message:"Falha ao guardar dados locais."}));
  });
 },[data,loaded]);
 const resetDemo=()=>{
  resetRef.current=true;
  setData(initialStore());
 };
 const downloadBackup=async()=>{
  try{
   const content=await exportOfflineBackup(data,idRef.current,scope);
   saveBackup(content);
  }catch(error){
   setOverview(prev=>({...prev,error:error instanceof Error?error.message:"Não foi possível exportar o backup."}));
  }
 };
 return {data,setData,loaded,overview,online,clientId,resetDemo,downloadBackup};
}
