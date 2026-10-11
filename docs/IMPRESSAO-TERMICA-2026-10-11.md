# Passo 3/5 — Comprovativos térmicos 58 mm e 80 mm
**Produto:** Ubuntu POS 360 — Ubuntu Service, Lda.  
**Data:** 11 de Outubro de 2026  
**Estado:** funcionalidade demonstrativa no frontend, sem Supabase, sem ligação fiscal, sem emissão de factura ou pagamento real.

## Objectivo
Permitir que lojas, pequenos comerciantes, farmácias e operadores de balcão imprimam **resumos de vendas não fiscais**, em rolos de **58 mm** ou **80 mm**, através do sistema de impressão do navegador.

## O que foi desenvolvido
- Após registar uma venda no POS, o comprovativo abre automaticamente para pré-visualização.
- Selecção de largura de papel: **58 mm** (aproximadamente 48 mm de área imprimível) ou **80 mm** (aproximadamente 72 mm de área imprimível). A última largura escolhida fica guardada no navegador.
- Modelo em preto e branco, com tipografia monoespaçada e espaços próprios de impressão térmica.
- Dados de empresa: **nome comercial, morada, contacto, NUIT opcional, texto de rodapé e logótipo opcional**. São editados em **Definições → Comprovativos térmicos**.
- Upload opcional de logótipo PNG/JPG/WebP com limite de 110 KB, guardado apenas no `localStorage`. Não aceita SVG. Nenhum dado predefinido declara NUIT fiscal da Ubuntu Service.
- Artigos, quantidades (até três casas decimais para kg/L), preço unitário, subtotais, taxa de entrega quando aplicável, ajustes presentes na venda, total, data e referência.
- Diferencia vendas a **fiado**, com indicação expressa de que o total não é dinheiro recebido.
- QR Code criado **localmente**, contendo apenas a referência demonstrativa da venda. Não carrega dados pessoais, não requer rede e **não é uma ferramenta de validação fiscal**.
- Botões **Imprimir comprovativo** e **Continuar a vender**, sem reprocessar a venda ao imprimir de novo.
- Em **Relatórios → Histórico de vendas**, botão **Imprimir** em cada linha, para recuperar um comprovativo já registado. Não é necessário fazer uma segunda venda.
- Configuração e histórico anterior preservados por migração não destrutiva do armazenamento local.

## Fluxo de impressão
1. No POS, conclua uma venda demonstrativa.
2. Escolha o papel **58 mm** ou **80 mm** na pré-visualização e confirme a identificação do estabelecimento.
3. Carregue em **Imprimir comprovativo**.
4. No diálogo do navegador, seleccione a impressora térmica instalada e o tamanho de papel correspondente. Desactive cabeçalhos/rodapés automáticos do navegador, se surgirem. Ajuste margens para zero ou o valor mínimo suportado pelo controlador.
5. A impressão utiliza `window.print()`, com `@media print`: a aplicação e os botões desaparecem da impressão, restando apenas o comprovativo.

**Importante:** os navegadores não garantem que seja possível seleccionar programaticamente um rolo ou accionar o corte automático. A impressora tem de estar instalada/configurada no sistema operativo e o seu controlador tem de permitir o papel escolhido. O tamanho real das margens, o corte, a velocidade e a qualidade dependem da impressora e do controlador. Não há protocolo ESC/POS, Bluetooth, WebUSB, WebSerial, WebHID nem impressão silenciosa directa nesta etapa. Se o utilizador escolher «Guardar como PDF», o comprovativo também pode ser guardado como PDF a partir do próprio navegador, sujeito ao formato de página seleccionado.

## Limitações de fiscalização e verificação
- O cabeçalho e rodapé afirmam sempre: **DEMONSTRAÇÃO / NÃO FISCAL**.
- Não constitui factura, recibo fiscal, comprovativo de pagamento real ou comunicação à Autoridade Tributária.
- O NUIT introduzido não é validado automaticamente.
- O QR Code é um identificador local de **demonstração**; não prova que a operação existiu num servidor, não é QR fiscal nem serve para confirmar cobrança.
- Os dados do estabelecimento são a **configuração actual** do protótipo. Se forem alterados, uma reimpressão histórica usa o nome actual: uma implementação fiscal necessita de conservar os dados imutáveis do emissor no documento original.
- Todos os dados continuam restritos ao navegador usado; a área **Empresa** ainda é uma demonstração separada, sem integração de autenticação e permissões reais.
- Um comprovativo impresso de fiado não afirma que a dívida tenha sido liquidada depois.

## Notas técnicas
- `src/lib/thermal-qr.ts` — gerador local de QR Code Model 2, versão 4/L, suficiente para referências com até 78 bytes; caso a referência exceda a capacidade o QR é omitido, nunca truncado.
- `src/lib/thermal-receipt.ts` — definições validadas, dados do comprovativo, normalização de valores e referência.
- `src/components/ThermalReceipt.tsx` — pré-visualização, acções e formulário de configuração.
- `src/styles/thermal-receipt.css` — tamanhos, estilo térmico, impressão exclusiva e layout mobile.
- `src/lib/domain.ts` — adiciona `receiptSettings` ao Store e migra dados anteriores sem perder vendas.
- `src/components/UbuntuApp.tsx` — impressão após pagamento demonstrativo, reimpressão no histórico e definições.
- Os testes automatizados cobrem migrações, composição de valores, fiado, QR local, tamanhos e acções de impressão.

## QA pendente
1. Imprimir em equipamento de 58 mm e 80 mm (marcas e controladores reais).
2. Verificar que a opção de papel do navegador coincide com o papel da impressora.
3. Confirmar impressão e QR legível em Chrome/Edge no Windows, Chrome Android e Safari iOS quando houver impressora suportada.
4. Testar documentos extensos, com nomes longos e muitos artigos, sem cortes ou páginas em branco.
5. Reavaliar qualquer exigência legal de documento fiscal antes de disponibilizar a solução para operação comercial.

**Próximo passo da lista:** 4/5 — central de notificações e alertas operacionais.
