# Ubuntu POS 360 — Código de barras pela câmara

**Etapa 1/5: leitor de código de barras pela câmara de telemóvel**  
Data: 11 de Outubro de 2026  
Estado: frontend demonstrativo (sem Supabase nem pagamentos reais).

## Fluxo no telemóvel

1. Abra **Vender → Produtos → Ler código com a câmara**.
2. Autorize a câmara. A aplicação tenta usar a câmara **traseira** e lê os formatos suportados pelo navegador.
3. Aponte o código de barras do produto para a moldura. Se o produto estiver cadastrado e tiver stock livre, o POS **adiciona uma unidade ao carrinho** e fecha a câmara.
4. Se não estiver cadastrado, a aplicação mostra o código e oferece **Registar produto com este código**. O formulário é aberto com SKU e código de barras preenchidos; o operador fornece nome, preço de compra, preço de venda e stock e guarda o produto.
5. Se o produto estiver desactivado, com stock reservado/esgotado ou sujeito a lotes farmacêuticos, a aplicação **não o coloca no carrinho**.
6. Se a câmara falhar ou o navegador não suportar a leitura automática, pode escrever um **EAN, UPC ou SKU** no campo manual do mesmo painel.

No cadastro/edição de produtos existe um campo **Código de barras (opcional)**, separado do SKU, e um botão móvel para ler o código com a câmara. Produtos de versões anteriores mantêm-se válidos, sem inventar códigos.

## Compatibilidade

A leitura automática desta fase usa a API nativa **BarcodeDetector** e `getUserMedia`, quando disponíveis. Não é uma garantia de funcionamento em todos os telemóveis.

- A câmara requer **HTTPS** (ou localhost) e autorização explícita.
- Em alguns navegadores Android modernos, a leitura automática está disponível.
- Em navegadores que não disponibilizam a API (incluindo versões de Safari/iOS e Firefox), a **procura manual continua funcional**, mas a câmara não faz reconhecimento automático.
- Formatos tentados: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF, Codabar e QR, desde que suportados pelo navegador. Códigos que não sejam uma identificação de produto válida são rejeitados.
- Um leitor USB ou Bluetooth que actue como teclado continua a funcionar na pesquisa normal do POS por SKU/código.

**Não há decodificador ZXing de compatibilidade universal nesta etapa.** Se for essencial garantir leitura por câmara em Safari/iOS e Firefox, deve-se acrescentar um motor de leitura local testado (por exemplo, ZXing) com as dependências correctamente fixadas, em vez de depender de um CDN externo.

## Regras comerciais e de segurança

- O código comercial é **opcional** e único entre os produtos da demonstração.
- Há validação de colisões entre o campo Código de barras e os SKUs de outros produtos, inclusive diferenças UPC-A / EAN-13 com zero inicial.
- A operação de venda respeita o mesmo controlo de stock livre, reservas de comandas e encomendas e restrição de lotes farmacêuticos.
- A câmara é desligada quando a janela fecha ou a leitura termina; os fotogramas são analisados localmente pelo navegador.
- Não se gravam fotografias, vídeos ou leituras em servidores. Um código digitado/registado fica guardado apenas no `localStorage` da demonstração.
- O código de barras serve para **identificar o produto**, não autenticar o pagamento, certificar o artigo nem emitir factura.
- A aplicação não gera automaticamente EAN legítimos nem valida registos de entidades emissoras GS1.

## Testes previstos no workflow

- Funções puras: normalização, UPC-A/EAN-13, detecção de duplicados e pesquisa por SKU/código.
- Frontend: adicionar ao carrinho manualmente quando o navegador não tem BarcodeDetector.
- Produto desconhecido: preencher automaticamente os dois códigos no cadastro.
- Leitura para editar o cadastro; rejeitar código duplicado.
- Câmara simulada: pedir acesso, reconhecer e parar os tracks da câmara.
- Os testes de código **não substituem** ensaios físicos de leitura de embalagens num Android compatível ou outros dispositivos.

## Restantes etapas propostas

2. Relatórios de margens e rentabilidade.
3. Impressão térmica 58/80 mm.
4. Central de alertas.
5. Preparação do modo offline e futura sincronização.

**Nota:** estes cinco pontos seguem a sequência seleccionada nesta conversa. As etapas seguintes **ainda não estão implementadas** por este trabalho.
