# Ubuntu POS 360 — Orientações UX por ecrã

Este documento orienta evoluções futuras para que os módulos tenham uma linguagem visual consistente.

## 1. Visão geral
**Prioridade:** informação de hoje e próximo passo.
- Título curto e data.
- Boas-vindas discretas com duas acções verdadeiras: «Nova venda» e «Consultar fiado».
- 4 indicadores em cartões brancos sem barras coloridas: vendas recebidas, vendas registadas, total em dívidas e stock baixo.
- Gráfico com dados reais da demonstração ou um estado vazio claro.
- Acções rápidas e actividade recente.
- Aviso de dívidas vencidas apenas quando o valor for superior a zero.

## 2. Ponto de venda
**Prioridade:** adicionar produtos e concluir venda com poucos toques.
- Pesquisa ampla, filtros por categoria e cartões de produtos simples, sem imagens falsas.
- Carrinho claramente separado, com quantidades e total.
- Formas de pagamento reconhecíveis.
- Fiado: seleccionar cliente, ver dívida e limite, introduzir vencimento opcional, validar antes do registo.
- Mensagem de demonstração visível; não prometer cobrança real.

## 3. Produtos e stock
**Prioridade:** localizar, corrigir e manter o catálogo.
- Pesquisa no mesmo plano da tabela.
- Colunas legíveis para produto, código, categoria, preço e stock.
- Stock baixo sinalizado sem excesso de cores.
- Formulário com nomes compreensíveis, preços em MZN, unidades, validação.
- Botões «Adicionar», «Editar» e «Desactivar» com funções correspondentes.

## 4. Fiado e dívidas
**Prioridade:** saber quem deve, quanto deve e quando pagar.
- 3 cartões simples: total em dívidas, dívidas vencidas, clientes com fiado.
- Pesquisa e filtros: Todos, Com dívidas, Vencidas, Perto do limite.
- Tabela inclui cliente, telefone, saldo, próximo vencimento, atraso, limite e acções.
- «Histórico» mostra movimentos de fiado e pagamentos por cliente.
- «Registar pagamento» permite montante parcial e forma de pagamento.
- Dívidas sem data não são apresentadas como vencidas.
- Não perder historial dos movimentos de demonstração.

## 5. Empresas (Super Admin)
**Prioridade:** encontrar uma empresa e gerir os módulos.
- Pesquisa de empresas e contagem.
- Lista ou cartões sóbrios com nome, ramo, estado e módulos.
- Identificadores de domínio claramente fictícios até haver backend seguro.
- Distinguir operações de demonstração de activações reais.

## 6. Módulos
**Prioridade:** compreender o propósito de cada recurso.
- Cartões brancos discretos com descrição simples.
- Uma mensagem geral indica módulos em desenvolvimento; não repetir 16 selos em cada cartão.
- Facilitar futura activação com permissões reais.

## 7. Relatórios
**Prioridade:** leitura e confiança nos números.
- Totais em MZN, contagem de vendas e stock.
- Tabela com pagamentos e horários.
- Indicar claramente que dados são locais/demonstrativos.
- Não desenhar gráficos sem dados nem tendências inventadas.

## 8. Definições
**Prioridade:** transparência e prevenção de erros.
- Informar idioma pt-MZ, moeda MZN e ambiente.
- Acções destrutivas separadas com confirmação.
- Futuramente: dados empresariais, pessoal e permissões, filiais, impostos e equipamentos.

## Critérios de aprovação
Cada ecrã deve responder:
1. O utilizador sabe onde está?
2. A acção principal é fácil de identificar?
3. O conteúdo pode ser lido sem ampliar?
4. Existem estados vazio, carregamento e erro?
5. Todas as operações têm função verdadeira ou estão explicitamente marcadas como indisponíveis?
6. A interface mantém coerência entre telefone, tablet e computador?
7. Não existem faixas decorativas no topo dos cartões nem outros ornamentos sem função?
