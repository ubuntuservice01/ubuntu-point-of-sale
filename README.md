# Ubuntu POS 360

**Ubuntu Service, Lda.** — Criando pontes entre o físico e o digital.

Plataforma de gestão comercial multi-empresa para farmácias, lojas, pequenos comerciantes, restaurantes, bares, talhos, padarias e grossistas.

## Estado do frontend (demonstração)

Esta versão é um **protótipo funcional de interface**, com dados de demonstração guardados no navegador. Inclui:
- Dashboard responsivo, com indicadores e gráficos baseados nas vendas de demonstração.
- POS com pesquisa, categorias, carrinho, quantidades e registo de vendas **simuladas**.
- Produtos, gestão de stock e módulo demonstrativo de **fiado e dívidas** com limites de crédito, vencimentos opcionais, histórico de compras e pagamentos parciais.
- **Operações comerciais**: abertura e fecho de caixa, movimentos de numerário, fornecedores, compras, entradas/saídas de stock, devoluções parciais, despesas e resumo financeiro.
- **Módulos por sector**: farmácias (lotes, validade, FEFO e dispensa simulada), restaurantes/bares (mesas, comandas, preparação e fecho), talhos (transformação, quebras e venda em kg), **produção/padarias** (receitas, lotes, consumo de matérias-primas) e **grossistas** (escalões de preços, reservas, fiado e expedições).
- **Comércio digital**: catálogo de demonstração na rota `/catalogo`, montra configurável, pesquisa, carrinho, submissão de encomendas locais, preparação, levantamento e distribuição.
- **Fidelização**: pontos automáticos para vendas pagas com cliente identificado, estornos proporcionais por devoluções e troca de pontos por benefícios demonstrativos.
- **Super Admin independente em `/super-admin`**, com visão geral, empresas, planos, licenças, módulos, projecções de subscrição, auditoria e definições.
- **Administração empresarial em `/empresa`**: filiais, funcionários, perfis, permissões, dados institucionais, configurações e histórico demonstrativo.
- Catálogo de módulos e auditoria local das acções.
- **Design claro e humano**: fundo #F8FAFC, cartões brancos, verde esmeralda #10B981, ciano #06B6D4 e âmbar #F59E0B; fontes Space Grotesk, Hanken Grotesk e JetBrains Mono. Sem barras decorativas no topo dos cartões, adaptado a ecrãs grandes e telemóveis.

**Não é uma aplicação pronta a receber clientes reais.** Não existe ainda autenticação, isolamento entre empresas, backend Supabase, políticas RLS, processamento de pagamentos, documentos fiscais, provisionamento DNS, suporte offline sincronizado, nem ligações a balanças. Não introduza dados de clientes reais nesta versão. As operações aqui realizadas são simulações locais; não constituem prova de pagamento nem facturação.

## Desenvolvimento

Este repositório mantém a estrutura React + TypeScript + TanStack Start utilizada no projecto Lovable ligado.

```bash
bun install
bun run dev
bun run build
```

## Modo Caixa Rápido — operador de balcão

O **Ponto de venda** inclui agora um comutador **Modo Caixa Rápido / Modo normal**, com cartões grandes, carrinho sempre acessível, teclado numérico de quantidades e dinheiro recebido, cálculo de troco, métodos de pagamento e atalhos F2/F4/F8. Utiliza o mesmo fluxo de venda e as mesmas validações de stock/fiado do POS normal. **É uma interface visual de demonstração, não uma permissão RBAC de produção.** Consultar [Manual de Caixa Rápido](docs/MODO-CAIXA-RAPIDO-2026-10-11.md).

## Passo 5/5 — Modo offline e preparação da sincronização

O POS passa a usar **IndexedDB** como armazenamento principal (quando suportado), com uma fila local de mudanças pendentes, identificação de operações, cache da página principal e recursos estáticos por Service Worker, aviso online/offline e exportação manual JSON. **Não comunica nem sincroniza com Supabase nesta etapa**; a fila só pode ser enviada após implementar API autenticada, idempotente e multiempresa. Consultar [Manual do Modo Offline](docs/MODO-OFFLINE-2026-10-11.md).

## Passo 4/5 — Central de alertas operacionais

Nova página **Central de alertas** e sino integrado, com avisos de stock, fiado vencido, validade de lotes e encomendas pendentes. Inclui filtros, prioridades, leitura de avisos e limites configuráveis. Os dados vêm **exclusivamente do navegador**: não são notificações push nem mensagens externas. Ver [Documentação dos alertas](docs/ALERTAS-OPERACIONAIS-2026-10-11.md).

## Impressão térmica de comprovativos (passo 3/5)

Pré-visualização e impressão pelo navegador em rolos de **58 mm e 80 mm**, com nome/logótipo da loja, artigos, totais, QR local de referência e reimpressão por histórico. Os documentos são **demonstrativos e não fiscais**; o controlo do papel/corte depende da impressora. Ver [Manual técnico e limitações](docs/IMPRESSAO-TERMICA-2026-10-11.md).

## Relatórios de margens e rentabilidade (passo 2/5)

Vendas, custos unitários congelados no registo da venda, devoluções, margem estimada, despesas e resultado indicativo em MZN, com exportação CSV. Quando faltam custos históricos o resultado aparece como **«Por apurar»**, sem inventar lucro. Ver [Guia do Passo 2](docs/RELATORIOS-MARGENS-2026-10-11.md).

## Leitura de código de barras pela câmara (etapa 1/5)

O POS em telemóveis permite procurar códigos pela câmara quando o navegador suporta BarcodeDetector, ligar um código único a um produto e continuar manualmente quando não suporta. Uma leitura aceite emite um bip curto; no computador, o POS aceita leitores USB em modo teclado com Enter/Tab. Ver [Leitor de código de barras](docs/CODIGOS-BARRAS-CAMARA.md) para compatibilidade e testes.

## Experiência mobile para o comerciante

Menu inferior e acções rápidas com áreas de toque maiores **apenas no telemóvel**, além do POS em duas vistas (Produtos e Carrinho). Ver [UX Mobile](docs/UX-MOBILE-2026-10-11.md).

## Revisão de UX/UI (pré-Supabase)

A melhoria de navegação agrupada, dashboard com filtros, pesquisa rápida no POS e impressão de resumo demonstrativo está documentada em [Revisão UX/UI](docs/UX-REVISAO-2026-10-11.md). A interface continua clara e todas as operações são demonstrativas.

## Cadastro de produtos: preços de compra e de venda

O cadastro de produtos passou a pedir **preço de compra** e **preço de venda** por unidade. A listagem apresenta os dois valores e a diferença bruta unitária. Consulte [Regras dos preços de produtos](docs/PRECOS-PRODUTOS.md). Os custos dos produtos antigos não são inventados.

## Auditoria do frontend

Consulte [Auditoria do Frontend — Outubro de 2026](docs/AUDITORIA-FRONTEND-2026-10-11.md) para a cobertura de navegação, correcções executadas, testes de regressão e bloqueadores antes do Supabase.

## Próximas fases

1. **Validar e aperfeiçoar o frontend:** fluxo visual ponta a ponta, comunicação entre módulos, permissões e acessibilidade.
2. **Validar a arquitectura dos dados e integrar o backend multitenant:** Supabase Auth, tabelas com tenant_id, autorização no servidor, RLS, Super Admin real e auditoria.
3. **Operações reais e seguras:** vendas, pagamentos, devoluções, stock, caixa, filiais e permissões em transacções idempotentes.
4. **Expansão:** fiado completo, catálogo, entregas, fidelização e equipamentos.
5. **Offline seguro e IA:** IndexedDB, fila idempotente, reconciliação e assistente limitado por tenant.
6. **Conformidade, testes de segurança e piloto.**

Consulte `docs/ARQUITECTURA.md`, `docs/DESIGN-SYSTEM.md`, `docs/UX-ECRAS.md`, `docs/FRONTEND-SUPER-ADMIN.md`, `docs/FRONTEND-EMPRESA.md`, `docs/FRONTEND-COMERCIAL.md`, `docs/FRONTEND-SECTORES.md`, `docs/FRONTEND-PRODUCAO-GROSSISTAS.md` e `docs/FRONTEND-COMERCIO-DIGITAL.md`.

**Nota fiscal:** taxas e regras de tributação devem ser parametrizadas depois de verificação legal em Moçambique. Não há taxa de IVA presumida nesta versão.
