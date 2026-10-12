# Ubuntu POS 360 — fluxo de demonstração e piloto Supabase (12/10/2026)

## Objectivo implementado
1. **Ubuntu Service:** `/super-admin` autentica a conta privilegiada e abre empresas reais agrupadas por Farmácia, Talho, Restaurante, Bar, Padaria, Grossista ou Loja.
2. **Super Admin:** ao seleccionar sector e criar empresa, o backend `create-tenant-admin` cria tenant, filial Sede, licença piloto e atribuição sectorial; envia convite para o administrador responsável.
3. **Administrador do comerciante:** recebe o convite e define a sua própria palavra-passe em `/empresa`. Vê só a sua empresa e filiais, cria colaboradores por convite e pode cadastrar produtos/preços/stock de uma filial.
4. **Operador de caixa:** aceita convite em `/empresa`, entra com identidade própria e vê a filial autorizada. Abre turno de caixa, selecciona artigos, introduz dinheiro recebido, vê troco e regista vendas em dinheiro.
5. **Supabase:** `pos_cash_sale` valida empresa, filial, licença, operador e abertura de caixa, calcula preços exclusivamente no servidor, verifica stock sob bloqueio transaccional, gera venda e linhas, baixa stock e evita duplicação por `client_request_id`.
6. **Outros perfis:** Gerente e Supervisor podem abrir o caixa piloto; Stock pode consultar produtos da sua filial; administração de colaboradores continua limitada ao administrador da empresa.

## Arquitectura e segurança
- Supabase Auth com JWT de pessoa real; nunca guardar palavras-passe dos funcionários no frontend.
- RLS nos 14 objectos `public` (10 da fundação mais 4 do POS piloto).
- Operadores autenticados **não** têm permissão para gravar vendas directamente ou executar a função financeira SQL. A Edge Function `pos-cash` verifica JWT e invoca RPC de serviço, que valida o actor e a filial.
- Produtos de cada empresa/filial separados por `tenant_id` e `branch_id`.
- Operações financeiras **apenas dinheiro físico e recibo não fiscal** nesta etapa; sem processamento de M-Pesa/e-Mola/cartão, dados de medicamentos regulamentares ou integrações de balanças.
- Cada empresa pode ter plano e módulo vertical exclusivo; loja e talho não partilham registos.

## Configuração que falta porque a aplicação ainda não foi publicada
1. Criar uma **publicação de testes HTTPS** no Lovable (não é necessário anunciar a clientes).
2. Em Supabase Auth, configurar Site URL e URLs permitidas para `/super-admin` e `/empresa` no domínio de testes.
3. Nas Edge Function Secrets configurar `POS_APP_URL=https://dominio-de-testes` (sem caminho) para impedir convites com redireccionamento inadequado.
4. Configurar SMTP para emails de convite e testar o primeiro convite empresarial e o convite do caixa.
5. Testar dois tenants distintos em browsers/dispositivos diferentes, de preferência com utilizadores fictícios de teste consentidos, e confirmar RLS negativa.
6. Submeter os fluxos ao teste de balcão, reconciliação de caixa e adequação fiscal moçambicana.
7. Validar módulos avançados Farmácia/Talho/Restaurante que continuam nas telas demonstrativas até integração completa.

## Critérios de aceitação antes de fazer merge/publicar comercialmente
- CI TypeScript, Vitest e build em verde.
- Utilizador não autorizado não entra no Super Admin.
- Caixa só abre a própria filial; a função `pos_cash_sale` recusa credenciais inválidas e stock insuficiente.
- Não há vendas directas por PostgREST autenticado; RPC financeira só service_role.
- Convite e definição de palavra-passe chegam ao URL exacto `/empresa`.
- Nenhuma venda demonstrativa anterior é importada automaticamente.
- Alerta Supabase: activar protecção contra palavras-passe comprometidas e rever 3 funções `SECURITY DEFINER` expostas (ver painel Advisors).

**Não chamar a este POS completo ou fiscal. A base do fluxo pedido está pronta para validação num ambiente de testes; a operação comercial exige os passos finais.**
