# Ubuntu POS 360

**Ubuntu Service, Lda.** — Criando pontes entre o físico e o digital.

Plataforma de gestão comercial multi-empresa para farmácias, lojas, pequenos comerciantes, restaurantes, bares, talhos, padarias e grossistas.

## Estado do frontend (demonstração)

Esta versão é um **protótipo funcional de interface**, com dados de demonstração guardados no navegador. Inclui:
- Dashboard responsivo, com indicadores e gráficos baseados nas vendas de demonstração.
- POS com pesquisa, categorias, carrinho, quantidades e registo de vendas **simuladas**.
- Produtos, gestão de stock e módulo demonstrativo de **fiado e dívidas** com limites de crédito, vencimentos opcionais, histórico de compras e pagamentos parciais.
- **Operações comerciais**: abertura e fecho de caixa, movimentos de numerário, fornecedores, compras, entradas/saídas de stock, devoluções parciais, despesas e resumo financeiro.
- **Módulos por sector**: farmácias (lotes, validade, FEFO e dispensa simulada), restaurantes/bares (mesas, comandas, preparação e fecho) e talhos (transformação, quebras e venda em kg).
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

## Próximas fases

1. **Continuar os módulos sectoriais e expansão do frontend:** produção avançada, grossistas, catálogo online, entregas e fidelização.
2. **Validar a arquitectura dos dados e integrar o backend multitenant:** Supabase Auth, tabelas com tenant_id, autorização no servidor, RLS, Super Admin real e auditoria.
3. **Operações reais e seguras:** vendas, pagamentos, devoluções, stock, caixa, filiais e permissões em transacções idempotentes.
4. **Expansão:** fiado completo, catálogo, entregas, fidelização e equipamentos.
5. **Offline seguro e IA:** IndexedDB, fila idempotente, reconciliação e assistente limitado por tenant.
6. **Conformidade, testes de segurança e piloto.**

Consulte `docs/ARQUITECTURA.md`, `docs/DESIGN-SYSTEM.md`, `docs/UX-ECRAS.md`, `docs/FRONTEND-SUPER-ADMIN.md`, `docs/FRONTEND-EMPRESA.md`, `docs/FRONTEND-COMERCIAL.md` e `docs/FRONTEND-SECTORES.md`.

**Nota fiscal:** taxas e regras de tributação devem ser parametrizadas depois de verificação legal em Moçambique. Não há taxa de IVA presumida nesta versão.
