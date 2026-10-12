import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createElement} from "react";
import {SuperAdminLive} from "../components/SuperAdminLive";
vi.mock("../lib/supabase-admin-auth",()=>({
 supabaseAdminConfig:()=>({url:"https://demo.supabase.co",key:"public-test-key"})
}));
const companies=[{id:"a",name:"Talho do Bairro",slug:"talho-do-bairro",sector:"talho",city:"Lichinga",status:"trial",license_expires_at:"2026-10-28"}];
const plans=[{code:"piloto",name:"Piloto"}];
beforeEach(()=>{vi.restoreAllMocks()});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
describe("Super Admin — empresas reais",()=>{
 it("carrega empresas e planos por uma única chamada autenticada com JWT",async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:()=>Promise.resolve({companies,plans})});
  vi.stubGlobal("fetch",fetchMock);
  render(createElement(SuperAdminLive,{token:"jwt-test"}));
  expect(await screen.findByText("Talho do Bairro")).toBeTruthy();
  expect(screen.getByRole("button",{name:"Talhos (1)"})).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url,init]=fetchMock.mock.calls[0] as [string,RequestInit];
  expect(url).toMatch(/\/functions\/v1\/admin-dashboard$/);
  expect(init.method).toBe("POST");
  expect((init.headers as Record<string,string>)["Authorization"]).toBe("Bearer jwt-test");
 });
 it("não confunde rede indisponível com ausência de empresas e permite repetir",async()=>{
  let tries=0;
  const fetchMock=vi.fn().mockImplementation(async()=>{
   tries++;
   if(tries===1)throw new TypeError("Failed to fetch");
   return {ok:true,json:()=>Promise.resolve({companies:[],plans})};
  });
  vi.stubGlobal("fetch",fetchMock);
  render(createElement(SuperAdminLive,{token:"jwt-test"}));
  expect(await screen.findByRole("button",{name:"Tentar novamente"})).toBeTruthy();
  expect(screen.getByText(/A lista ainda não pôde ser carregada/)).toBeTruthy();
  expect((screen.getByRole("button",{name:/Criar empresa/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
  await waitFor(()=>expect(screen.getByText(/Ainda não há empresas nesta categoria/)).toBeTruthy());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/A lista ainda não pôde ser carregada/)).toBeNull();
 });
});
