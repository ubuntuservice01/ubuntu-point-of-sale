import {afterEach,describe,expect,it,vi} from "vitest";
import {playSuccessfulScanBeep,prepareScanAudio} from "./scan-feedback";

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
describe("Confirmação sonora local de leitura",()=>{
 it("mantém silêncio se Web Audio não estiver disponível",()=>{
  vi.stubGlobal("AudioContext",undefined);
  vi.stubGlobal("webkitAudioContext",undefined);
  expect(prepareScanAudio()).toBe(false);
  expect(playSuccessfulScanBeep()).toBe(false);
 });
 it("gera um bip curto e sem ficheiros externos quando suportado",()=>{
  const start=vi.fn(),stop=vi.fn(),connect=vi.fn(),disconnect=vi.fn();
  const setValueAtTime=vi.fn(),exponentialRampToValueAtTime=vi.fn();
  const oscillator={type:"sine",frequency:{setValueAtTime},connect,disconnect,start,stop,onended:null as (()=>void)|null};
  const gain={gain:{setValueAtTime,exponentialRampToValueAtTime},connect:vi.fn(),disconnect:vi.fn()};
  const resume=vi.fn().mockResolvedValue(undefined);
  class MockContext{
   currentTime=2;state="running";destination={};
   createOscillator=()=>oscillator;
   createGain=()=>gain;
   resume=resume;
  }
  vi.stubGlobal("AudioContext",MockContext);
  expect(prepareScanAudio()).toBe(true);
  expect(playSuccessfulScanBeep()).toBe(true);
  expect(start).toHaveBeenCalledWith(2);
  expect(stop).toHaveBeenCalledWith(2.15);
  expect(exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
 });
});
