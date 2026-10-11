# Ubuntu POS 360 — Frontend dos sectores (fase antes do Supabase)

## Âmbito
Foram criados os módulos **Farmácias, Restaurantes, Bares e Talhos**, com menus e ecrãs próprios na aplicação principal.

Todo o sistema continua em **modo demonstrativo**, no mesmo navegador. As operações ficam nas colecções de `Store` em `src/lib/domain.ts`, com validações em `src/lib/sectors.ts` e interface em `src/components/SectorOperations.tsx`.

## Farmácias
- Registar lote de um produto existente, número de lote, data de validade e unidades recebidas.
- Recepção do lote aumenta o stock do catálogo e regista movimento de entrada.
- Inventário por lote, unidades disponíveis e avisos de lotes vencidos ou a expirar nos próximos 30 dias.
- Dispensa simulada de produtos controlados por lote, pelo método **FEFO**: primeiro as unidades válidas cuja validade está mais próxima.
- Dispensa gera uma venda de demonstração e baixa as quantidades dos lotes utilizados e do stock global.
- Venda em dinheiro exige caixa aberto.
- Para não contornar lotes, o POS genérico não vende produtos com lote controlado e as compras/ajustes manuais desses produtos são bloqueados.
- Ainda **não** existem verificação de prescrições, substâncias controladas, gestão de receitas, interoperabilidade regulatória, rastreio sanitário, identificação de pacientes nem conformidade fiscal. Estas operações não devem ser usadas com medicamentos reais.

## Restaurantes e bares
- Cada sector possui mesas e comandas separadas.
- Registo de mesas sem nomes duplicados no sector.
- Abertura de uma comanda por mesa, anotações, adição e retirada de produtos antes da preparação.
- Produtos de comandas abertas **reservam stock** para evitar promessas de disponibilidade incorrectas.
- Fluxo de estados: **Aberta → Em preparação → Pronta → Servida → Fechada**.
- Só após estar servida é possível concluir o pagamento de demonstração, gerando venda no núcleo do POS e saída de stock.
- Anulação de comanda apenas enquanto aberta (antes da preparação).
- Venda em dinheiro exige caixa aberto; M-Pesa, e-Mola e cartão continuam simulações.
- Não existe impressão de cozinha, distribuição por empregados, fichas técnicas/consumo de ingredientes, entrega, pagamentos divididos, gorjetas ou integração externa.

## Talhos
- Produtos com unidade **kg** entram nas operações por peso.
- É possível transformar uma matéria-prima (ex.: carne em peça) em cortes (ex.: bifes, ossos), com redução do stock de origem e aumento dos cortes produzidos.
- O peso produzido não pode exceder o peso de origem; a diferença é registada como **quebra declarada**.
- Pesos até três casas decimais (1 g); não há tolerância de peso negativa.
- Vendas por peso usam o preço por quilograma, actualizam vendas, caixa (se em dinheiro) e stock.
- Ainda não existem balanças conectadas, certificado de pesagem, rastreio sanitário, etiquetas com código de barras nem gestão do custo de transformação.

## Contratos para o backend
`src/lib/domain.ts` introduz:
- `PharmaLot`, `PharmaDispense`
- `ServiceTable`, `ServiceOrder`, `ServiceOrderItem`
- `ButcherBatch`
- `Sale.source` e `Sale.sourceId`

No Supabase, a implementação real exigirá `tenant_id` e `branch_id` em todas as entidades pertinentes, autorização por perfil no servidor, transacções atómicas e idempotentes, rastreio por lote, FEFO em concorrência, movimentações de stock sob bloqueio transaccional e integridade entre comandas, vendas e pagamentos.

## Advertências e escolhas do protótipo
1. As operações de sectores estão no **mesmo catálogo e stock local**, deliberadamente para testar a integração. Não há isolamento real entre empresas.
2. As devoluções genéricas de medicamentos, comida preparada e carne foram bloqueadas para impedir reposição automática em stock de bens perecíveis; necessitam de fluxos próprios de quarentena/desperdício.
3. Não se deve introduzir dados reais de pacientes, prescrições ou clientes nesta demonstração.
4. O inventário por lotes de produtos antigos sem lote não é corrigido automaticamente; o protótipo não inventa lotes históricos.
5. A receita de pratos/cocktails, reconciliação fiscal e impressão térmica serão desenvolvidas em novas fases.
6. A gestão de farmácias exige validação especializada e conformidade com regras de Moçambique antes de qualquer uso real.

## Testes previstos
- FEFO, bloqueio de lotes expirados e entradas repetidas.
- Ciclo da comanda, reserva e saída de stock.
- Pagamento em dinheiro dependente do caixa.
- Transformações em kg, quebras e venda por peso.
- Compatibilidade com a loja, compra genérica, devoluções e movimentos do stock.
