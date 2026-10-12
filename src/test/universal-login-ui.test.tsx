import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createElement} from "react";
import {UniversalLogin} from "../components/UniversalLogin";
import {destinationFor,goTo,inviteTokensFromUrl,signInUnified,storedSessionTokens} from "../lib/unified-auth";
vi.mock("../lib/unified-auth",()=>({
 storedSessionTokens:vi.fn(()=>null),inviteTokensFromUrl:vi.fn(()=>null),
 authorizeTokens:vi.fn(),changePasswordUnified:vi.fn(),
 clearUnifiedTokens:vi.fn(),destinationFor:vi.fn(),goTo:vi.fn(),
 recoverPassword:vi.fn()
 ,signInUnified:vi.fn()
}));
const tenant="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(storedSessionTokens).mockReturnValue(null);
 vi.mocked(inviteTokensFromUrl).mockReturnValue(null);
 window.history.replaceState({},"","/login");
});
afterEach(()=>{cleanup();});
describe("Ecrã central de acesso",()=>{
 it("mostra um só login, sem escolher o perfil manualmente",async()=>{
  render(createElement(UniversalLogin));
  expect(await screen.findByRole("button",{name:/Entrar no sistema/})).toBeTruthy();
  expect(screen.getByLabelText("Endereço de email")).toBeTruthy();
  expect(screen.getByLabelText("Palavra-passe")).toBeTruthy();
  expect(screen.queryByRole("combobox",{name:/Perfil/})).toBeNull();
  expect(screen.getByText(/O sistema identificará o teu perfil/)).toBeTruthy();
 });
 it("envia credenciais para Auth e navega para o destino devolvido pelas permissões",async()=>{
  vi.mocked(signInUnified).mockResolvedValue({
   tokens:{access_token:"abc",refresh_token:"def"},
   identity:{id:"user",email:"user@example.org",isPlatformAdmin:false,memberships:[]}
  });
  vi.mocked(destinationFor).mockReturnValue({pathname:"/caixa",tenantId:tenant});
  render(createElement(UniversalLogin));
  fireEvent.change(await screen.findByLabelText("Endereço de email"),{target:{value:"user@example.org"}});
  fireEvent.change(screen.getByLabelText("Palavra-passe"),{target:{value:"minha-password"}});
  fireEvent.click(screen.getByRole("button",{name:/Entrar no sistema/}));
  await waitFor(()=>expect(vi.mocked(goTo)).toHaveBeenCalledWith({pathname:"/caixa",tenantId:tenant}));
  expect(vi.mocked(signInUnified)).toHaveBeenCalledWith("user@example.org","minha-password");
 });
});
