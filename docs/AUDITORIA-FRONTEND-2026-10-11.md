# Auditoria do frontend — Ubuntu POS 360
**Data:** 11 de Outubro de 2026
**Produto:** Ubuntu POS 360 · Ubuntu Service, Lda.
**Fase:** frontend demonstrativo, **antes do Supabase**
**Tipos de verificação:** inspecção de código, inventário de navegação, testes de funções de domínio, testes de renderização de componentes React em jsdom, TypeScript, Vitest e compilação pelo GitHub Actions.

> **Limite:** Não foi executado um ensaio visual manual em navegador real (larguras de telemóvel, ecrã táctil, navegação por teclado completa ou captura de imagens). Os resultados dos testes automatizados **não** demonstram conformidade legal, segurança multiempresa ou usabilidade comprovada com pessoas.

## 1. Cobertura de ecrãs e rotas

### Rotas existentes e ligadas
| Rota | Interface | Estado |
|---|---|---|
| `/` | Painel do POS / gestão comercial | Renderiza e tem menu navegável |
| `/super-admin` | Super Admin da Ubuntu Service | Painel demonstrativo, sem autenticação |
| `/empresa` | Administração de empresa / filiais / equipa | Painel demonstrativo |
| `/catalogo` | Montra digital e carrinho | Funciona só no mesmo navegador do POS |

### Inventário do POS — 25 secções navegáveis
- Visão geral
- Ponto de venda
- Produtos e stock
- Movimentos de stock
- Fiado e dívidas
- Caixa
- Fornecedores
- Compras
- Devoluções
- Despesas
- Farmácias
- Restaurantes
- Bares
- Talhos
- Produção e padarias
- Grossistas
- Catálogo online
- Encomendas digitais
- Entregas
- Fidelização
- **Empresas (demonstração)** — corrigido: tinha ecrã mas não constava no menu
- Módulos
- Relatórios
- Resumo financeiro
- Definições

**Super Admin:** 8 áreas de demonstração (visão geral, empresas, planos, licenças, módulos, subscrições, auditoria, definições).

**Administração de empresa:** 7 áreas (visão geral, filiais, funcionários, perfis/permissões, dados da empresa, configurações e histórico).

### Verificação de controlos
- O código foi inspecionado à procura de botões sem `onClick`, formulários sem submissão e ligações `<a>` sem destino. Os botões sem `onClick` encontrados estão associados a formulários com `onSubmit`; não foram identificados atalhos `<a>` sem `href` nos componentes principais.
- O teste de navegação percorre **todas** as opções do menu do POS, acciona-as e verifica que a secção seleccionada é renderizada. Há também testes de montagem dos menus de Super Admin e de empresa.
- Esta auditoria não equivale a ensaiar manualmente todos os botões com todos os dados possíveis; as transacções prioritárias têm testes de domínio dedicados.

## 2. Correcções efectuadas

| Prioridade | Problema verificado | Correcção |
|---|---|---|
| Alta | Ecrã de empresas inacessível pelo menu POS | Entrada **Empresas (demonstração)** no menu; teste de regressão |
| Alta | Quantidades fraccionadas em `kg` e `L` recusadas por compras e movimentos de stock | Validação centralizada até três casas decimais, campos de formulários dinâmicos, testes |
| Alta | Vendas pagas no POS não guardavam o cliente seleccionado, impedindo fidelização | Selecção opcional de cliente também para vendas pagas e persistência no registo da venda |
| Média | Pagamentos parciais de fiado não geravam pontos de fidelização | Atribuição acumulativa de pontos com rastreio do movimento; sem duplicação |
| Média | Expedições grossistas pagas não atribuíam pontos ao cliente | Integração do movimento de venda com fidelização, preservando exclusão do fiado ainda não recebido |
| Média | Botão do POS disponibilizava produtos reservados por comandas/encomendas e produtos controlados por lotes | Desactivação no catálogo de vendas e apresentação de **stock livre** |
| Média | Referência simples de venda POS baseada só no relógio | Sufixo aleatório para diminuir risco de referências repetidas |
| Média | Falta de cobertura conjunta entre encomendas online, comandas, grossistas e inventário | Testes de regressão de stock reservado e consumo |

## 3. Cenários automatizados

1. Cálculo monetário e compatibilidade dos dados demonstrativos guardados em versões anteriores.
2. Abertura de caixa, diferenças de fecho, saídas sem saldo, pagamentos e movimentos de stock.
3. Reservas de stock entre encomendas online, encomendas grossistas e comandas.
4. Lotes farmacêuticos, FEFO, validade e restrições de dispensa.
5. Comandas (aberta, preparação, pronta, servida, concluída ou anulada).
6. Produção, consumo de ingredientes, rendimentos e quebra do talho.
7. Encomendas grossistas a fiado, limites de crédito, preços por volume e expedição.
8. Catálogo online, carrinho/validações, levantamento/entrega e atribuição de entregadores.
9. Fidelização em vendas pagas, grossistas, recebimentos parciais a fiado, devoluções e resgates.
10. Renderização/navegação das 25 secções POS e visibilidade dos menus do Super Admin e da Empresa.

**Validação automática:** conferir estado mais recente em `.github/workflows/verificar.yml` (TypeScript, Vitest e compilação).

## 4. Riscos e pendências por prioridade

### Bloqueadores para produção (não resolvidos neste frontend)
- **Autenticação e autorização:** os perfis, menus, módulos e permissões são demonstrações. URL directo para `/super-admin` não constitui controlo de acesso. Ainda não existem login seguro, papéis aplicados no servidor e controlo real de permissões.
- **Isolamento de empresas:** POS, Super Admin e administração de empresa usam armazenamentos de demonstração independentes e não uma fonte de dados multi-tenant. Não se deve prometer isolamento entre empresas nem ligar clientes reais.
- **Persistência e concorrência:** `localStorage` não é base de dados transaccional, não sincroniza entre dispositivos e não garante reservas atómicas. Pedidos introduzidos num telemóvel **não** surgem noutro telemóvel/empresa.
- **Pagamentos e fiscalidade:** M-Pesa, e-Mola e cartão são selecções demonstrativas, não cobranças reais; faltam integração, verificação, comprovativos, reconciliação e facturação conforme legislação moçambicana.
- **Farmácias e alimentos:** não há validação de receita, fiscalização/medicamentos controlados, rastreabilidade sanitária, validade alimentar ou certificação dos periféricos.
- **Dados pessoais:** não usar nomes/telefones reais em demonstração sem política e protecção adequadas.

### Prioridade alta antes do Supabase
- Planear regras consistentes de tenancy/filiais em **todos** os recursos e relação entre Super Admin → empresa → POS, evitando duplicação de empresas fictícias em colecções distintas.
- Definir transacções idempotentes no backend para vendas, fechos de caixa, fiado, descontos, pontos e reservas de stock.
- Desenhar estados comerciais de pedidos, devoluções sectoriais, expiração de reservas e reembolsos, incluindo casos em que o cliente já pagou.
- Formalizar o catálogo público: divulgação limitada de campos, consentimento, autenticação do cliente quando necessário e API sem exposição dos dados internos.
- Validar política de preços, impostos, moeda, unidades, custo das mercadorias vendidas e documentação fiscal.

### Prioridade média de qualidade de frontend
- **QA visual manual:** desktop (1366×768 e 1920×1080), tablet (768×1024) e telemóvel (360×800 e 390×844) em Chrome/Android, Safari/iOS quando possível. Verificar menus recolhíveis, barras de rolagem, tabelas, modais, campos e rodapés.
- **Acessibilidade:** verificar navegação completa só com teclado, captura/devolução de foco e `Tab` em diálogos, mensagens de erro acessíveis, contraste e leitores de ecrã. `aria-modal` e `Escape` estão implementados em vários diálogos, mas a captura de foco **não foi validada**.
- **Navegação:** considerar URL por secção POS e restauração da secção após actualização da página.
- **Usabilidade:** confirmar com pequenos comerciantes os termos locais (fiado, dívida, caixa, recibos e pagamentos).
- **Operações:** acrescentar estados de carga, protecção contra submissões duplicadas em todos os formulários, listas paginadas, filtros persistentes e rotinas de exportação/backup quando houver backend.

## 5. Roteiro de testes manuais obrigatório

Depois de abrir o projecto no Lovable, usar **somente clientes e telemóveis fictícios**:
- [ ] Super Admin: criar empresa, mudar plano, testar licença, módulos e pesquisa.
- [ ] Empresa: criar filial, atribuir empregado, conferir permissões e limites de plano.
- [ ] POS: abrir caixa, registar compra, ajustar stock, vender em dinheiro, registar fiado, receber pagamento parcial, fechar caixa.
- [ ] Produtos: criar `kg` e `L`, comprar `0,375 kg` e ajustar mais `0,125 kg`; conferir saldo.
- [ ] Reservas: criar comanda e encomenda grossista/online do mesmo produto; confirmar que nenhuma operação ultrapassa o stock livre.
- [ ] Farmácia: receber dois lotes com validades distintas e dispensar pelo FEFO, bloquear vencidos.
- [ ] Restaurante e bar: abrir e concluir comandas em mesas separadas.
- [ ] Talho e padaria: cortes, quebra, receita, consumo, produto acabado e custo «Por apurar».
- [ ] Catálogo: abrir em outra aba **do mesmo navegador**, simular encomenda, verificar recepção e fecho no POS.
- [ ] Entregas: atribuir entregador, assinalar saída, confirmar entrega e conferir valor recebido e stock.
- [ ] Fidelização: associar cliente a venda paga, obter pontos, registar fiado e duas prestações, resgatar e entregar benefício.
- [ ] Repetir as tarefas essenciais num telemóvel, com teclado virtual e rolagem de tabelas.

## 6. Critério para avançar para Supabase

A passagem de fase dependerá de:
1. Aceitação visual e operacional dos ecrãs acima pelo responsável do produto.
2. Fecho dos bloqueadores de arquitectura com um desenho aprovado de entidades e papéis.
3. Esquema Supabase com `tenant_id`, `branch_id`, relações, índices, validações, auditoria e RLS.
4. Transacções de domínio testadas em backend real, incluindo concorrência e idempotência.
5. Migração planeada dos dados fictícios (sem transformar demonstrações em registos oficiais).

**Conclusão:** o frontend já cobre os principais cenários do POS e tem melhor cobertura de regressão. A aprovação de TypeScript/testes/compilação **não** significa que o produto esteja pronto para comercialização nem que a auditoria visual e de segurança esteja concluída.
