# Revisão UX/UI — Ubuntu POS 360

**Data:** 11 de Outubro de 2026  
**Fase:** melhoria do frontend demonstrativo antes da definição final do Supabase.

Esta etapa respeita o documento de instruções de UX/UI fornecido pelo responsável do projecto. **Não** reconstruiu o POS, **não** alterou a arquitectura multiempresa e **não** activou autenticação, pagamentos ou uma base de dados real.

## Alterações realizadas

### Navegação e contexto
- Menu lateral dividido em **Operações**, **Produtos e stock**, **Gestão**, **Negócios especializados** e **Administração demonstrativa**.
- Todas as 25 secções originais permanecem disponíveis; os grupos podem ser abertos e fechados e a secção seleccionada é destacada.
- Menu reduzido com ícones e títulos acessíveis; gaveta em telemóveis e deslocação vertical dentro do menu, sem barra horizontal.
- Percurso contextual no cabeçalho, pesquisa real de nomes de secções e alertas de stock baixo/fiado vencido.
- Acesso permanente ao Catálogo e perfil de **demonstração**, indicando claramente que não existe sessão autenticada.
- O atalho directo ao Super Admin foi retirado do cabeçalho do POS comum. A rota `/super-admin` **continua aberta sem autorização de backend** nesta demonstração; ocultar o link não constitui controlo de acesso.

### Dashboard
- Substituída a área grande de boas-vindas por uma barra compacta com acções reais: Nova venda, Consultar fiado, Adicionar produto e Gestão de caixa.
- Filtros: **Hoje**, **Últimos 7 dias**, **Últimos 30 dias**, **Personalizado** (com validação de datas).
- Cartões compactos e clicáveis: vendas pagas, número de vendas, saldo de fiado, vencidas, stock baixo, compras e despesas.
- Gráfico agrupado por período, incluindo hoje (intervalos de 4 horas), sete dias, trinta dias ou datas personalizadas.
- Distribuição de vendas por forma de pagamento, produtos mais vendidos por **valor bruto**, alertas de stock, vendas e actividades recentes.
- Estados vazios reais, sem barras fictícias. Não são apresentados percentuais de crescimento ou lucros inventados.
- Vendas **pagas líquidas no período** = vendas não fiadas registadas no período menos devoluções pagas registadas no período. Recebimentos posteriores de fiado continuam separados. As compras são mostradas como custo recebido, **não** como lucro.

### Ponto de venda e produtos
- Pesquisa por nome/SKU e leitura do SKU com **Enter** quando o leitor funciona como teclado.
- Atalho **/** para focar a pesquisa **apenas** quando não existe outro campo em edição.
- Botão explícito para esvaziar o carrinho, com confirmação antes de apagar os itens.
- Lista de produtos com ordenação por nome/preço/stock e paginação de 10 produtos.
- Comprovativo **não fiscal** de demonstração, com data, referências, artigos, totais e opção de impressão pela caixa de diálogo do navegador. **Não** substitui documentos fiscais.
- Modal principal com `Tab`/ `Shift+Tab` a circular entre controlos, foco inicial, `Escape` e reposição do foco depois de fechar.
- Melhoria de área táctil, responsividade, focos visíveis, espaços e sem barras decorativas de IA.

### Estilo
- Cores claras e verde institucional, sem tema escuro.
- Um conjunto de tokens visuais comum à camada POS (espaçamento, bordas, botões, foco e valores), aplicado em `src/styles/ux-refinements.css`.
- Cartões de indicadores sem faixas artificiais, textos sem valores fictícios e estados vazios informativos.

## Validação automatizada
- `src/lib/ux.test.ts`: grupos de navegação, cobertura completa dos módulos, filtros de data, distinção entre vendas pagas e fiado, séries dos gráficos e dados vazios.
- `src/test/frontend-audit.test.tsx`: colapsar/reabrir grupo e percorrer todos os botões da navegação existente.
- Workflow existente: TypeScript, Vitest e compilação de produção.

## Pendências antes de integrar Supabase
1. **QA visual real** em Chrome 1366×768, 1920×1080, tablet 768×1024 e telemóveis 360×800 e 390×844. Não houve navegação física ou captura de ecrãs nesta sessão.
2. Tornar consistentes os diálogos e a gestão de foco dos módulos externos ao UbuntuApp (comercial, sectorial, produção e digital).
3. Validar com operadores o fluxo de impressão, scanners, teclados virtuais, responsividade e grandes volumes de dados.
4. Incluir descontos com regras e perfis **apenas depois de existir autorização real**, em vez de simular controlo de permissões no browser.
5. Definir controlo de acesso real aos painéis Super Admin / Empresa, RLS, tenancy, filiais, transacções, fiscalidade, dados pessoais e integrações de pagamentos.
6. Separar progressivamente estilos duplicados e reutilizar componentes de UI sem desmontar os fluxos existentes.

**Estado:** Melhoria de código preparada. A aprovação do frontend requer a validação visual e as regras de acesso/negócio aprovadas pelo responsável.
