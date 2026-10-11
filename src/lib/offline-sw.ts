export type OfflineShellState="unsupported"|"registering"|"ready"|"error";
function assetsToCache(){
 const sources:string[]=[];
 for(const node of document.querySelectorAll('script[src],link[rel="stylesheet"][href]')){
  const url=node instanceof HTMLScriptElement?node.src:node instanceof HTMLLinkElement?node.href:"";
  if(url)sources.push(url);
 }
 // Recursos iniciados antes de o SW assumir o controlo também precisam de cache.
 for(const entry of performance.getEntriesByType("resource"))sources.push(entry.name);
 return [...new Set(sources)].filter(x=>{
  try{const url=new URL(x,location.href);return url.origin===location.origin&&
   (url.pathname.startsWith("/assets/")||url.pathname==="/favicon.svg"||url.pathname==="/manifest.webmanifest")
  }catch{return false}
 });
}
export function registerOfflineShell(onStatus:(status:OfflineShellState)=>void):()=>void{
 if(typeof navigator==="undefined"||!("serviceWorker" in navigator)){onStatus("unsupported");return()=>{}}
 let closed=false;
 const notify=(status:OfflineShellState)=>{if(!closed)onStatus(status)};
 const incoming=(event:MessageEvent)=>{
  if(event.data?.type==="APP_SHELL_CACHED")
   notify(event.data.ready?"ready":"error");
 };
 navigator.serviceWorker.addEventListener("message",incoming);
 const register=async()=>{
  try{
   const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
   if(closed)return;
   const ready=await navigator.serviceWorker.ready;
   if(closed)return;
   const worker=ready.active??registration.active??registration.waiting;
   if(!worker){notify("error");return}
   worker.postMessage({type:"CACHE_APP_SHELL",assets:assetsToCache()});
  }catch{notify("error")}
 };
 void register();
 return()=>{closed=true;navigator.serviceWorker.removeEventListener("message",incoming)};
}
