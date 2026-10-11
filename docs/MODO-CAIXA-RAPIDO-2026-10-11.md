# Modo Caixa Rápido — Ubuntu POS 360
**Ubuntu Service, Lda.**  
**Data:** 11 de Outubro de 2026  
**Estado:** interface funcional na demonstração local; sem Supabase, processamento real de pagamentos ou controlo de permissões de produção.

## Finalidade
Disponibilizar aos operadores de balcão um ecrã específico de operação rápida. O **Modo Caixa Rápido** não substitui o ponto de venda normal nem cria uma rotina paralela de pagamentos: ambos partilham o carrinho, a validação do stock, os métodos de pagamento, o fiado, a criação da venda, os movimentos de stock, o histórico e o comprovativo térmico.

### Como activar
1. Abrir **Ponto de venda**.
2. Carregar em **Modo Caixa Rápido** no cabeçalho.
3. O ecrã passa a apresentar um catálogo em cartões grandes e, no painel de venda, carrinho, meios de pagamento, cliente, montante recebido e teclado numérico.
4. Para voltar ao POS normal, clicar em **Modo normal**. **Os artigos do carrinho não são apagados**. A preferência é guardada apenas no navegador utilizado.

Em computador, o menu lateral fica oculto enquanto o modo rápido está activo, reduzindo a quantidade de opções visuais. Em telemóvel, o catálogo e o carrinho aparecem numa só página, com botão fixo para chegar ao resumo da venda.

## Operação do caixa
- **Adicionar produto:** tocar/clicar num cartão. A quantidade inicial é 1 unidade. Um artigo esgotado ou controlado por lotes farmacêuticos fica indisponível para venda rápida.
- **Pesquisa/scan:** procurar por SKU, código de barras ou nome; usar `Enter` para adicionar o código exacto ou o único resultado encontrado; a leitura por scanner USB e câmara continua disponível.
- **Carrinho:** clicar num artigo para o seleccionar. Os botões +/− alteram a quantidade; o teclado numérico grande permite indicar uma quantidade exacta e carregar em **Aplicar quantidade**. Não ultrapassa o stock livre. Unidades inteiras não permitem fracções; kg e litros aceitam até três casas decimais.
- **Meio de pagamento:** botões de Dinheiro, M-Pesa, e-Mola, Cartão e Fiado. Nenhuma dessas opções comunica nesta fase com bancos, carteiras móveis ou provedores externos.
- **Dinheiro:** o caixa precisa estar aberto (mesma regra do POS normal). No separador **Valor recebido**, inserir o valor entregue ou carregar em **Valor exacto**. O sistema calcula o **troco previsto** no ecrã e só habilita o botão de venda quando o montante é suficiente. **O valor recebido e troco não são lançados como movimentos separados; são uma ajuda de cálculo demonstrativa**.
- **Fiado:** exige escolher um cliente e respeita o limite de crédito. Mantém a data de vencimento opcional do POS normal.
- **Registar venda:** chama a função de venda existente; mantém auditoria, verificação de stock e abertura do comprovativo térmico, sem duplicar operações.
- **Limpar carrinho:** apresenta confirmação. A limpeza não cria nem apaga vendas anteriores.
- **Registar cliente:** abre o formulário comum do POS.

## Atalhos de teclado (computador)
| Tecla | Acção |
|---|---|
| `F2` | Focar a pesquisa de artigos no modo rápido |
| `/` | Focar a pesquisa (quando não está a digitar num campo) |
| `Enter` na pesquisa | Adicionar o código exacto ou o único artigo encontrado |
| `F4` | Registar a venda **apenas se todas as validações estiverem satisfeitas** |
| `F8` | Pedir confirmação para limpar a venda (fora de campos editáveis) |
| `Escape` | Limpar a entrada numérica, fora de campos editáveis |

O scanner USB em modo teclado mantém reconhecimento de sequências rápidas terminadas em Enter/Tab. O teclado numérico apresentado no ecrã tem botões grandes adequados a monitores tácteis; não intercepta globalmente os algarismos digitados para evitar conflito com scanners.

## Perfil de operador: limite de segurança
O ecrã reduz distracções e expõe as acções usuais de quem atende ao balcão. **Ocultar o menu é uma configuração visual e NÃO constitui autorização de acesso ou controlo RBAC.** Um utilizador não autenticado da demonstração pode regressar ao modo normal. Para produção é obrigatório integrar autenticação, perfis e políticas RLS no Supabase, restringindo permissões de alteração de preços, custos, utilizadores, relatórios e configurações conforme o papel do trabalhador.

## Dados e operação offline
Os lançamentos continuam no armazenamento local da demonstração, com a fila de operações pendentes implementada anteriormente. Não há envio remoto nem validação bancária. O cálculo de troco não altera o total da venda. Alternar o modo visual não altera o histórico ou as operações pendentes.

## Testes incluídos
- Teclado numérico: entrada, vírgula, backspace, limite de casas decimais.
- Quantidades inteiras e fraccionárias, stock livre e validação de limites.
- Troco, caixa fechado, dinheiro insuficiente, fiado sem cliente, pagamentos digitais.
- F2, F4, F8; botão de câmara; selecção do produto e aplicação da quantidade.
- Alternância normal/rápido sem perder o carrinho.
- Scanner USB com sequência rápida, sem duplicar entradas.

## Limitações de validação física
É necessário testar em navegador e dispositivos reais, sobretudo num balcão Windows com leitor USB, monitor táctil, impressora térmica e numa ligação offline. Não foi implementado controlo de operador por palavra-passe ou PIN, processamento de pagamentos reais, gaveta de dinheiro nem impressão silenciosa.
