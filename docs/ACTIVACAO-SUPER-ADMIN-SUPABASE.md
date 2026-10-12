# Ubuntu POS 360 — Activação inicial do Super Admin

A estrutura multiempresa está criada no projecto Supabase `ubuntupos360`. Não existe uma conta Super Admin pré-criada: é obrigatório comprovar a titularidade do endereço de email via Supabase Auth antes de atribuir privilégios.

## Passos de activação (sem revelar palavras-passe)

1. No Supabase Dashboard, abrir **Authentication → Users → Invite user** e convidar **o endereço aprovado pelo proprietário**. Não adicionar passwords de demonstração nem gerar uma conta pelo SQL.
2. O titular deve abrir a mensagem de convite, aceitar e concluir a verificação do email. É necessário configurar no Supabase Auth os endereços de redireccionamento permitidos para a futura página de login da aplicação.
3. Após confirmação, um operador autorizado pode atribuir o perfil de Super Admin com a seguinte consulta SQL no editor autenticado do projecto. Substituir `EMAIL_AUTORIZADO` somente no editor do Supabase; não guardar o endereço na migração pública:

```sql
-- Verificar primeiro se a conta existe e já confirmou o email.
select id, email, email_confirmed_at
from auth.users
where lower(email) = lower('EMAIL_AUTORIZADO');

-- Após verificar titularidade: criar privilégio exactamente para uma conta confirmada.
insert into public.platform_admins (user_id)
select id from auth.users
where lower(email) = lower('EMAIL_AUTORIZADO')
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Confirmar o resultado (deve devolver uma linha).
select pa.user_id, u.email
from public.platform_admins pa
join auth.users u on u.id = pa.user_id
where lower(u.email) = lower('EMAIL_AUTORIZADO');
```

4. Testar uma sessão autenticada com e sem a associação `platform_admins`. Apenas a primeira pode chamar `create-tenant-admin`.
5. Ligar a página `/super-admin` à autenticação Supabase e ao CRUD real. Até essa ligação, a página é apenas uma demonstração local e **não** pode receber dados de empresas reais.
6. Testar convite do administrador de um negócio, separação de tenants, acesso negado entre empresas e encerramento de sessão.

## Segurança

- O email sozinho **não** concede direitos administrativos; confirmar autenticação e titularidade no Supabase antes da atribuição.
- Não incorporar `service_role` no frontend, GitHub, localStorage ou bundles.
- A função `create-tenant-admin` requer sessão com JWT e verifica `platform_admins` no servidor; a configuração SMTP/redireccionamentos continua necessária para enviar convites.
- O projecto público não deve incluir endereços pessoais dos administradores ou palavras-passe.
- No momento da escrita deste documento, ainda faltam login React com Supabase, aceitação de convite, associação de filiais e testes E2E com utilizadores reais.
