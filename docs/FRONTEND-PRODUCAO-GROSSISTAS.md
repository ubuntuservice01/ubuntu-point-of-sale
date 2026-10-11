# Ubuntu POS 360 — Produção/Padarias e Grossistas/Distribuidores

## Estado e propósito
Frontends **funcionais apenas na demonstração local**. Ainda não existem autenticação, emissão fiscal, pagamentos reais, isolamento por empresa nem sincronização online. Não introduza dados de clientes reais.

Os dois sectores reutilizam o catálogo de produtos, stock, clientes, fiado e caixa existentes, com secções dedicadas no menu lateral:
- **Produção e padarias:** receitas, ingredientes, cálculo de materiais necessários, execução de lotes e histórico.
- **Grossistas:** escalões de preço por quantidade, reservas de encomendas, expedições, entregas e histórico.

## Produção e padarias
Cada receita inclui produto acabado, rendimento por execução e uma lista de ingredientes (produto e quantidade). É possível criar, editar, activar e desactivar receitas, com validações contra repetição de matérias-primas e uso de produtos farmacêuticos controlados por lotes.

Ao executar N vezes uma receita, o módulo:
1. Verifica o stock livre de cada ingrediente, excluindo quantidades reservadas para comandas e encomendas grossistas.
2. Calcula as quantidades necessárias, com precisão até três casas decimais para kg e L; os restantes produtos usam unidades inteiras.
3. Reduz o stock dos ingredientes e aumenta o stock do produto acabado.
4. Guarda um registo da produção e movimentos de stock positivos e negativos com referência ao lote.
5. Estima o custo a partir dos últimos preços unitários registados nas compras **somente** quando existem valores de todos os ingredientes. Caso contrário, mostra «Por apurar», nunca uma falsa margem ou lucro.

Não há fluxo de ordens pendentes, planeamento de máquinas, rastreio de lotes alimentares, HACCP, validade dos alimentos, custos laborais ou receitas fiscais. Produções são instantâneas apenas na demonstração.

## Grossistas e distribuidores
Permite definir escalões de preços por produto (quantidade mínima e preço unitário) e guardar encomendas com linhas e preços unitários congelados na altura do registo.

**Estados:** Reservada → Expedida → Entregue. Uma encomenda Reservada também pode ser Cancelada, libertando o stock comprometido.

**Regras:**
- Só pode registar encomendas de clientes existentes.
- Produtos e quantidades são validados; não podem ser reservadas quantidades acima do stock livre.
- Reservas descontam da disponibilidade para o POS e para as comandas, mas **não** criam ainda vendas nem dívidas.
- Ao confirmar a **expedição**, o sistema volta a verificar o stock e cria uma venda com a referência à encomenda, reduzindo stock e libertando a reserva.
- Com pagamento em dinheiro, exige caixa aberto e associa a venda ao turno.
- Em vendas a **fiado**, exige data de vencimento, verifica o limite de crédito no momento da reserva e da expedição e actualiza a dívida e o livro de movimentos de fiado.
- A confirmação de **entrega** encerra a expedição demonstrativa; não há seguimento GPS ou prova de entrega.
- Os preços do pedido são fixados na reserva e não mudam quando os escalões são editados.

## Modelos de dados
- `ProductionRecipe` — ingredientes e rendimento.
- `ProductionRun` — lotes executados, consumo e quantidade produzida.
- `WholesaleTier` — preço escalonado por produto/quantidade.
- `WholesaleOrder` — encomenda com linhas, cliente, prazo de fiado e estado.

Implementação:
- `src/lib/expansion.ts` — regras comerciais sem UI.
- `src/lib/expansion.test.ts` — testes de stock, reservas, preços, fiado e caixa.
- `src/components/ExpansionOperations.tsx` — ecrãs interactivos, formulários e filtros.
- `src/styles/expansion.css` — tema claro e responsivo.

## Segurança/arquitectura para o futuro Supabase
1. Todas as operações relacionadas com stock, produção, encomendas, fiado e caixa devem ser transacções de base de dados atómicas e idempotentes.
2. As reservas devem ser feitas sob bloqueio transaccional para evitar sobrecompromissos por vários operadores/filiais.
3. Cada receita e encomenda precisará de `tenant_id`, `branch_id`, `created_by`, limites de utilização e autorização no backend.
4. A contabilização de custos necessita de método definido: FIFO, médio ponderado ou outro, com validação legal local.
5. A facturação a prazo e comprovativos de expedição/entrega exigem modelos fiscais reais, impostos confirmados, documentos e auditoria controlada no servidor.
6. As regras de aprovação, devoluções grossistas, produção com perdas, validades e FIFO dos ingredientes serão aprofundadas antes da comercialização.

## Próxima fase de frontend
**Catálogo online, encomendas digitais, entregas e fidelização**, antes da integração definitiva com Supabase. O catálogo público e formulários de encomendas não serão expostos sem um desenho explícito dos dados que podem ser tornados públicos.
