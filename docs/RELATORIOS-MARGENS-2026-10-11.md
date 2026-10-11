# Passo 2/5 — Relatórios de margens e rentabilidade
**Produto:** Ubuntu POS 360 — Ubuntu Service, Lda.  
**Data:** 11 de Outubro de 2026  
**Estado:** frontend demonstrativo. O Supabase não é alterado.

## Objectivo e limites
Disponibilizar na secção **Relatórios** indicadores de valor de mercadorias vendidas, custo conhecido, margem bruta estimada, percentagem de margem, despesas e resultado indicativo, por período e por produto. O relatório não é uma demonstração de resultados fiscal, não calcula lucro líquido nem substitui contabilidade.

## O que foi implementado
- Períodos **Hoje**, **7 dias**, **30 dias**, **Personalizado** e **Todo o histórico**, com validação de datas.
- Cartões: vendas líquidas de mercadorias, custo conhecido das mercadorias, margem bruta estimada, percentagem da margem, despesas registadas e resultado indicativo.
- Detalhe por produto: quantidade líquida, vendas, custo, margem e percentagem, com procura por produto/SKU e filtro de categoria e de linhas sem custo.
- Ranking de artigos com margem positiva conhecida, análise por categoria, visualização de devoluções, lista de vendas recentes e histórico original completo.
- Exportação CSV UTF-8 com separador `;`, adequada a trabalhar com Excel ou LibreOffice. Conteúdo proveniente de utilizadores é protegido contra interpretação acidental como fórmulas em software de folhas de cálculo.
- A área **Resumo financeiro** inclui botão **Analisar margens**, mantendo os dados e exportação anteriores.
- Estilos responsivos adaptados a computador e telemóvel, mantendo a identidade clara da Ubuntu Service.

## Congelamento do custo estimado por venda
Ao concluir uma **nova venda**, cada artigo passa a guardar no registo da venda:
- `price` — preço de venda já congelado por linha.
- `costAtSale` — custo unitário de compra **estimado** a partir de `purchasePrice` actualmente registado no produto, se esse valor existir e for válido.
- `categoryAtSale` — categoria indicada no momento da venda.

Essa informação é congelada nos fluxos:
- balcão POS;
- dispensa da farmácia;
- restaurante e bar;
- talho por quilograma;
- grossistas;
- encomendas digitais concluídas.

O preço de compra do catálogo pode ser actualizado depois; isso **não altera o custo armazenado na venda antiga**. Compras recebidas já actualizam o preço de compra no catálogo e passam a influenciar apenas vendas futuras.

**Atenção:** esta é uma aproximação ao **último preço de compra registado**, não representa FIFO, custo médio ponderado, custo por lote, custo industrial ou método contabilístico oficialmente validado. As receitas de padaria/produção e transformações do talho podem ter custos próprios que exigem contabilização adicional. Não atribuímos automaticamente custos históricos a vendas anteriores que não os guardavam.

## Fórmulas e tratamento de dados ausentes
Por período seleccionado:
- **Vendas brutas de mercadorias** = soma de `item.price × item.qty` das vendas concluídas no intervalo.
- **Devoluções** = soma de `ReturnRecord.items[].qty × unitPrice` das devoluções ocorridas no intervalo.
- **Vendas líquidas de mercadorias** = vendas brutas − devoluções.
- **Custo estimado conhecido** = soma de `costAtSale × qty` das linhas com custo, menos custos equivalentes das devoluções registadas no período.
- **Margem bruta estimada** = vendas líquidas de mercadorias − custos estimados, **apenas quando todas as linhas do período têm custo conhecido**.
- **Percentagem de margem** = margem bruta estimada ÷ vendas líquidas × 100, apenas quando a base é positiva.
- **Resultado indicativo** = margem bruta estimada − despesas operacionais registadas no período, **apenas quando todos os custos de mercadorias forem conhecidos**.

### Transparência dos custos em falta
- Se uma venda/devolução não tiver `costAtSale` positivo e válido, o custo da linha é desconhecido, não zero.
- Quando falta custo numa linha, a margem **total** e o resultado indicativo são apresentados como **«Por apurar»**.
- Pode haver uma **margem parcial** das linhas com custo conhecido, mas a interface explica que não representa o negócio inteiro.
- Os artigos de demonstração de versões antigas sem `purchasePrice` continuam sem custo até o operador actualizar o seu cadastro para futuras vendas.
- As vendas históricas **não recebem retroactivamente** o preço actual do catálogo.
- Devoluções de vendas antigas preservam o custo histórico, quando existe, mesmo que a venda original esteja fora do período. Por isso períodos com apenas devoluções podem ter receita e margem negativas.
- As taxas de entrega da venda digital são mostradas em separado e não entram na margem das mercadorias.

### Separações financeiras essenciais
- **Vendas a fiado** entram nas vendas e margens comerciais no momento da venda, mas **receber a dívida** não é uma segunda venda.
- **Compras para stock** já são tratadas como aquisição de inventário e não podem ser novamente abatidas integralmente ao calcular o custo das mercadorias vendidas.
- **Despesas registadas** são subtraídas apenas no resultado indicativo, não na margem bruta.
- Os números continuam sem impostos, custos por lote/transformação industrial, depreciações, perdas não registadas, custos financeiros e parte dos encargos comerciais. **Nunca afirmar «lucro líquido»**.

## Testes automatizados
- Instantâneo de custos e alterações posteriores ao preço de compra.
- Vendas legadas sem custo e mistura de linhas conhecidas/desconhecidas.
- Devoluções parciais, totais e em período diferente da venda.
- Despesas, compras para stock, fiado, taxas de entrega.
- Filtros por datas, relatório de produtos, categorias e exportação CSV.
- Custos congelados em vendas de talho, farmácias, grossistas e encomendas digitais.
- Renderização e filtros da interface.

## Passos seguintes antes da produção
1. Testar os valores com dados fictícios representativos de comerciantes moçambicanos, incluindo preços e quantidades em kg e litros.
2. Confirmar visualmente as páginas em telemóvel (360/390 px), tablet e computador. Ainda não foi feito ensaio num navegador real nesta sessão.
3. Definir contabilização rigorosa do custo por lote, FIFO/custo médio, custo de produção, quebras, impostos e devoluções especiais.
4. Definir permissões de acesso aos relatórios por perfil e isolamento da informação por empresa/filial ao implementar Supabase.
5. Só avançar com documentos fiscais e integração com pagamentos depois de analisar os requisitos legais e as autorizações necessárias.

**Conclusão:** etapa 2/5 implementada em frontend de demonstração, sujeita à aprovação nos testes e à revisão visual antes da integração com o Supabase.
