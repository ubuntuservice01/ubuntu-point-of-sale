# Auditoria actualizada — módulos atribuídos a comerciantes e prontidão para Supabase
**Data:** 12 de Outubro de 2026  
**Âmbito:** Ubuntu POS 360, frontend React/TanStack Router e lógica local TypeScript.  
**Método:** inspecção de código, testes automatizados de contratos e de interface. **Não** inclui browsers/caixas/impressoras reais, autenticação de servidor, RLS ou certificação fiscal.

## Resposta à pergunta do proprietário

**Quando atribuo Farmácia, Talho, Restaurante, Bar, Padaria ou Grossistas, o comerciante deve receber o conjunto de serviços do seu plano e o módulo sectorial específico.**

No frontend demonstrativo, essa integração **já existe** entre o catálogo do Super Admin, o tenant local e o POS do comerciante:
1. O Super Admin regista a empresa, o sector, plano e módulos adicionais (`src/lib/admin-demo.ts`).
2. O contrato `resolveBusinessWorkspace` determina os módulos autorizados, a validade da licença e as secções do comerciante (`src/lib/business-workspace.ts`).
3. O painel de empresa aponta para a aplicação do comerciante com `/?tenant=<id>` (`src/components/CompanyAdminApp.tsx`).
4. A aplicação principal filtra as secções por **módulo contratado + perfil local**, e mantém um armazenamento separado por identificador de tenant no navegador (`src/components/UbuntuApp.tsx`, `src/hooks/useOfflineStore.ts`).
5. A homepage do comerciante mostra atalhos principais e, nesta revisão, cada ecrã sectorial tem um **directório visível de ferramentas comuns e específicas**. O directório não mostra outros sectores nem áreas não contratadas (`BusinessSectorServices`).

Esta é uma demonstração *num único navegador*: não existe uma identidade real de empresa, autenticação entre máquinas ou aplicação de licenças e permissões num servidor. Um utilizador com acesso ao armazenamento do navegador pode alterar os dados locais.

## Farmácia: serviços disponíveis, depois das melhorias desta auditoria

| Serviço | Onde abrir na demonstração | Situação |
|---|---|---|
| Painel/visão geral | Visão geral da empresa | Disponível |
| Dispensa de produto com lote / FEFO | Farmácia → **Nova dispensa** | Disponível se existir lote válido com unidades; não é uma dispensa regulamentar |
| Medicamentos / artigos e preços | Farmácia → **Produtos e preços** | Cadastro genérico, sem substâncias/prescrições |
| Inventário e movimentos | Farmácia → **Inventário e movimentos** | Genérico; lotes ficam na secção Farmácia |
| Receber lote e conferir validade | Farmácia → **Receber lote** | Disponível após cadastro do produto |
| Compras e entradas | Farmácia → **Compras e entradas** | Genérico; falta vincular factura do fornecedor ao lote recebido |
| Fornecedores | Farmácia → **Fornecedores** | Genérico |
| Clientes e fiado | Farmácia → **Clientes e fiado** | Genérico, demonstração |
| Caixa e turnos | Farmácia → **Caixa e turnos** | Genérico, demonstração |
| Vendas genéricas | Farmácia → **Ponto de venda e Caixa Rápido** | Para artigos *não* controlados por lote; lotes usam dispensa FEFO |
| Devoluções | Farmácia → **Devoluções** | Fluxo genérico; ainda não faz quarentena sanitária |
| Relatórios, margens e despesas | Farmácia → **Relatórios / Rentabilidade / Despesas** | Genérico, estimativo |
| Operadores e permissões | Farmácia → **Operadores e permissões** | PIN e perfis locais, apenas demonstração |
| Alertas | Farmácia → **Alertas** | Validades, stock baixo, fiado e pedidos |
| Configurações | Farmácia → **Definições** | Genérico |

A visibilidade depende do plano *e* do perfil: um caixa não deve ter acesso aos preços de compra, relatórios financeiros ou gestão de operadores.

### O que a Farmácia ainda **não** tem
- POS farmacêutico unificado com leitor e selecção de lote/prescrição num único fluxo.
- Registo de prescrições, controlo de medicamentos específicos e rastreabilidade farmacêutica regulamentar.
- Vínculo atómico entre encomenda ao fornecedor, factura, recepção, lote, custo e saldo.
- Devolução sanitária/quarentena, movimentações por filial, perdas regulamentares e auditoria imutável.
- Garantia de FEFO sob concorrência multi-operador, validação de pagamentos ou emissão fiscal.
- Relatórios farmacêuticos especializados completos.

**Conclusão:** o módulo Farmácia já dá acesso aos serviços genéricos existentes, mas **não está completo como sistema farmacêutico para produção**.

## Avaliação dos restantes sectores

| Módulo | Inclui na demonstração | Ainda em falta para operação profissional |
|---|---|---|
| Loja/mercearia | POS, clientes, caixa, produtos, stock, compras, fornecedores, relatórios | Fiscalidade, pagamento confirmado, servidor transaccional, permissões reais |
| Talho | Pesagem manual, transformação/cortes, quebras, vendas por kg, núcleo comercial comum | Balança conectada, etiquetas, lotes sanitários, custo por corte, rastreabilidade |
| Restaurante | Mesas, comandas, preparação, fecho, núcleo comercial | Impressão de cozinha, divisões da conta, turnos, fichas técnicas e consumo real de ingredientes |
| Bar | Mesas e comandas, núcleo comercial | Doses e volumes, gestão de garrafas abertas, perdas e comissões |
| Padaria/Produção | Receitas, ingredientes, custo estimado, produção, núcleo comercial | Ordens por lote, custos indirectos, validade por fornada e rastreabilidade |
| Grossistas | Escalões de preço, reserva, expedição, entrega, núcleo comercial | Armazéns/filiais reais, logística, contas correntes e crédito seguro |

O directório de serviços integrado em cada ecrã sectorial mostra **somente ecrãs que já existem**, que constam dos módulos do plano e que o operador tem permissão local de abrir. **Não** transforma os recursos especializados em funcionalidades concluídas.

## Bloqueios antes do Supabase de produção (prioridade P0)

1. **Modelo multiempresa e filiais:** identidade, tenant, filial, operadores e licenças, com PK/FK, RLS e protecção real contra acesso cruzado.
2. **Unificação da gestão empresarial com os operadores:** funcionários e perfis criados em `/empresa` ainda não são identidades autenticadas do POS.
3. **Permissões e licenças no servidor:** a atribuição de módulos e suspensão devem bloquear leituras e escritas reais, não apenas o menu local.
4. **Transacções de venda completas:** operação atómica de venda + itens + pagamento autorizado + caixa + stock + fiado + fonte sectorial, com ID idempotente e auditoria.
5. **Farmácia:** decidir o âmbito do MVP (gestão geral + stock por lotes + dispensa simulada, ou sistema farmacêutico regulado). Não aceitar dados reais de prescrição sem revisão legal e técnica.
6. **Offline:** fila IndexedDB actual não envia dados. É necessário reconciliar conflitos sem duplicar vendas ou stock; testar dois dispositivos e reenvios.
7. **Fiscalidade moçambicana:** validar requisitos de factura, recibo, IVA e operações sectoriais antes de emitir documentação válida.
8. **Testes de dispositivos e segurança:** leitores USB, balanças, 58/80 mm, telemóveis, browsers e políticas de recuperação.

## Parecer final

- **APROVADO:** continuar a finalizar contratos funcionais e **desenhar** tabelas/relacionamentos, incluindo tenant, plano, licenças, módulos, filiais, perfis e transacções.
- **NÃO APROVADO:** activar o Supabase como se os sectores estivessem prontos para operação real, importar vendas demonstrativas sem revisão ou vender já o módulo farmacêutico como solução integral.
- **Porta de aprovação:** testes de ponta a ponta para um comerciante por sector, autorização no servidor, licenças e RLS, fluxos transaccionais de vendas/stock/caixa e aceitação técnica/legal.

## Rastreio dos testes

A validação automática abrange contratos `business-workspace.test.ts` (mapeamento, licenças, sectores, serviços e papéis), `business-scope.test.ts` (separação do armazenamento local) e `business-workspace-ui.test.tsx` (navegação real Farmácia e Talho, encaminhamento para Compras/Fornecedores, suspensão).  
A execução GitHub Actions deverá ser registada após o commit desta revisão. Testes automáticos não substituem ensaios manuais.
