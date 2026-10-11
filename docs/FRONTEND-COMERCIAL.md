# Ubuntu POS 360 — Frontend do núcleo comercial

## Propósito da etapa

Criar e validar os principais fluxos de compra, venda, stock, caixa e despesas **antes** de integrar o Supabase.

A interface continua em **português de Moçambique**. Os dados são fictícios ou introduzidos apenas para testes e ficam no `localStorage` do navegador com chave `ubuntu-pos360-demo-v1`. A simulação não autentica operadores, não comprova pagamentos e não produz documentos fiscais.

## Ecrãs funcionais de demonstração

| Área | Funcionalidades |
| --- | --- |
| Caixa | Abrir turno com fundo inicial; reforço e retirada justificados; saldo esperado; fechar com valor contado e diferença; histórico de fechos |
| Fornecedores | Registar, editar, pesquisar, desactivar/reactivar e consultar dívida |
| Compras | Registo com vários produtos, fornecedor, custo por unidade, referência, estado do pagamento e recepção de stock |
| Movimentos de stock | Entradas, saídas e correcções de contagem; histórico de compras, vendas e devoluções |
| Devoluções | Escolher venda, quantidades disponíveis, devoluções parciais, reposição de stock e tratamento do fiado |
| Despesas | Categoria, descrição, valor, forma de pagamento, histórico e ligação ao caixa se for dinheiro |
| Resumo financeiro | Vendas líquidas, recebimentos, despesas, dívidas de clientes, valores por pagar a fornecedores e exportação CSV |

## Integração com o POS existente

O POS e os ecrãs novos partilham o mesmo estado em `src/lib/domain.ts`:
- Ao registar uma **venda em dinheiro**, exige um turno de caixa aberto, associa `cashSessionId` e reduz stock.
- Ao registar pagamento em dinheiro de **fiado**, exige caixa aberto e associa a sessão.
- Uma **compra recebida** aumenta stock; se paga em dinheiro, reduz o saldo do caixa aberto.
- Um pagamento parcial de fornecedor em dinheiro reduz o saldo da gaveta aberta.
- Uma **devolução** repõe stock. Se for uma venda a fiado, abate a dívida; se em dinheiro, exige caixa aberto e saldo suficiente.
- Uma **despesa em dinheiro** exige caixa aberto e saldo suficiente.
- Um **movimento de stock** não pode produzir quantidade negativa.
- A edição manual do stock de um produto passa a criar um movimento demonstrativo com motivo.

## Contratos / funções de domínio

Arquivo `src/lib/commercial.ts`:
- `startCashSession`, `cashSessionBalance`, `finishCashSession`, `registerCashMovement`
- `registerSupplier`, `supplierOutstanding`, `registerPurchase`, `registerSupplierPayment`
- `registerStockAdjustment`, `saleStockMovements`
- `returnableQuantity`, `registerReturn`, `registerExpense`
- `financialSummary`

As funções de domínio recebem um estado `Store` e devolvem um novo estado sem mutações directas. No protótipo operam em memória e validam as regras. Na integração real, operações relacionadas deverão ocorrer numa **única transacção no servidor**, com validação de tenant, filial, operador e idempotência.

## Limites deliberados do protótipo

1. Nenhum operador de carteira digital, cartão ou banco é realmente contactado.
2. Estados «pago» são lançamentos demonstrativos, **não comprovativos**.
3. O saldo de caixa inclui apenas transacções com `cashSessionId`. Vendas anteriores à implementação do caixa não são retroactivamente incluídas.
4. A devolução de venda a fiado só é suportada se o valor a devolver não exceder a dívida ainda por pagar. Devoluções após liquidação deverão utilizar um fluxo separado de reembolso/crédito de cliente.
5. O relatório **não calcula lucro**: faltam custo das mercadorias vendidas, impostos e demais ajustamentos contabilísticos.
6. O registo de compras altera stock à recepção; recepções parciais e aprovações precisam de implementação futura.
7. Dados no navegador não são apropriados para produção, backups, auditoria inviolável ou isolamento multitenant.
8. Os parâmetros empresariais de demonstração ainda não são impostos ao POS; serão integrados num serviço autorizado pelo backend.

## Modelo do futuro Supabase

Entidades a avaliar: `cash_sessions`, `cash_movements`, `suppliers`, `purchases`, `purchase_items`, `supplier_payments`, `stock_movements`, `returns`, `return_items`, `expenses`, `sales`, `sale_items`, `payments`, `receivables`, `credit_movements`.

Separação por `tenant_id` e, quando pertinente, `branch_id`. Restrições de stock e saldo de caixa devem ser executadas no servidor, não confiando no browser. Controlos por papel/filial, RLS, logs protegidos, idempotência para vendas/pagamentos e verificação da legislação fiscal em Moçambique são pré-requisitos de lançamento.
