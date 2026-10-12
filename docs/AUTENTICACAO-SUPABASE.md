# Ubuntu POS 360 — activação segura do primeiro Super Admin

## Âmbito e estado
Esta entrega inicial protege o acesso a `/super-admin` com Supabase Auth e verifica a autorização em `public.platform_admins`.
Não liga ainda os formulários existentes de empresas, filiais e operadores ao backend: continuam demonstrativos na interface interna. Não utilizar dados comerciais reais até à integração completa.

## Configuração do frontend (Lovable / host)
- `VITE_SUPABASE_URL=https://ahxzcfelywmsegozqomc.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key do projecto ubuntupos360>`

A publishable key é própria para clientes públicos quando o RLS está activo. **Nunca** usar `service_role` no frontend.
Na ausência destas variáveis, a rota Super Admin permanece bloqueada, sem acesso à demonstração administrativa.

## Primeiro Super Admin
1. A autorização inicial foi registada **directamente no schema privado** `internal.first_admin_allowlist`; o email aprovado **não consta deste repositório público**.
2. No Dashboard Supabase, abrir **Authentication > Users > Invite user** e enviar o convite para o endereço previamente autorizado.
3. Antes de enviar, configurar **Authentication > URL Configuration**: o Site URL e o destino de redireccionamento do convite devem apontar para o domínio HTTPS publicado, com acesso a `/super-admin`. O fluxo actualmente implementado processa os tokens de convite no fragmento do URL (fluxo implícito).
4. Ao clicar no convite e confirmar o endereço, o trigger `internal.authorize_verified_initial_admin` atribui a função `platform_admins` apenas ao primeiro utilizador com email confirmado e previamente autorizado.
5. A aplicação abre o ecrã para definir palavra-passe (mínimo de 12 caracteres). Depois valida a sessão e a autorização no servidor.
6. Confirmar que `select count(*) from public.platform_admins;` retorna 1. Nunca partilhar palavra-passe nem tokens de autenticação em conversas ou tickets.

Nota: o Supabase precisa de SMTP e URLs de email correctamente configurados para enviar convites e disponibilizar links válidos. A app só trata a variante de redireccionamento com `#access_token` e `#refresh_token`.

## Criar uma empresa e enviar o acesso empresarial
A Edge Function `create-tenant-admin` está instalada com `verify_jwt=true`. Só aceita o JWT de um utilizador que já consta em `platform_admins`.
O procedimento no backend cria empresa, Sede e licença em teste, acrescenta o módulo sectorial e convida o primeiro administrador por email.
**Não está ainda ligada ao formulário de criação do Super Admin.**
A publicação comercial depende ainda de unificar funcionários, operações sectoriais e autorização real entre perfis, de segurança de pagamentos/stock e de testes de ponta a ponta.

## Próximos passos
- Integrar formulário de empresas com a função autenticada, apresentar resultados reais e tratar convites já existentes.
- Integrar login da empresa e onboarding de funcionários com credenciais individuais; proteger também as rotas `/empresa` e `/`.
- Rever o fluxo do convite quando não houver URL de retorno válido; tornar o provisionamento transaccional e idempotente.
- Executar testes automatizados, RLS negativas e testes de fluxos no navegador antes de qualquer merge/publicação.
