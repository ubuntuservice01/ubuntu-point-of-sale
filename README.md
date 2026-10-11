# Ubuntu POS 360

**Ubuntu Service, Lda.** — Criando pontes entre o físico e o digital.

Plataforma de gestão comercial multi-empresa para farmácias, lojas, pequenos comerciantes, restaurantes, bares, talhos, padarias e grossistas.

## Estado da versão 0.1

Esta versão é um **protótipo funcional de interface**, com dados de demonstração guardados no navegador. Inclui:
- Dashboard responsivo, com indicadores e gráficos baseados nas vendas de demonstração.
- POS com pesquisa, categorias, carrinho, quantidades e registo de vendas **simuladas**.
- Produtos, gestão de stock e módulo demonstrativo de **fiado e dívidas** com limites de crédito, vencimentos opcionais, histórico de compras e pagamentos parciais.
- Painel demonstrativo de empresas da Ubuntu Service.
- Catálogo de módulos e auditoria local das acções.
- Design **Tactile Velocity**: verde #10B981, ciano #06B6D4, âmbar #F59E0B e azul-noite #0F172A; fontes Space Grotesk, Hanken Grotesk e JetBrains Mono. Adaptado a ecrãs grandes e telemóveis.

**Não é uma aplicação pronta a receber clientes reais.** Não existe ainda autenticação, backend Supabase, políticas RLS, processamento de pagamentos, documentos fiscais, provisionamento DNS, suporte offline sincronizado, nem ligações a balanças. Não introduza dados de clientes reais nesta versão. As operações aqui realizadas são simulações locais; não constituem prova de pagamento nem facturação.

## Desenvolvimento

Este repositório mantém a estrutura React + TypeScript + TanStack Start utilizada no projecto Lovable ligado.

```bash
bun install
bun run dev
bun run build
```

## Próximas fases

1. **Backend multi-tenant:** Supabase Auth, tabelas com tenant_id, autorização no servidor, RLS, Super Admin real e auditoria.
2. **Operações transaccionais:** vendas, pagamentos, devoluções, stock, caixa, filiais e permissões.
3. **Módulos sectoriais:** farmácia, restauração, bares, talhos, produção e grossistas.
4. **Expansão:** fiado completo, catálogo, entregas, fidelização e equipamentos.
5. **Offline seguro e IA:** IndexedDB, fila idempotente, reconciliação e assistente limitado por tenant.
6. **Conformidade, testes de segurança e piloto.**

Consulte `docs/ARQUITECTURA.md` e `docs/DESIGN-SYSTEM.md`.

**Nota fiscal:** taxas e regras de tributação devem ser parametrizadas depois de verificação legal em Moçambique. Não há taxa de IVA presumida nesta versão.
