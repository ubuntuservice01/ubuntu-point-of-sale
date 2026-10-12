# Auditoria de módulos, licenciamento e prontidão para a base de dados — Ubuntu POS 360
**Data:** 12/10/2026  
**Revisão analisada:** `2b0070e22050585146293c1420f1b313f7e9be69` (branch `main`)  
**Responsável pelo produto:** Ubuntu Service, Lda.  
**Tipo:** revisão estática do código e da pipeline de testes; **não inclui** ensaio manual em browser, impressoras, scanner, servidor de produção ou validação legal.  
**Alterações ao Supabase:** nenhuma.

## Parecer executivo

**NÃO APROVADO para activação da base de dados e comercialização como plataforma SaaS multiempresa.**  
**APROVADO para avançar com DESENHO da arquitectura de dados**, desde que os bloqueios de produto e de segurança abaixo sejam resolvidos antes do esquema definitivo e da migração de operações.

A demonstração tem funcionalidades reais no frontend: vendas, stock, compras, fornecedores, clientes, fiado, caixa, devoluções, despesas, relatórios, alertas, operadores locais, impressões não fiscais, produção, grossistas, sectores, encomendas e catálogo. **Todavia, os planos e módulos do Super Admin não limitam nem activam automaticamente a aplicação do comerciante.** Existem estados locais separados para `/super-admin`, `/empresa?tenant=...` e `/`.

O fluxo de Farmácia está concentrado em recepção de lotes, FEFO, dispensa e histórico; não equivale a um sistema de gestão farmacêutica completo. O mesmo vale para os restantes verticais, ainda em demonstração.

**Pipeline analisada:** GitHub Actions `38175955190`: TypeScript, 35 ficheiros de testes, 221 testes aprovados e build de produção sem erro. Isto não atesta isolamento entre tenants, permissões no servidor, operação real em multi-dispositivo ou conformidade fiscal.

## A. Atribuição de módulos por comerciante: falha bloqueante

### Situação observada
1. `src/lib/admin-demo.ts` define o catálogo comercial de 18 módulos, os planos e `assignedModules(tenant,plan)`, calculando a união entre módulos do plano e adicionais.
2. `src/components/SuperAdminApp.tsx` apresenta opções de módulos por empresa e `toggleAddon`, mas guarda-as no `localStorage` do próprio navegador (estado demonstrativo).
3. `src/components/CompanyAdminApp.tsx` carrega a empresa por `?tenant=`, lê o seu workspace local e apresenta filiais, funcionários, perfis e configurações. **Não recebe nem aplica `assignedModules` para controlar os serviços que o comerciante usa.** O link para `/` não passa um tenant autenticado.
4. `src/components/UbuntuApp.tsx` utiliza um `Store` local único, com produtos, vendas e todas as entidades da demonstração. As secções do menu são filtradas por `roleCanSection` e não pelos módulos contratados. As empresas registadas no próprio POS ficam noutro array (`data.companies`) distinto do Super Admin.
5. **Os papéis locais** (`src/lib/operators.ts`) são gerente, supervisor, caixa e stock. Não há ligação efectiva com funcionários e perfis personalizáveis de `src/lib/company-demo.ts`.

### Consequências
- Atribuir `farmacias` a uma empresa **não disponibiliza automaticamente** um dashboard de Farmácia nem um conjunto validado de serviços comuns + sectoriais.
- Um gerente do POS demonstrativo pode navegar por todos os sectores, mesmo sem o adicional contratado.
- Desactivar ou suspender uma licença no Super Admin não bloqueia de forma segura o acesso ao POS.
- O comerciante não possui um catálogo nem movimentos próprios isolados por tenant e por filial.
- Os perfis personalizados do painel da empresa não restringem as acções dentro do POS.

### Critério de aceitação obrigatório
**Empresa criada/activada no Super Admin → plano + módulos atribuídos → responsável autenticado → dashboard de empresa → módulos comuns e específicos apresentados conforme contrato → operações validadas por tenant, filial, perfil e licença no servidor.**  
Ao retirar um módulo ou suspender a licença, o acesso ao módulo e às respectivas mutações deve ser negado no servidor e no frontend. Dados históricos ficam íntegros e acessíveis conforme política de retenção.

## B. Auditoria por área

| Área | Já existe no frontend | Lacunas para comércio real | Avaliação |
|---|---|---|---|
| POS / Caixa Rápido | Vendas demonstrativas, scanner USB/câmara, bip, dinheiro recebido/troco, métodos de pagamento, comprovativo não fiscal, caixa | Operação transaccional no servidor, confirmação de pagamentos, emissão fiscal, segurança, hardware físico | **Funcional na demo; incompleto para produção** |
| Stock / Compras / Fornecedores | Produtos, preços/custo, movimentos, entradas, compras, fornecedores, fiado fornecedor | Várias filiais/armazéns com saldos transaccionais, inventário físico/reconciliação, conflitos offline, autorização server-side | **Parcial** |
| Clientes / Fiado / Caixa / Relatórios | Vendas, dívidas, recebimentos parciais, turnos, despesas, lucros/margens estimados, CSV | Histórico imutável, prova de pagamentos, auditoria de caixa por operador/filial, fiscalidade | **Parcial** |
| Farmácia | Recepção e inventário por lotes, validade, alertas, dispensa FEFO, histórico de dispensas | POS farmacêutico unificado com scan, prescrição, rastreio legal, devoluções/quarentena, fornecedores ligados a lotes, relatórios específicos, segurança/legislação | **Parcial; não é módulo completo** |
| Restaurante | Mesas, comandas, estados de preparação, reservas de stock e fecho demonstrativo | Cozinha/produção real, impressão KOT, empregados e turnos, fichas técnicas, ingredientes/consumos, divisões de conta e integração de pedidos | **Parcial** |
| Bar | Mesas/comandas e fluxo de atendimento semelhante ao restaurante | Doses, receitas, consumo de bebidas por volume, controlo de garrafas, perdas, comissões e POS especializado | **Parcial** |
| Talho | Venda em kg, cortes/transformações, quebras declaradas, histórico | Balanças integradas, etiquetas de peso, rastreabilidade/origem, lotes sanitários, custo por corte, devoluções especiais e relatórios | **Parcial** |
| Padaria/Produção | Receitas e ingredientes, custo estimado, produção e movimento de stock | Planeamento por lote/data, perdas/validade, ordens de produção, embalagens, insumos e custo industrial completo | **Parcial** |
| Grossistas | Preço escalonado, reserva/expedição/entrega de pedidos, clientes | Armazéns por filial, pagamentos/contas correntes robustas, quotas, crédito e logística multiempresa | **Parcial** |
| Catálogo online / Encomendas / Entregas | Montra demonstrativa, pedidos, estados, entregadores, regras de fidelização | **Pedidos não são partilhados entre navegadores**; falta catálogo real multi-tenant, entrega/checkout remoto, autenticação, confirmação de pagamento | **Parcial / bloqueio para canal público real** |
| Operadores | PIN local, perfis, gestão e aprovação demonstrativa | Identidades reais, RBAC no servidor, ligação aos funcionários/filiais da empresa, políticas RLS e auditoria inviolável | **Parcial / bloqueio de segurança** |
| Super Admin / Empresa / Licenças | Cadastro demonstrativo, planos, adicionais, licenças, filiais, funcionários | Ligações reais tenant–plano–módulos–licença–roles–POS, autenticação e controlo centralizado | **Não integrado / bloqueio crítico** |
| Offline / PWA | Cache da rota inicial e IndexedDB; fila de alterações pendentes | Sincronização real não existe, prevenção de duplicados do lado do servidor, resolução de conflitos e confirmação durável de vendas | **Preparação apenas** |
| Balanças / Assistente IA | Opções no catálogo comercial | Não existem integrações comprovadas equivalentes ao módulo anunciando; são capacidades planeadas | **Não comercializar como funcionais** |

## C. Farmácia: por que a interface mostra tão pouco?

**Código examinado:** `src/components/SectorOperations.tsx`, bloco `section==="farmacia"`; lógica de `src/lib/sectors.ts`.

As operações **efectivamente disponíveis no sector** são:
- Entrada/recepção de lote, número, validade e quantidade;
- Lista de inventário por lote, saldos, pesquisa e avisos a expirar/vencidos;
- «Registar dispensa» — botão dentro do painel de inventário, dependente de lotes válidos disponíveis;
- Dispensa com alocação automática **FEFO** e movimentos de venda/stock;
- Histórico de dispensas.

«Produtos» envia para o módulo comum `products`; outros serviços (caixa, fornecedores, compras, clientes, relatórios) estão em secções genéricas e **não aparecem como submenus organizados sob Farmácia**, nem estão associados contratualmente à empresa Farmácia. O POS genérico impede vender produtos com lotes, encaminhando para a dispensa farmacêutica. Isto protege o FEFO na demonstração, mas implica que **a câmara/scanner do Caixa Rápido não formam ainda um POS farmacêutico completo**.

### Menu-alvo recomendado ao comerciante farmacêutico
1. **Painel da Farmácia:** vendas, lotes, validade, margens, fiado, caixa.
2. **Venda / Dispensa:** pesquisa e scanner, lotes FEFO, requisitos de receita por produto e identificação de operador, pagamento e comprovativo.
3. **Medicamentos / Produtos:** cadastro, classes, preços/custos, códigos, stock mínimo.
4. **Stock e Lotes:** entradas, saídas, transferências, quarentena, inventário, ajustes autorizados, vencimentos.
5. **Compras e Fornecedores:** recepção vinculada a compra, factura de compra, lote e fornecedor.
6. **Clientes / Fiado:** conforme regras de privacidade e dados mínimos necessários.
7. **Caixa e Pagamentos:** abertura, fecho, turnos, reembolsos e divergências.
8. **Relatórios:** vendas, rentabilidade estimada, lotes, expiração, perdas, compras.
9. **Operadores / Permissões / Auditoria** conforme plano e função.

Não integrar prescrição real, medicamento controlado, dados de pacientes ou documentos fiscais sem análise técnica e jurídica específica para Moçambique.

## D. Arquitectura a fechar ANTES de activar Supabase

### P0 — bloqueios obrigatórios
- **Identificadores canónicos de módulos:** mapear `farmacias` → `farmacia`, `restaurantes` → `restaurante`, `padarias` → `producao`, etc.; definir dependências e direitos de cada módulo.
- **Entitlement por tenant:** tabela de módulos, planos, subscrições, módulos atribuídos, validade, estados e funcionalidades base. A mesma regra alimenta sidebar, páginas e operações.
- **Autenticação e RBAC reais:** Super Admin, empresa, filial e operadores; RLS em todas as tabelas. Não confiar no PIN ou `localStorage` como autorização.
- **Tenancy e filiais no domínio comercial:** `tenant_id` e `branch_id` nos registos pertinentes; impedir ler ou escrever outra empresa.
- **Integridade e sincronização:** vendas/pagamentos/stock/movimentos/fiado atomicamente no servidor, transacções idempotentes por `client_operation_id`, reconciliação dos movimentos offline; bloquear duplicações reais e inconsistências de stock.
- **Separação de ambientes:** dados da demonstração não devem migrar como vendas reais sem importação explícita e validada; preparação de backups e migração de esquema.
- **Fluxos transversais:** uma venda do Restaurante, Farmácia ou Talho tem de produzir o mesmo tipo de entidade contabilística de venda, movimentos de caixa, stock e relatórios, com informações sectoriais adicionais.

### P1 — preparação das áreas para empresas reais
- Completar o **núcleo comum** e os fluxos próprios de cada sector antes de anunciar o módulo como solução sectorial completa.
- Criar dashboards por tipo de comércio, mantendo todos os serviços comuns abrangidos pelo plano e apenas os adicionais contratados.
- Completar ligação entre empresa, filiais, funcionários, papéis e histórico de operações; registar `operator_id` no acto da transacção e `branch_id`.
- Estabelecer matriz de testes de aceitação para Loja, Farmácia, Talho, Restaurante, Bar, Padaria e Grossistas.
- Elaborar e validar requisitos de facturação, recibos, IVA e regras sectoriais aplicáveis com especialistas antes de utilizar documentos fiscais ou dados farmacêuticos reais.

### P2 — dispositivos e extras
- Ensaios em USB/ESC-POS, impressoras 58/80 mm, balanças, leitura de códigos, modo avião, dispositivos móveis.
- Integração efectiva de assistente IA, relatórios adicionais e demais módulos actualmente apenas anunciados.

## E. Critérios de aprovação para a próxima fase

| Teste de aceitação | Situação actual |
|---|---|
| Super Admin atribui Farmácia; empresa vê base comum + Farmácia | **Não demonstrado / não integrado** |
| Empresa sem Farmácia não abre Farmácia | **Não**; gerente local vê secções por papel |
| Suspender licença bloqueia acesso do tenant | **Não**; simulação apenas |
| Gerente da Farmácia só consulta vendas da sua empresa e filial | **Não**; Store demonstrativo partilhado localmente |
| Funcionário criado na Empresa entra no POS com o perfil correspondente | **Não**; dois sistemas de perfis separados |
| Farmácia vende com leitor, FEFO, pagamento e registo de lote consistente | **Parcial**; dispensa FEFO manual e caixa demonstrativo, sem fluxo integrado de scan/checkout |
| Compra de medicamentos liga fornecedor, entrada, lote e custo | **Parcial**; compras genéricas e recepção de lote separadas |
| Encomenda pública chega ao comerciante em outro dispositivo | **Não**; armazenamento local do navegador |
| Vendas offline de dois caixas sincronizam sem duplicar ou perder stock | **Não**; apenas fila de operações local |
| CI de frontend (TypeScript, testes e build) | **Sim**, 35 suites, 221 testes, execução `38175955190` |

## F. Estratégia de desenvolvimento recomendada

**Etapa A — terminar o desenho funcional do frontend por módulos** (contratos, menus e protótipos operacionais, sobretudo Farmácia; depois restantes sectores prioritários).  
**Etapa B — modelar o esquema relacional PostgreSQL/Supabase e a matriz RBAC/tenancy a partir desses contratos**, sem ainda mover dados da demonstração.  
**Etapa C — implementar autenticação, gestão de tenant, licenças e módulos e testar isolamentos RLS**.  
**Etapa D — integrar o núcleo transaccional (produtos, stock, clientes, caixa, vendas) e uma empresa piloto**.  
**Etapa E — integrar os módulos sectoriais e a fila offline com testes de concorrência, segurança, recuperação e aceitação por segmento**.

**Critério de passagem para produção:** os direitos dos módulos têm de ser aplicados pelo servidor; nenhuma operação de uma empresa pode consultar, actualizar ou facturar dados de outra; licenças expiram e bloqueiam correctamente; transacções e inventário devem conservar consistência; os requisitos legais aplicáveis devem estar validados.

---
### Referências do código analisado
- `src/lib/admin-demo.ts`, `src/components/SuperAdminApp.tsx` — catálogo de módulos e atribuição demonstrativa.
- `src/components/CompanyAdminApp.tsx`, `src/lib/company-demo.ts` — empresa, filiais, funcionários e perfis demonstrativos.
- `src/components/UbuntuApp.tsx`, `src/lib/operators.ts`, `src/lib/domain.ts` — aplicação POS, navegação, dados e operador local.
- `src/components/SectorOperations.tsx`, `src/lib/sectors.ts` — Farmácia, Restaurante, Bar e Talho.
- `src/components/ExpansionOperations.tsx`, `src/lib/expansion.ts` — Produção e Grossistas.
- `src/components/DigitalCommerce.tsx`, `src/components/PublicCatalog.tsx`, `src/lib/online.ts` — comércio digital.
- `src/lib/offline-db.ts`, `src/lib/offline-model.ts` — armazenamento IndexedDB e fila local.
- `src/routes/super-admin.tsx`, `src/routes/empresa.tsx`, `src/routes/index.tsx` — rotas demonstrativas sem autenticação server-side.
- GitHub Actions: https://github.com/ubuntuservice01/ubuntu-point-of-sale/actions/runs/38175955190 .
