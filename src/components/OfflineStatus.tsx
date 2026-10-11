import {CloudOff,Cloud,Database,Download,HardDrive,Info,RefreshCw,ShieldAlert,Wifi,WifiOff} from "lucide-react";
import type {OfflineOverview} from "../lib/offline-model";

export function OfflineHeaderStatus({online,overview,onDetails}:{
 online:boolean;overview:OfflineOverview;onDetails:()=>void;
}){
 return <button type="button" className={"offline-header-status "+(online?"online":"offline")}
   onClick={onDetails} title="Consultar os dados guardados e a fila de operações">
  {online?<Wifi size={16}/>:<WifiOff size={16}/>}
  <span>{online?"Com ligação":"Sem internet"}</span>
  {overview.pending>0&&<small>{overview.pending} pendente(s)</small>}
 </button>;
}
export function OfflineSettingsPanel({online,loaded,overview,downloadBackup}:{
 online:boolean;loaded:boolean;overview:OfflineOverview;downloadBackup:()=>Promise<void>;
}){
 const backing=overview.mode==="indexeddb"?"IndexedDB":overview.mode==="localStorage"?"localStorage":"Memória temporária";
 const sw=overview.serviceWorker==="ready"?"Preparado nesta instalação":
  overview.serviceWorker==="registering"?"A preparar cache…":
  overview.serviceWorker==="unsupported"?"Não suportado pelo navegador":"Cache indisponível";
 return <section className="offline-settings-card" aria-labelledby="offline-settings-title">
  <div className="offline-settings-head">
   <div className="offline-settings-icon"><HardDrive size={22}/></div>
   <div><h2 id="offline-settings-title">Modo offline e dados locais</h2>
    <p>O POS mantém as operações neste dispositivo. A sincronização com um servidor ainda não foi activada.</p></div>
  </div>
  <div className="offline-status-grid" aria-label="Estado do funcionamento offline">
   <div><span>{online?<Wifi size={18}/>:<WifiOff size={18}/>} Rede do dispositivo</span><strong>{online?"Com ligação":"Sem internet (detectado)"}</strong><small>A ligação à internet não confirma acesso a um servidor.</small></div>
   <div><span><Database size={18}/> Armazenamento local</span><strong>{backing}</strong><small>{loaded?"Aguardar confirmação de gravação após cada alteração.":"A recuperar histórico local…"}</small></div>
   <div><span><CloudOff size={18}/> Fila local pendente</span><strong>{overview.pending} operação(ões)</strong><small>Não enviadas. Não apagar antes de uma futura integração segura.</small></div>
   <div><span><Cloud size={18}/> Aplicação sem rede</span><strong>{sw}</strong><small>Requer primeiro carregamento online e recursos em cache.</small></div>
  </div>
  {overview.conflicts>0&&<div className="offline-warning"><ShieldAlert size={17}/>{overview.conflicts} conflito(s) identificado(s). É necessária revisão manual antes de sincronizar.</div>}
  {overview.error&&<div className="offline-warning" role="alert"><ShieldAlert size={17}/>{overview.error}</div>}
  <div className="offline-last-save"><RefreshCw size={16}/>{overview.savedAt?"Última gravação local: "+new Intl.DateTimeFormat("pt-MZ",{dateStyle:"short",timeStyle:"short"}).format(new Date(overview.savedAt)):"Aguardar primeira gravação local."}</div>
  <div className="offline-backup-row">
   <div><strong>Cópia de segurança do navegador</strong><p>Exporta os dados demonstrativos e as operações pendentes para um ficheiro JSON.</p></div>
   <button type="button" disabled={!loaded} onClick={()=>void downloadBackup()}><Download size={17}/> Exportar cópia</button>
  </div>
  <p className="offline-disclaimer"><Info size={17}/>
   <span><b>Protecção de dados:</b> a cópia contém contactos, dívidas e vendas. Guarde-a em local seguro e não a partilhe publicamente. IndexedDB e a cache podem ser apagados pelo navegador, sistema operativo ou utilizador. O modo offline não substitui backups, nem fornece isolamento entre funcionários ou sincronização multiempresa. Nunca trate as operações pendentes como enviadas.</span>
  </p>
 </section>;
}
