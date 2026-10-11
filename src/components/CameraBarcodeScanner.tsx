import {useEffect,useRef,useState,type FormEvent} from "react";
import {AlertCircle,Camera,CheckCircle2,Keyboard,RefreshCw,ScanBarcode,ShieldCheck,Smartphone,X} from "lucide-react";
import {normalizeBarcode,validBarcode} from "../lib/barcodes";
import {useDialogFocus} from "../lib/useDialogFocus";

type BarcodeDetection={rawValue:string;format?:string};
type NativeDetector={detect:(source:HTMLVideoElement)=>Promise<BarcodeDetection[]>};
type DetectorClass={
 new(options?:{formats?:string[]}):NativeDetector;
 getSupportedFormats?:()=>Promise<string[]>;
};
type ScannerResult={kind:"added"}|{kind:"unknown"}|{kind:"unavailable";message:string};
export type CameraBarcodeScannerProps={
 onClose:()=>void;
 onRead:(value:string)=>ScannerResult;
 onRegister?:(value:string)=>void;
 title?:string;
};
const supportedFormats=["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf","codabar","qr_code"];

/** A API é experimental; a detecção de compatibilidade é feita no momento de abrir. */
function nativeDetector():DetectorClass|undefined{
 return (window as Window & {BarcodeDetector?:DetectorClass}).BarcodeDetector;
}
function cameraError(error:unknown):string{
 const name=error instanceof Error?error.name:"";
 if(name==="NotAllowedError"||name==="PermissionDeniedError")return "O acesso à câmara foi recusado. Autorize a câmara nas definições do navegador ou introduza o código manualmente.";
 if(name==="NotFoundError"||name==="DevicesNotFoundError")return "Não foi encontrada uma câmara neste dispositivo.";
 if(name==="NotReadableError"||name==="TrackStartError")return "A câmara está ocupada por outra aplicação. Feche-a e tente novamente.";
 if(name==="OverconstrainedError")return "A câmara não suporta a configuração pedida. Tente noutro dispositivo.";
 return "Não foi possível iniciar a leitura. Verifique as permissões ou introduza o código manualmente.";
}
export function CameraBarcodeScanner({onClose,onRead,onRegister,title="Ler código de barras"}:CameraBarcodeScannerProps){
 const dialogRef=useDialogFocus<HTMLDivElement>(onClose);
 const videoRef=useRef<HTMLVideoElement>(null);
 const readRef=useRef(onRead),closeRef=useRef(onClose);
 const stopRef=useRef<()=>void>(()=>{});
 readRef.current=onRead;closeRef.current=onClose;
 const [state,setState]=useState<"starting"|"scanning"|"unsupported"|"error"|"result">("starting");
 const [message,setMessage]=useState("");
 const [lastValue,setLastValue]=useState("");
 const [lastKind,setLastKind]=useState<"unknown"|"unavailable"|null>(null);
 const [manual,setManual]=useState("");
 const [attempt,setAttempt]=useState(0);
 const [loading,setLoading]=useState(true);

 const handleRead=(raw:string)=>{
  stopRef.current();
  const value=normalizeBarcode(raw);
  if(!validBarcode(value)){
   setMessage("Código inválido. Utilize um EAN, UPC ou código alfanumérico com 4 a 64 caracteres.");
   setState("result");setLastValue(value);setLastKind("unavailable");
   return;
  }
  const result=readRef.current(value);
  if(result.kind==="added"){closeRef.current();return;}
  setLastValue(value);setLastKind(result.kind);
  setMessage(result.kind==="unknown"?"Este código não pertence a nenhum produto registado.":"O código existe, mas o produto não pode ser adicionado à venda. "+result.message);
  setState("result");
 };
 useEffect(()=>{
  let disposed=false,raf=0,stream:MediaStream|null=null,busy=false,finished=false,lastFrame=0;
  const release=()=>{
   if(raf)cancelAnimationFrame(raf);
   stream?.getTracks().forEach(track=>track.stop());
   stream=null;
   const video=videoRef.current;if(video){video.pause();video.srcObject=null;}
  };
  stopRef.current=()=>{disposed=true;finished=true;release();};
  setState("starting");setLoading(true);setMessage("");setLastValue("");setLastKind(null);
  const start=async()=>{
   // Não iniciar captura se não existir um motor de leitura suportado.
   const Detector=nativeDetector();
   if(!Detector){setState("unsupported");setLoading(false);setMessage("Este navegador não suporta a leitura automática pela câmara. Pode usar o código manualmente ou experimentar Chrome num telemóvel Android.");return;}
   if(!window.isSecureContext&&location.hostname!=="localhost"){
    setState("error");setLoading(false);
    setMessage("Por segurança, a câmara necessita de HTTPS (ou localhost).");
    return;
   }
   if(!navigator.mediaDevices?.getUserMedia){
    setState("error");setLoading(false);setMessage("O navegador não permite aceder à câmara.");
    return;
   }
   try{
    const available=await Detector.getSupportedFormats?.();
    if(disposed)return;
    const formats=available? supportedFormats.filter(f=>available.includes(f)) : undefined;
    if(formats&&formats.length===0){
     setState("unsupported");setLoading(false);setMessage("Este navegador não reconhece códigos de produtos. Pode introduzir o código manualmente.");return;
    }
    const detector=new Detector(formats?{formats}:undefined);
    stream=await navigator.mediaDevices.getUserMedia({
     audio:false,
     video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}
    });
    if(disposed){release();return;}
    const video=videoRef.current;
    if(!video){release();return;}
    video.srcObject=stream;
    await video.play();
    if(disposed){release();return;}
    setState("scanning");setLoading(false);
    const frame=async(time:number)=>{
     if(disposed||finished)return;
     raf=requestAnimationFrame(frame);
     if(busy||time-lastFrame<200||video.readyState<2)return;
     busy=true;lastFrame=time;
     try{
      const scans=await detector.detect(video);
      if(disposed||finished)return;
      const code=scans.map(scan=>scan.rawValue).find(v=>validBarcode(v));
      if(code){
       finished=true;release();handleRead(code);
      }
     }catch{
      if(!disposed){
       finished=true;release();setState("error");
       setMessage("O navegador interrompeu o reconhecimento de códigos. Pode tentar novamente ou introduzir o código manualmente.");
      }
     }finally{busy=false;}
    };
    raf=requestAnimationFrame(frame);
   }catch(error){
    release();
    if(disposed)return;
    setState("error");setLoading(false);setMessage(cameraError(error));
   }
  };
  void start();
  return()=>{disposed=true;finished=true;release();stopRef.current=()=>{};};
 },[attempt]);
 const submitManual=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!manual.trim()){setMessage("Introduza o código do produto.");return;}
  handleRead(manual);
 };
 const tryAgain=()=>{setManual("");setAttempt(n=>n+1);};
 return <div className="scan-overlay">
  <div ref={dialogRef} className="scan-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
   <header className="scan-heading"><div><span className="scan-eyebrow"><ScanBarcode size={17}/> LEITURA PELA CÂMARA</span><h2>{title}</h2></div><button type="button" aria-label="Fechar leitor" className="scan-close" data-dialog-initial-focus onClick={onClose}><X size={22}/></button></header>
   <div className="scan-content">
    <div className={"scan-preview "+(state==="scanning"?"is-scanning":"")}>
     <video aria-label="Pré-visualização da câmara" ref={videoRef} muted autoPlay playsInline/>
     <div className="scan-frame" aria-hidden="true"><span/><span/><span/><span/></div>
     {loading&&<div className="scan-status"><Camera size={24}/><span>A preparar a câmara…</span></div>}
     {!loading&&(state==="error"||state==="unsupported"||state==="result")&&
      <div className="scan-status"><span className="scan-status-icon">{state==="result"?<CheckCircle2 size={25}/>:<AlertCircle size={25}/>}</span><span>{state==="result"?"Código identificado":"Leitura pela câmara indisponível"}</span></div>}
     {state==="scanning"&&<div className="scan-live"><span/> A procurar código…</div>}
    </div>
    {state==="scanning"&&<p className="scan-help">Aponte a câmara traseira para o código de barras do produto e mantenha-o dentro da moldura. A leitura é automática.</p>}
    {message&&<div className={state==="result"?"scan-feedback":"scan-warning"} role="status">{message}{lastValue&&<code>{lastValue}</code>}</div>}
    {state==="result"&&<div className="scan-result-actions">
     {lastKind==="unknown"&&onRegister&&<button type="button" className="scan-primary" onClick={()=>onRegister(lastValue)}><Camera size={17}/> Registar produto com este código</button>}
     <button type="button" className="scan-secondary" onClick={tryAgain}><RefreshCw size={17}/> Ler outro código</button>
    </div>}
    {(state==="error"||state==="unsupported")&&<button type="button" className="scan-secondary scan-retry" onClick={tryAgain}><RefreshCw size={16}/> Tentar abrir câmara novamente</button>}
    <form className="scan-manual" onSubmit={submitManual}>
     <label htmlFor="scan-manual-field"><Keyboard size={17}/> Ou introduza o código manualmente</label>
     <div><input id="scan-manual-field" autoComplete="off" inputMode="text" value={manual} onChange={e=>setManual(e.target.value)} placeholder="EAN, UPC ou SKU" maxLength={80}/><button type="submit">Procurar</button></div>
    </form>
    <p className="scan-privacy"><ShieldCheck size={16}/> A imagem da câmara é processada neste navegador e não é enviada para servidores. A câmara é desligada quando fecha o leitor.</p>
   </div>
  </div>
 </div>;
}
