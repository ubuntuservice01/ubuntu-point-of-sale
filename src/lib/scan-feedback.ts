/**
 * Bip de confirmação reproduzido localmente (sem ficheiros nem serviços externos).
 * O contexto é activado no clique que abre a câmara; leitores USB activam no Enter.
 * O som depende das permissões e volume do dispositivo/navegador.
 */
let sharedContext:AudioContext|null=null;

function context():AudioContext|null{
 if(typeof window==="undefined")return null;
 const host=window as unknown as {
  AudioContext?:typeof AudioContext;webkitAudioContext?:typeof AudioContext;
 };
 const Constructor=host.AudioContext??host.webkitAudioContext;
 if(!Constructor)return null;
 try{
  if(!sharedContext||sharedContext.state==="closed")sharedContext=new Constructor();
  if(sharedContext.state==="suspended")void sharedContext.resume().catch(()=>{});
  return sharedContext;
 }catch{return null;}
}
/** Invocar no clique do operador para permitir áudio após uma leitura assíncrona. */
export function prepareScanAudio():boolean{return context()!==null}

/** Emite um único bip curto apenas após a leitura ter sido aceite pela operação. */
export function playSuccessfulScanBeep():boolean{
 const audio=context();
 if(!audio)return false;
 try{
  const oscillator=audio.createOscillator();
  const gain=audio.createGain();
  oscillator.type="sine";
  oscillator.frequency.setValueAtTime(1050,audio.currentTime);
  gain.gain.setValueAtTime(0.0001,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.085,audio.currentTime+0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+0.145);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect()}catch{}};
  oscillator.start(audio.currentTime);
  oscillator.stop(audio.currentTime+0.15);
  return true;
 }catch{return false;}
}
