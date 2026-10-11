# Preços de compra e de venda no cadastro do produto

O formulário de **Adicionar produto** e **Editar produto** pede agora os seguintes valores, em MZN e por unidade de venda:

- **Preço de compra**: custo unitário de referência do produto (valor positivo com até duas casas decimais).
- **Preço de venda**: preço unitário praticado no POS e exibido no catálogo (valor positivo com até duas casas decimais).
- **Diferença bruta por unidade**: preço de venda menos preço de compra; apresentada durante o cadastro e na tabela de produtos. **Não é lucro líquido**, pois não desconta impostos, perdas, transportes, descontos e despesas.
- **Stock inicial**: quantidade existente; separada de preços.

## Compatibilidade e funcionamento

1. Produtos guardados em versões anteriores continuam disponíveis e vendem pelo preço de venda já registado. O custo de compra anterior é **desconhecido**; a tabela apresenta `Por definir` e **não inventa custos nem margens**.
2. Ao editar um produto antigo, é solicitado preencher o preço de compra antes de guardar alterações.
3. Quando uma compra é recebida na área **Compras**, o custo unitário efectivamente registado no documento actualiza o **preço de compra de referência** do produto. O preço de venda **não** muda.
4. O formulário de compras sugere como custo unitário o último preço de compra de referência, quando existe, permitindo corrigi-lo na nova compra.
5. Os valores de compra históricos ficam preservados nas linhas dos documentos de compra.
6. A diferença bruta negativa é permitida e sinalizada, para que a empresa consiga registar descontos, promoções ou vendas abaixo do custo de forma consciente.
7. Esta alteração não cria valor de custo das mercadorias vendidas (CMVMC), margens efectivas por período, lucro líquido ou cálculo fiscal. Esses recursos dependerão de regras contabilísticas e do backend.

## Validação

- `src/lib/product-pricing.test.ts`: valores válidos, produtos antigos, diferença bruta e actualização do custo na compra.
- `src/test/product-pricing-ui.test.tsx`: campos obrigatórios de compra e venda, gravação de novos produtos, edição de produtos antigos.

**Estado:** desenvolvimento frontend demonstrativo; ainda sem Supabase e sem facturação real.
