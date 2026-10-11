import {afterEach,describe,it,expect} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {useState} from "react";
import {useDialogFocus} from "./useDialogFocus";

function DialogContent({close}:{close:()=>void}){
 const ref=useDialogFocus<HTMLDivElement>(close);
 return <div role="dialog" aria-label="Teste de foco" ref={ref} tabIndex={-1}>
   <button onClick={close}>Fechar janela</button>
   <label>Nome<input aria-label="Nome"/></label>
   <button>Guardar</button>
 </div>;
}
function Harness(){
 const [open,setOpen]=useState(false);
 return <><button onClick={()=>setOpen(true)}>Abrir janela</button>{open&&<DialogContent close={()=>setOpen(false)}/>}</>;
}
afterEach(cleanup);
describe("Acessibilidade de diálogos",()=>{
 it("foca campo útil, mantém Tab dentro da janela, fecha com Escape e repõe o foco",()=>{
  render(<Harness/>);
  const open=screen.getByRole("button",{name:"Abrir janela"});
  open.focus();
  fireEvent.click(open);
  const input=screen.getByRole("textbox",{name:"Nome"});
  const save=screen.getByRole("button",{name:"Guardar"});
  const close=screen.getByRole("button",{name:"Fechar janela"});
  expect(document.activeElement).toBe(input);
  save.focus();
  fireEvent.keyDown(document,{key:"Tab"});
  expect(document.activeElement).toBe(close);
  close.focus();
  fireEvent.keyDown(document,{key:"Tab",shiftKey:true});
  expect(document.activeElement).toBe(save);
  fireEvent.keyDown(document,{key:"Escape"});
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(open);
 });
});
