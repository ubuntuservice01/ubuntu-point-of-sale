# Arquitectura — Ubuntu POS 360

## Decisões fundamentais

- **Uma única plataforma**, vários ramos de negócio e uma empresa por tenant.
- **Ubuntu Service, Lda. controla** o cadastro, aprovação, activação, suspensão e módulos.
- Um tenant admite várias filiais, armazéns e caixas. Um subdomínio por empresa, condicionado à configuração efectiva do DNS wildcard, TLS e do serviço de resolução.
- Módulos partilhados: vendas, caixa, stock, clientes, fornecedores, fiado, relatórios, auditoria.
- Especializações: farmácia (lotes, validades, medicamentos controlados), restauração (mesas, comandas, cozinha), bar (doses), talho (pesos, transformação), produção, grossistas e distribuidores.

## Modelo de autorização (por implementar)

Entidades principais: tenants, branches, memberships, roles, modules, tenant_modules, subscriptions, products, inventories, stock_movements, sales, sale_items, payments, customers, receivables, audit_logs.

Cada linha empresarial deve conter tenant_id, e muitas conter branch_id. O backend valida a associação do utilizador ao tenant e as permissões para cada acção; o PostgreSQL aplica RLS em TODAS as tabelas empresariais. Nunca confiar no tenant_id, preço ou valor financeiro recebido do cliente. Isolar o Super Admin num serviço ou função autorizada no servidor, não numa simples opção do frontend.

Operações de vendas, redução de stock e criação de dívida devem ser transaccionais e idempotentes. Pagamentos externos só ficam confirmados após retorno fiável do respectivo operador.

## Offline

PWA + IndexedDB para catálogo, filas locais e registos pendentes. Cada operação recebe uma chave idempotente; sincronização deve tratar conflitos de inventário, revisão de preços, permissões, expiração de licenças e pagamentos. Não considerar localStorage uma solução de POS offline de produção.

## Conformidade

Facturação, protecção de dados, auditoria, retenção, medicamentos controlados e tratamento de pagamentos exigem revisão com profissionais e autoridades pertinentes antes do lançamento.

## Estado actual

O frontend contém demonstrações locais para validar fluxos UX. O protótipo não simula autenticação segura ou isolamento multitenant como se fossem funcionalidades concluídas.
