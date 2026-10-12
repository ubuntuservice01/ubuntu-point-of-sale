# Ubuntu POS 360 — Login universal por perfil

## URL de acesso
- `/` ou `/login`: **a mesma página de login** para todos os utilizadores, por email e palavra-passe (Supabase Auth).
- Os administradores e funcionários **não** escolhem manualmente o perfil: o sistema consulta `public.platform_admins` e `public.tenant_memberships` sob RLS.
- O email, nome e `raw_user_meta_data` nunca são critérios para conceder privilégios.

## Destinos depois de autenticar
| Perfil autorizado | Caminho |
|---|---|
| Super Admin da Ubuntu Service | `/super-admin` |
| Administrador da empresa | `/empresa?tenant=<id>` |
| Gerente | `/caixa?tenant=<id>` (POS piloto) |
| Supervisor | `/caixa?tenant=<id>` (POS piloto) |
| Operador de caixa | `/caixa?tenant=<id>` (POS piloto) |
| Responsável de stock | `/stock?tenant=<id>` (consulta) |

Se um utilizador tiver vários perfis, a prioridade inicial é Super Admin, administrador de empresa, gerente, supervisor, caixa e stock. Nos painéis de empresa é possível alternar entre empresas permitidas. Cada rota interna revalida o utilizador, a associação e o papel no Supabase.

## Convites e recuperação
As Edge Functions `create-tenant-admin` e `invite-tenant-operator` passam a redireccionar os convites para `/login`, onde a pessoa define a palavra-passe pela primeira vez. A recuperação de palavra-passe usa o mesmo ecrã.

**Obrigatório para funcionar fora do editor**: publicar um domínio HTTPS de testes, configurar `POS_APP_URL=https://dominio-publicado` nas variáveis da função e autorizar `/login` nos redireccionamentos de Supabase Auth. SMTP precisa estar operacional para convites e recuperações.

## Demonstração e limites
A antiga entrada local de demonstração está preservada em `/demonstracao`, separada do login real. O `/catalogo` permanece público, como catálogo demonstrativo. Nenhuma pessoa recebe acesso real através do PIN local.

**Não está pronto para operação comercial**: POS piloto somente dinheiro e não fiscal, sem validação E2E com múltiplas empresas e sem integração de todos os módulos sectoriais. Corrigir alertas de segurança do Supabase antes de clientes reais.

## Fluxo esperado
`/login` → Supabase Auth → privilégios RLS → destino do perfil → painel protegido. Logout regressa ao login e limpa sessões anteriores.
