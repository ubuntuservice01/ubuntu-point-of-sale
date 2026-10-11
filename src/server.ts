type StartHandler={fetch:(request:Request,env:unknown,ctx:unknown)=>Promise<Response>|Response};
export default {async fetch(request:Request,env:unknown,ctx:unknown){
 const entry=await import("@tanstack/react-start/server-entry");
 const handler=(entry.default??entry) as StartHandler;
 return handler.fetch(request,env,ctx);
}};
