# Ubuntu POS 360 — Frontend do Super Admin (fase pré-Supabase)

## Âmbito
Interface separada em **`/super-admin`**. A loja permanece em **`/`**. O acesso entre os dois ecrãs é demonstrativo; **não há autenticação nem permissões reais**.

Os dados estão em `localStorage` sob `ubuntu-pos360-super-admin-demo-v1`. Toda empresa mostrada inicialmente é fictícia e os endereços acabam em `exemplo.invalid` para que não sejam confundidos com domínios reais.

## Ecrãs implementados
1. **Visão geral**: empresas, licenças activas e em teste, projecção mensal, vencimentos próximos e actividade.
2. **Empresas**: pesquisa, filtros, criação e edição de organizações; ficha com separadores Resumo, Módulos, Licença.
3. **Planos**: criação e edição de preços ilustrativos, limites de filiais e utilizadores, módulos incluídos.
4. **Licenças**: estados de demonstração, datas, renovação simulada de 7, 30 ou 365 dias, suspensão e reactivação simuladas.
5. **Módulos**: catálogo por sector e capacidade; associação de módulos por empresa através da ficha.
6. **Subscrições**: projecção mensal/anual, baseada exclusivamente nas empresas *activas*. Não existem pagamentos reais.
7. **Auditoria**: operações locais listadas em ordem recente, pesquisa e exportação CSV.
8. **Definições**: características do ambiente e reposição dos dados demonstrativos.

## Modelo de dados
Arquivo `src/lib/admin-demo.ts` define:
- `AdminTenant`, com estado de licença, identificador de subdomínio, plano, filiais e módulos adicionais.
- `AdminPlan`, com preço, módulos incluídos, limite de filiais e utilizadores.
- `ModuleDefinition`, catálogo e valor adicional ilustrativo.
- `AdminEvent`, movimentos das acções simuladas.

As funções de validação, cálculo de expiração e projecções monetárias são **puras** e possuem testes.

## Contratos a implementar no Supabase
- `tenants`: criação/estado da organização, dados e identidade.
- `branches`, `tenant_memberships`, `roles`, `permissions`: filiais e controlo de acesso.
- `plans`, `modules`, `plan_modules`, `tenant_addons`: planos e módulos disponíveis.
- `subscriptions`, `licenses`, `subscription_events`: estados, renovação e períodos.
- `audit_logs`: trilho de operações persistido e protegido.
- `invoices`, `payments`: somente após decisões fiscais, comerciais e integração real.

### Regras de segurança obrigatórias
- O frontend **nunca é fonte de autoridade** para um estado de licença, plano, cobrança ou tenant.
- Todas as decisões críticas devem ocorrer no servidor e em transacções.
- O perfil Super Admin só pode ser obtido por autorização verificada no servidor.
- A separação real dos tenants deve ser implementada com PostgreSQL RLS e testada negativamente entre empresas.
- Os identificadores públicos precisam de resolução e provisionamento seguro por DNS wildcard e HTTPS.
- Suspender ou expirar uma licença deve respeitar a política de consulta e exportação, a definir antes da produção.
- O histórico de auditoria real não deve poder ser adulterado por um cliente.
- Nunca registar palavras-passe nem chaves no frontend ou no repositório.

## Critérios de validação de UX
- Todos os caminhos entre Super Admin e loja funcionam.
- Cadastro e edição validam campos e limites.
- Os prazos são calculados corretamente, inclusive em meses diferentes.
- Os módulos herdados do plano não podem ser retirados pela caixa de seleção de adicionais.
- Projecções têm identificação explícita de que **não são facturação**.
- O tema é claro, com textos em português de Moçambique, navegação responsiva e indicadores reais dos dados simulados.

## Próximas entregas frontend
Administração empresarial por filial, perfis e permissões, operações de caixa e relatórios detalhados. Depois da validação de fluxos, construir o backend multitenant.
