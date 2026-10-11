/* Ubuntu POS 360: cache de recursos estáticos, NUNCA de dados de clientes, APIs ou chamadas POST. */
const CACHE="ubuntu-pos360-shell-v1";
const PREFIX="ubuntu-pos360-shell-";
const ROOT="/";
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  try{
   const response=await fetch(ROOT,{cache:"reload",credentials:"same-origin"});
   if(response.ok&&response.headers.get("content-type")?.includes("text/html")){
    const cache=await caches.open(CACHE);
    await cache.put(ROOT,response.clone());
   }
  }catch{/* offline na instalação: o browser tentará novamente depois */}
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const old=(await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE);
  await Promise.all(old.map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
function staticAsset(url){
 return url.origin===self.location.origin&&(
  url.pathname.startsWith("/assets/")||
  url.pathname==="/favicon.svg"||
  url.pathname==="/manifest.webmanifest"
 );
}
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin)return;
 if(request.mode==="navigate"){
  // Só a página pública de POS é recuperada offline. Não falsificar outras rotas.
  if(url.pathname!==ROOT)return;
  event.respondWith((async()=>{
   try{
    const response=await fetch(request);
    if(response.ok&&response.headers.get("content-type")?.includes("text/html")){
     const cache=await caches.open(CACHE);
     await cache.put(ROOT,response.clone());
    }
    return response;
   }catch{
    const cached=await caches.match(ROOT);
    if(cached)return cached;
    return Response.error();
   }
  })());
  return;
 }
 if(!staticAsset(url))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(request);
  if(hit)return hit;
  try{
   const response=await fetch(request);
   if(response.ok)await cache.put(request,response.clone());
   return response;
  }catch{return Response.error()}
 })());
});
self.addEventListener("message",event=>{
 const message=event.data;
 if(!message||message.type!=="CACHE_APP_SHELL")return;
 event.waitUntil((async()=>{
  const client=event.source,assets=Array.isArray(message.assets)?message.assets:[];
  const safe=[...new Set(assets.filter(value=>{
   if(typeof value!=="string")return false;
   try{return staticAsset(new URL(value,self.location.origin))}catch{return false}
  }))].slice(0,150);
  let failed=0;
  const cache=await caches.open(CACHE);
  for(const url of safe){
   try{
    const result=await fetch(url,{credentials:"same-origin",cache:"reload"});
    if(!result.ok)throw new Error("HTTP "+result.status);
    await cache.put(url,result.clone());
   }catch{failed++}
  }
  let root=await cache.match(ROOT);
  if(!root){
   try{
    const response=await fetch(ROOT,{credentials:"same-origin"});
    if(response.ok&&response.headers.get("content-type")?.includes("text/html")){
     await cache.put(ROOT,response.clone());root=response;
    }
   }catch{/* poderá ser recuperado na próxima ligação */}
  }
  client?.postMessage({type:"APP_SHELL_CACHED",ready:!!root&&failed===0,failed});
 })());
});
