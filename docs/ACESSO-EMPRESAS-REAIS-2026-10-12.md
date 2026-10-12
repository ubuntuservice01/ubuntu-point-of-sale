# Ubuntu POS 360 — Empresas reais, convites e perfis (12/10/2026)

## Funcionalidades implementadas na ramificação de desenvolvimento
- `/super-admin`: autenticação Supabase Auth, confirmação de `platform_admins`, listagem real de empresas, filtro por Farmácia/Talho/Restaurante/Bar/Padaria/Grossista/Loja, formulário de criação e envio de convite.
- `/empresa`: login separado, aceitação de convite, palavra-passe individual, verificação da associação à empresa, painel com filiais e operadores, convite de Gerente/Supervisor/Caixa/Stock.
- API `create-tenant-admin` e `invite-tenant-operator`: exigem JWT; validam a função da pessoa no servidor; gravam a empresa e/ou funcionário apenas após as verificações. Não expõem chaves privilegiadas no navegador.
- Todos os registos reais desta etapa usam `tenants`, `branches`, `tenant_memberships`, `membership_branches`, `modules`, `plans` e `audit_events`.
- O frontend de demonstração continua separado. POS, stocks e vendas ainda não usam a base real.

## Configuração obrigatória antes de testar emails
1. Publicar uma versão de teste HTTPS desta ramificação e conhecer o seu endereço estável.
2. Em Supabase **Authentication → URL Configuration**, definir o Site URL para o domínio publicado e permitir os redireccionamentos `https://DOMINIO/super-admin` e `https://DOMINIO/empresa`.
3. Configurar e testar SMTP do Supabase Auth para convites.
4. Nas configurações de **Edge Functions / Secrets** do projecto, configurar `POS_APP_URL=https://DOMINIO` sem barra de caminho. A função recusa o convite se estiver em falta, antes de criar a empresa.
5. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` podem sobrescrever o projecto público definido no código. **Não usar service_role no frontend.**
6. Confirmar a conta Super Admin verificada em `public.platform_admins`; nunca conceder esta função ao email sem verificar que a conta realmente foi confirmada.

## Testes E2E ainda obrigatórios
- Super Admin autorizado entra; sem autorização não entra.
- Ao seleccionar Talhos/Farmácias, visualiza só as empresas do sector.
- Criar um talho e receber convite do administrador no email correcto.
- Administrador aceita e define palavra-passe; só vê os dados da própria empresa.
- Administrador cria operador de caixa e stock; operadores não conseguem gerir a empresa nem entrar no Super Admin.
- Uma empresa A não vê listas/filiais/equipa da empresa B.
- Falha de convite, email repetido, licença suspensa e limites de utilizadores são tratados sem expor dados.
- Verificar segurança do Supabase, SMTP, redireccionamentos, UX em dispositivo real e testes de concorrência.

## Limitações actuais
- Convites têm efeitos externos e só devem ser accionados quando o domínio e SMTP estiverem operacionais.
- O fluxo de criação de uma empresa ainda tem operações sequenciais e não uma transacção única; situações de falha parcial devem ser reconciliadas antes de comercialização.
- O painel empresarial ainda não permite editar/desactivar colaboradores reais nem gerir todas as filiais a partir do servidor.
- Os perfis Caixa/Stock têm conta e associação, mas **não têm ainda POS financeiro real**.
- Ainda não foi validado o login completo nem o convite com pessoas reais. **Não fazer merge nem vender como sistema pronto** antes dos ensaios.

## Componentes principais
- `src/components/SuperAdminAuthGate.tsx`
- `src/components/SuperAdminLive.tsx`
- `src/components/CompanyAuthGate.tsx`
- `src/components/CompanyLive.tsx`
- `src/lib/supabase-company-auth.ts`
- `supabase/functions/create-tenant-admin/index.ts`
- `supabase/functions/invite-tenant-operator/index.ts`
