# Ubuntu POS 360 — Catálogo online, encomendas, entregas e fidelização

## Esta fase continua a ser uma demonstração

Os novos módulos foram criados em frontend, em português de Moçambique, usando o mesmo `Store` do ponto de venda. **Não foram integrados Supabase, API, autenticação ou pagamentos.**

A rota `/catalogo` é uma **montra pública demonstrativa**, mas **não é uma loja real**: os pedidos são guardados unicamente no `localStorage` do browser `ubuntu-pos360-demo-v1`. Navegadores e dispositivos diferentes **não partilham encomendas**. É obrigatório usar dados fictícios nos testes; os formulários não foram construídos para recolher dados pessoais reais.

## 1. Catálogo online — `/catalogo`

No menu **Catálogo online**, o administrador pode:
- Alterar o nome, a descrição e o contacto da montra;
- Ligar/desligar a pré-visualização;
- Configurar levantamento, entrega, taxa de entrega e mínimo de compra;
- Publicar/ocultar produtos ou destacá-los.

Na montra, o visitante testa:
- Pesquisa por produto e filtro por categoria;
- Visualização do catálogo e stock livre de reservas;
- Carrinho com várias linhas e controlo de quantidades;
- Opção de levantamento ou entrega, morada (apenas entrega) e método de pagamento preferido;
- Registo de um pedido **somente no mesmo navegador** e apresentação de referência.

O catálogo omite produtos inactivos e produtos sujeitos ao controlo de lotes farmacêuticos, e verifica novamente o stock ao registar o pedido.

## 2. Encomendas digitais

Os pedidos **reservam** stock na recepção, sem ainda descontar stock físico nem emitir venda.

Estados:
- `recebida` → `confirmada` → `preparacao` → `pronta`
- `pronta` → `levantada` (levantamento)
- `pronta` → `em_entrega` → `entregue` (entrega)
- Antes de sair para entrega ou ser concluído, o pedido pode ser cancelado.

A venda e a baixa do stock só ocorrem ao confirmar o levantamento ou a entrega. No fecho, o método «dinheiro» exige caixa aberto. M-Pesa, e-Mola e cartão não fazem cobranças reais; são apenas registos ilustrativos.

## 3. Entregas

- Registar/editar entregadores fictícios, activar/desactivar;
- Atribuir entregadores activos a pedidos de entrega prontos;
- Marcar saída para entrega;
- Confirmar entrega manualmente, gerando venda demonstrativa e baixa de stock.

Não existe geolocalização, integração com transportadoras, SMS, WhatsApp, comprovativo electrónico de entrega ou aplicativo de motorista.

## 4. Fidelização

- Configurar montante em MZN para ganhar um ponto, pontos necessários e nome do benefício;
- Atribuir pontos a vendas pagas com cliente associado e encomendas digitais concluídas;
- Não atribuir pontos automaticamente às vendas a fiado que ainda não foram liquidadas;
- Registar estornos proporcionais de pontos em devoluções aceites pelo módulo normal;
- Resgatar pontos por um benefício simbólico e assinalar a entrega do benefício.

**Os benefícios não criam automaticamente descontos, documentos fiscais ou saídas de stock.** Pontos podem ficar negativos após estornos de vendas cujos pontos já tenham sido resgatados: esse saldo representa pontos a compensar em vendas futuras.

A implementação real necessitará de cálculo de pontos e reversões no servidor, com registo inviolável e protecção contra fraudes. A identificação de um cliente apenas pelo telefone, como acontece nesta demonstração, **não é autenticação**.

## 5. Integração de stock e reservas

`quantityReserved` passa a somar:
- Comandas de restaurante/bar ainda abertas;
- Encomendas grossistas reservadas;
- Pedidos do catálogo ainda não concluídos ou cancelados.

O POS e os módulos de venda respeitam as reservas durante os testes, incluindo a criação de encomendas e o fecho de comandas. As reservas são libertadas em cancelamento ou conclusão.

## 6. Arquitectura para Supabase

Entidades a considerar:
- `catalog_settings`, `catalog_listings`, `online_orders`, `online_order_items`, `online_order_events`;
- `couriers`, `delivery_assignments`, `delivery_events`;
- `loyalty_rules`, `loyalty_movements`, `loyalty_rewards`.

Regras obrigatórias antes da comercialização:
- Isolamento por `tenant_id` e `branch_id` e RLS;
- API autenticada para operadores e endpoints públicos estritamente limitados;
- Reservas atómicas com validade/expiração e controlo de concorrência;
- Pagamentos verificados por entidade prestadora, não por formulário;
- Consentimento e protecção de dados pessoais, minimização e retenção;
- Gestão real de taxas e documentos fiscais segundo a legislação aplicável;
- Auditoria, idempotência, antifraude e backups;
- Política comercial de cancelamentos, reembolsos e fidelização;
- Multi-dispositivo e notificações apenas depois do backend.

## Ficheiros

- `src/lib/online.ts`, `src/lib/online.test.ts` — regras e testes de catálogo, encomendas e entregas;
- `src/lib/loyalty.ts` — regras do programa de pontos e dos benefícios;
- `src/components/DigitalCommerce.tsx` — gestão interna;
- `src/components/PublicCatalog.tsx` — montra pública;
- `src/routes/catalogo.tsx` — rota da montra;
- `src/styles/digital.css`, `src/styles/public-catalog.css` — estilos claros e responsivos.

**Próxima fase:** revisão integral do frontend por perfil, fluxos ponta a ponta, correção de lacunas e preparação formal do modelo Supabase.
