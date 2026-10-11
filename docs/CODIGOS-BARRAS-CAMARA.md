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

## Confirmação sonora — bip de leitura

- Ao **adicionar um produto ao carrinho por leitura de código** (câmara, leitor USB ou SKU confirmado com Enter), o POS reproduz um **bip curto** pelo Web Audio do navegador.
- A leitura de código na janela de cadastro também confirma o preenchimento com um bip.
- Não toca quando o código não existe, o produto foi desactivado, o stock livre é insuficiente ou o artigo exige controlo de lotes.
- O bip é produzido localmente, sem ficheiro de áudio descarregado e sem envio de dados.
- Ao abrir o leitor de câmara, o áudio é preparado no clique do operador para aumentar a compatibilidade com as restrições de reprodução dos browsers. O bip depende do volume e das permissões de áudio do dispositivo; não se pode forçar o som em aparelhos silenciados.

## Leitor USB no computador (modo teclado)

O POS aceita os leitores USB de códigos de barras que se identificam como **teclado** ("keyboard wedge"). Não exige WebUSB, WebHID nem instalação de controladores no frontend.

**Modo automático:** em **Ponto de venda**, ecrã de computador acima de 650 px, quando nenhum formulário está em edição, basta ler o código com o leitor USB. Se o leitor transmitir os caracteres rapidamente e terminar em **Enter** ou **Tab**, o produto será procurado pelo código comercial (EAN/UPC) ou SKU e adicionado ao carrinho com o bip de confirmação.

**Modo compatível:** caso o leitor transmita os caracteres devagar, não use sufixo, ou o navegador tenha foco num campo, clique **Focar pesquisa** (ou na caixa de pesquisa) e leia o código. Configure preferencialmente o leitor para adicionar **Enter** ao final de cada leitura.

**Protecção contra leituras acidentais:**
- O reconhecimento global só funciona no POS, em computador, fora de modais e da gaveta de navegação.
- O código deve conter pelo menos seis caracteres, chegar como sequência rápida e terminar em Enter ou Tab num prazo curto. Isto reduz o risco de interpretar a digitação normal como leitura de produtos.
- Não intercepta teclas enquanto se está a escrever em campos `input`, `textarea`, `select` ou elementos editáveis.
- Os produtos continuam sujeitos ao controlo de stock e reservas.

**Limites:** esta implementação não detecta fisicamente se existe um scanner USB ligado; detecta os eventos de teclado enviados por equipamentos configurados nesse modo. Dispositivos que exigem drivers próprios, acesso HID específico ou integração com porta série podem necessitar de uma solução adicional. O teclado virtual dos telemóveis não activa a captura USB global.

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
- O bip de leitura não contém informações do produto nem transmissão externa.
- Não se gravam fotografias, vídeos ou leituras em servidores. Um código digitado/registado fica guardado apenas no `localStorage` da demonstração.
- O código de barras serve para **identificar o produto**, não autenticar o pagamento, certificar o artigo nem emitir factura.
- A aplicação não gera automaticamente EAN legítimos nem valida registos de entidades emissoras GS1.

## Testes previstos no workflow

- Funções puras: normalização, UPC-A/EAN-13, detecção de duplicados e pesquisa por SKU/código.
- Frontend: adicionar ao carrinho manualmente quando o navegador não tem BarcodeDetector.
- Produto desconhecido: preencher automaticamente os dois códigos no cadastro.
- Leitura para editar o cadastro; rejeitar código duplicado.
- Câmara simulada: pedir acesso, reconhecer e parar os tracks da câmara.
- Sequências USB rápidas por Enter/Tab, entrada manual, bloqueio em formulários e confirmação sonora somente após sucesso.
- Os testes de código **não substituem** ensaios físicos de leitura de embalagens num Android compatível ou outros dispositivos.

## Restantes etapas propostas

2. Relatórios de margens e rentabilidade.
3. Impressão térmica 58/80 mm.
4. Central de alertas.
5. Preparação do modo offline e futura sincronização.

**Nota:** estes cinco pontos seguem a sequência seleccionada nesta conversa. As etapas seguintes **ainda não estão implementadas** por este trabalho.
