# Passo 4/5 — Central de notificações e alertas operacionais
**Produto:** Ubuntu POS 360 — Ubuntu Service, Lda.  
**Data:** 11 de Outubro de 2026  
**Estado:** frontend demonstrativo. **Sem Supabase, servidores, notificações push, WhatsApp ou SMS.**

## Funcionalidades implementadas
- Nova secção de menu: **Central de alertas**.
- O sino no cabeçalho mostra o número de avisos **por ler**, apresenta até quatro avisos prioritários e tem um atalho **Abrir central de alertas**.
- A página de alertas apresenta indicadores de **Por ler, Urgentes, Alta prioridade e Identificados**, com lista detalhada.
- Filtros: **Por ler / Lidos / Todos**, tipo (Stock, Fiado, Validade, Encomendas), prioridade e pesquisa por palavra-chave.
- Cada aviso oferece **Ver produto / Consultar dívida / Ver lotes / Ver encomenda** e **Marcar lido / Marcar por ler**. Ao abrir uma tarefa, o aviso passa a lido automaticamente.
- **Marcar todos como lidos** guarda o estado local. Isso **não apaga** o aviso nem resolve a situação comercial.
- Configuração dos limiares: **stock baixo 10 unidades**, **validade dentro de 30 dias** e **pedido atrasado após 24 horas**, todos editáveis.
- Ecrãs adaptados a telemóveis; atalho **Central de alertas** incluído no menu rápido móvel «Mais», sem alterar a barra inferior de cinco botões.
- Quando aplicável, o destino é filtrado pelo registo: SKU do produto, cliente em dívida, número do lote ou referência da encomenda.

## Fontes reais de alertas (da demonstração)
| Tipo | Condição | Acção |
|---|---|---|
| Stock baixo | Produto activo com stock livre igual ou inferior ao limite configurado, considerando stock reservado em comandas/encomendas grossistas | Ver produtos |
| Stock esgotado | Stock livre zero | Ver produtos; prioridade urgente |
| Fiado vencido | Movimentos de fiado com data de vencimento ultrapassada e saldo residual positivo, após aplicar pagamentos/devoluções FIFO | Ver clientes filtrados por dívida vencida |
| Lote expirado | Lote de farmácia com quantidade positiva e prazo de validade anterior ao dia actual | Abrir Farmácias e localizar lote; prioridade urgente |
| Lote próximo da validade | Lote positivo com validade dentro do intervalo de dias configurado | Abrir Farmácias e localizar lote |
| Encomenda digital pendente | Estado recebida, confirmada, em preparação, pronta ou em entrega; estados cancelada, entregue e levantada não geram aviso | Abrir Encomendas digitais ou Entregas e procurar por referência |
| Pedido grossista pendente | Estado reservada ou expedida | Abrir Grossistas e procurar por referência |

### Priorização
- **Urgente**: sem stock livre, lote vencido, dívida com mais de 30 dias de atraso, ou encomenda que ultrapassou o prazo configurado.
- **Alta**: stock abaixo de metade do limite, vencimento de lote em sete dias ou menos, dívida vencida mais recente e pedido digital que aguarda mais de 4 horas.
- **Normal**: stock baixo não crítico, lotes dentro do horizonte mais longo ou pedidos pendentes recentes.

Os dias e horas são calculados a partir do relógio local deste dispositivo. Se a hora do aparelho estiver errada, os alertas também poderão ficar incorrectos.

## Actualização e estado lido
- A lista de avisos é **derivada em memória a partir do Store**: não existe base de dados de notificações nem criação artificial de movimentos.
- Quando muda o stock, o saldo vencido, a quantidade/validade do lote ou o estado do pedido, o aviso é recalculado. Um aviso resolvido deixa de aparecer.
- Cada aviso possui um identificador de condição (ex.: `stock:id:saldo` ou `orders:online:id:estado`), permitindo que novas situações voltem a aparecer como **por ler**.
- Os IDs marcados como lidos e os limites são guardados no `localStorage`, com validação de dados antigos e limites de tamanho.
- A interface recalcula o tempo periodicamente **enquanto a página está aberta**. Não continua a executar verificações com o navegador fechado.

## Limitações
- Este protótipo não envia comunicações externas e não tem notificações push, serviço agendado ou garantias de entrega.
- A marcação «Lido» é local ao navegador. Não está sincronizada entre funcionários, empresas ou filiais.
- Não calcula validade de produtos sem registo de lote; não cria datas que não existam.
- Apenas as encomendas e lotes realmente registados no browser aparecem.
- O alerta ajuda a navegar para o módulo, mas não executa acções financeiras, alteração de inventário ou mudanças de estado sem intervenção do operador.
- A hierarquia de permissões e isolamento multiempresa serão definidos na futura integração Supabase.

## Testes
- Stock livre (inclusive reservas e stock zero), limites, produtos inactivos.
- Fiado vencido com pagamentos parciais e resolução da dívida.
- Lotes expirados, hoje, próximos da validade, esgotados e fora do limite.
- Pedidos digitais/grossistas pendentes e encerrados.
- Identificadores estáveis, leitura/desleitura, reaparecimento após alterações e migração não destrutiva de dados históricos.
- Renderização do sino, central, filtros, alteração de limites e navegação contextual.

## Próxima etapa
**Passo 5/5:** preparar verdadeiro modo offline-first, registo local de operações e estratégia de sincronização segura antes da ligação Supabase. Esta etapa ainda não está implementada.

**Validação física pendente:** testar visualmente a central e a barra móvel em telemóveis reais, incluindo Safari/Chrome, teclado e leitores de ecrã.
