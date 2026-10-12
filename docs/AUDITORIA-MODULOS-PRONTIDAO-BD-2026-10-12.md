# Auditoria de módulos e prontidão para a base de dados — Ubuntu POS 360
**Data:** 12/10/2026  
**Repositório:** `ubuntuservice01/ubuntu-point-of-sale`  
**Revisão analisada:** `579bfb17ce367616dacdef0eaf374aec952e6df3` (`main`)  
**Âmbito:** frontend React/Lovable, workspace do comerciante, Super Admin, serviços sectoriais, gestão de operadores e fronteira para futura integração Supabase.  
**Método:** leitura do código e dos testes versionados, mais resultado de CI no GitHub. **Não foram executados testes físicos de hardware nem auditoria regulatória.**

## Veredicto

**Ainda NÃO está pronto para activar o Supabase como backend de produção.** O frontend dispõe de muitos fluxos demonstrativos funcionais, mas existem lacunas estruturais de isolamento multiempresa, catálogo público, direitos do operador, cobertura sectorial e pagamentos específicos dos sectores.

**Já é possível iniciar o DESENHO do esquema da base de dados** (entidades, relações, tenancy e RLS), desde que os fluxos abaixo sejam especificados e aceites primeiro. Não criar tabelas definitivas a partir da demonstração sem modelar eventos e regras transaccionais.

### Evidência técnica da revisão
- GitHub Actions [execução 38206778357](https://github.com/ubuntuservice01/ubuntu-point-of-sale/actions/runs/38206778357): TypeScript, **238/238 testes** e compilação de produção aprovados.
- Os testes aprovados confirmam o comportamento *codificado* e coberturas específicas; **não provam** completude das necessidades reais nem segurança multiempresa.
- Fonte principal: `src/lib/business-workspace.ts`, `src/components/UbuntuApp.tsx`, `src/components/SectorOperations.tsx`, `src/components/SuperAdminApp.tsx`, `src/components/PublicCatalog.tsx`, `src/lib/sectors.ts`, `src/lib/admin-demo.ts`, `src/lib/operators.ts`, `src/components/CompanyAdminApp.tsx`.

## 1. O que significa atribuir um módulo ao comerciante?

No Super Admin, o comerciante recebe **um plano** e uma lista de adicionais. O plano básico demonstrativo inclui `pos`, `stock`, `clientes`, `relatorios`. Os planos superiores incluem recursos adicionais.

Ao escolher o sector **Farmácia**, **Talho**, **Restaurante**, **Bar**, **Padaria** ou **Grossista**, o sistema acrescenta o módulo sectorial obrigatório correspondente (`farmacias`, `talhos`, etc.). O espaço do comerciante apresenta o módulo específico e as secções comuns incluídas no plano, se a licença estiver activa/em teste e o perfil do operador permitir.

**Isto NÃO dá acesso automaticamente a todos os outros módulos da plataforma**, nem a funcionalidades que ainda não foram implementadas. O código restringe a **um sector especializado principal por comerciante**: módulos verticais de outros sectores são excluídos do workspace (`SECTOR_MODULE_IDS` em `src/lib/business-workspace.ts`).

### Exemplos observados

| Empresa / sector | Serviços específicos disponíveis no frontend | Serviços comuns quando contratados e permitidos pelo perfil |
|---|---|---|
| Farmácia | Recepção de lote, validade, FEFO, dispensa, histórico | POS e Caixa Rápido, produtos, inventário, compras, fornecedores, caixa, clientes/fiado, devoluções, relatórios |
| Talho | Venda por kg, corte/transformação, quebra, histórico | POS, caixa, produtos, stock, compras, clientes, devoluções, relatórios |
| Restaurante | Mesas, comandas, estados de preparação/serviço, registo de pagamento, histórico | POS, caixa, produtos, stock, compras, clientes, relatórios |
| Bar | Mesas, comandas, estados, pagamentos e histórico | POS, caixa, produtos, stock, compras e relatórios |
| Padaria/Produção | Receitas/formulações, ingredientes, produção, consumo de stock e custos estimados | POS, caixa, compras, produtos, relatórios |
| Grossista | Escalões de preços, pedidos por volume, reserva, expedição e entrega | POS, stock, caixa, clientes/fiado, compras, relatórios |
| Loja/Mercearia | Sem submódulo sectorial obrigatório | POS, caixa, stock, compras, clientes, relatórios |
| Catálogo digital, entregas e fidelização | Fluxos em componentes próprios quando esses adicionais são contratados | Estão dependentes dos respectivos adicionais e do perfil |

**Atenção:** um gerente não ganha acesso a módulos não contratados, e um caixa não ganha acesso irrestrito apenas porque a empresa os contratou.

## 2. Farmácia: por que aparecem tão poucas opções?

`src/components/SectorOperations.tsx` apresenta na própria página especializada:
- «Produtos» (atalho para o cadastro comum);
- «Receber lote» (entrada de unidades e validade);
- «Inventário por lote» (estado e pesquisa, FEFO);
- «Registar dispensa» (só fica disponível quando existem lotes válidos com stock);
- «Histórico de dispensas».

Os demais serviços **não ficam dentro de um único submenu de Farmácia**: estão separados no menu do comerciante e nos atalhos da página inicial. Para um estabelecimento novo, sem produtos e lotes, a dispensa estará desactivada, o que pode criar a impressão de que o módulo oferece apenas recepção de stock.

**Faltam para uma solução farmacêutica completa:** operações de receita/prescrição e validação profissional, medicamentos sujeitos a controlo especial, devolução e quarentena de lotes, bloqueio/recall, vínculo robusto lote–fornecedor–factura de compra, relatórios de validade/lotes e auditoria regulamentar. O frontend não deve prometer conformidade farmacêutica ou fiscal.

## 3. Lacunas de alta prioridade

| ID | Gravidade | Evidência | Impacto | Resolução necessária |
|---|---|---|---|---|
| **P0-01** | Bloqueante | `PublicCatalog.tsx` utiliza a chave global `storeKey` (`ubuntu-pos360-demo-v1`), sem parâmetro `tenant`; `/catalogo` também não identifica empresa | A montra pública não corresponde à empresa escolhida e não garante isolamento do catálogo; encomendas gravadas numa demonstração geral | Fazer catálogo público por comerciante com URL/tenant e leitura de catálogo autorizado; depois RLS por tenant |
| **P0-02** | Bloqueante | `/super-admin` e `/empresa` operam a partir de `localStorage`, sem autenticação/validação de licença no servidor | Não existem limites reais de utilizadores, perfis, acesso administrativo ou isolamento entre comerciantes | Auth, perfis, RLS, API verificada e autorização explícita no servidor antes da publicação comercial |
| **P0-03** | Bloqueante | `useOfflineStore` guarda operações locais; `offline-model` prepara revisão e idempotência mas não tem servidor para confirmar | Sem reconciliação segura, uma venda offline pode não ser recuperada por outra máquina, e conflitos não são resolvidos | Protocolo transaccional idempotente, fila confirmada, revisão/versionamento, regras multi-loja |
| **P1-01** | Alta | `roleCanSection` e `allowedSection` dão acesso de caixa à especialidade do seu sector; `SectorOperations` apresenta tanto vendas como operações de stock/lotes/cortes | Um perfil «Caixa» pode aceder a acções sensíveis do sector porque a autorização é pela página, não pela acção | Separar capacidades e operações (dispensar vs. receber lote; vender vs. transformar carne; editar preços vs. consultar), autorizar cada acção |
| **P1-02** | Alta | `registerPharmaDispense`, `registerWeightedSale` e `finishServiceOrder` registam venda a dinheiro sem `cashReceived` ou `cashChange` | O histórico e recibo não terão troco para essas vendas, ao contrário do POS normal e Caixa Rápido | Reutilizar o fluxo único de recebimento e troco em todos os sectores |
| **P1-03** | Alta | `MODULE_CATALOG` anuncia `filiais`, `offline`, `balancas`, `auditoria` e `assistente`, mas não há correspondência directa em `moduleSections`. Alguns recursos existem globalmente ou noutros painéis; outros são apenas propostas | O comerciante pode contratar um adicional sem obter uma função equivalente no seu painel | Classificar cada módulo como funcional / parcial / planeado e mapear licenças a rotas, permissões e operações reais |
| **P1-04** | Alta | `src/components/CompanyAdminApp.tsx` mantém funcionários/perfis/configurações em demo separado e informa que os perfis/configurações ainda não afectam o POS; `operators` é outra fonte local | Duas administrações inconsistentes: colaborador criado na empresa não é necessariamente operador do POS | Unificar identidade, equipa, filial e permissões num modelo único antes de RLS |
| **P1-05** | Alta | `registerPharmaLot` incrementa stock global mas não se liga automaticamente a uma compra/fornecedor; modelo tem `supplierId` opcional que o formulário não fornece | Falta reconciliação e rastreabilidade de entradas farmacêuticas; risco de dupla entrada | Fluxo único de compra/recepção/lote, fornecedor, documento, discrepâncias e reversões |
| **P1-06** | Alta | Venda em cada vertical chama funções especializadas próprias; o POS partilha outros mecanismos (venda, troco, historial) | Regras comerciais podem divergir: descontos, devoluções, operação de caixa, permissões, lote e lucro | Criar contratos de venda comuns e especializações explícitas (lote/peso/comanda), sem lançar venda duas vezes |
| **P2-01** | Moderada | Talho introduz peso manual e regista transformação/quebra, sem balança real ou rastreabilidade sanitária | Não corresponde ainda a talho integrado com equipamentos | Testar com balanças, custos de cortes, lotes/validade e etiquetas |
| **P2-02** | Moderada | Restaurante/Bar registam comandas e etapas mas não imprimem ordens na cozinha nem fazem operações avançadas de conta | Serviço básico demonstrativo, não gestão integral de restaurante | Impressora de cozinha, anulação aprovada, transferência/divisão de mesas e conta, conforme prioridades |
| **P2-03** | Moderada | Testes automáticos aprovam rotas e regras implementadas, mas não existem ensaios com impressoras 58/80 mm, leitores USB reais, balanças, dispositivos offline reais | Faltam provas de utilização operacional contínua | Pilotos assistidos, dispositivos físicos e testes de recuperação de falhas |

## 4. O que já está consistente e vale aproveitar

- **Licenciamento frontend:** `resolveBusinessWorkspace()` combina plano + adicionais + sector, bloqueia licenças suspensas/expiradas e constrói menu contextual.
- **Isolamento local demonstrativo:** `useOfflineStore(tenantId)` separa os dados comerciais no navegador por empresa; testes asseguram que vendas de uma empresa não aparecem noutra no armazenamento local. **Não é segurança RLS.**
- **Farmácia:** rotinas FEFO recusam dispensar lote expirado e verificam stock válido.
- **Talho:** vendas com fracções de kg, transformações e desperdício têm validações de stock e unidade.
- **Bar/Restaurante:** comandas reservam stock e geram venda ao concluir.
- **Padaria/Grossista:** operações de produção, escalões e encomendas estão implementadas em serviços próprios.
- **POS:** leitor de códigos com bip e suporte teclado USB; Caixa Rápido; valor recebido/troco e recibos não fiscais; modo offline local.
- **Operadores:** quatro perfis demonstrativos e aprovação local por PIN, com limitações declaradas de segurança.
- **Qualidade automática:** build e 238 testes concluíram com sucesso na revisão analisada.

## 5. Critérios antes de consolidar a base de dados

**Porta A — Contratos funcionais de frontend:**
1. Aprovar matriz por sector: o que está INCLUÍDO no módulo e o que será um adicional opcional.
2. Disponibilizar navegação coerente e atalhos para todos os serviços contratados e permitidos ao perfil.
3. Decidir se uma empresa pode ter mais de uma vertical (ex.: loja + talho). Hoje só tem uma.
4. Corrigir P1-01, P1-02 e P1-06: autorização por acção e fluxo financeiro único.
5. Definir processos completos para farmácia (lotes, compras, validade, devoluções, receitas/controlados quando aplicáveis).
6. Concluir/retirar do catálogo os adicionais que ainda são conceitos.
7. Integrar catálogo online com o tenant e confirmar encomendas a partir de outro dispositivo.

**Porta B — Desenho da base de dados:**
1. Modelo normalizado: tenants, filiais, utilizadores, papéis/permissões, produtos, preços, unidades, fornecedores, compras/linhas, lotes, stock_movements, vendas/linhas, pagamentos, fiado, devoluções, caixas e turnos, pedidos, comandas, produção, auditoria e licenças.
2. Identificadores de tenant e filial obrigatórios nos registos relevantes; validação server-side e RLS.
3. Mecanismo de idempotência e conflitos no envio offline, incluindo teste de concorrência.
4. API transaccional de venda que debita stock/lotes, regista receita e movimentos exactamente uma vez.
5. Planos, direitos e limites de utilizadores/filiais aplicados no servidor.
6. Segurança e recuperação: backups, migrações, logs de auditoria e recuperação após falhas.

**Porta C — Produção/comercialização:**
1. Testes E2E por perfil e sector, incluindo negação de acessos proibidos.
2. Testes reais no balcão com scanner, impressora, internet intermitente e fecho de caixa.
3. Validação fiscal moçambicana e, para farmácias e talhos, requisitos profissionais/regulamentares aplicáveis.

## Próximo trabalho recomendado

**Prioridade imediata:** fechar a matriz de cada sector e corrigir as inconsistências P0/P1 no frontend, antes de fixar o esquema Supabase. Depois disso pode iniciar a implementação controlada do backend, mantendo a demo intacta até os testes de migração e isolamento multiempresa passarem.

**Veredicto binário:** desenho lógico da base de dados: **SIM, já podemos preparar**; ligar o sistema ao Supabase como solução pronta a vender: **AINDA NÃO**.
