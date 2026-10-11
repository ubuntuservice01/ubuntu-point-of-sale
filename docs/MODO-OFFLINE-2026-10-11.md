# Passo 5/5 — Modo offline e arquitectura preparada para sincronização
**Produto:** Ubuntu POS 360 — Ubuntu Service, Lda.  
**Data:** 11 de Outubro de 2026  
**Estado:** funcionamento local reforçado e preparação do diário de operações. **A sincronização remota NÃO está activada; o Supabase NÃO foi alterado.**

## Objectivo
Permitir que, depois de uma primeira visita com ligação e recursos armazenados, o comerciante possa regressar ao ponto de venda principal sem rede, efectuar operações demonstrativas locais e identificar exactamente o que ainda **não foi enviado a um servidor**. Preservar o histórico local e preparar contratos de futura sincronização sem criar uma falsa ligação ou risco de duplicar transacções.

## Componentes implementados
1. **IndexedDB** — `src/lib/offline-db.ts`: armazena a versão corrente do estado da demonstração e o diário `outbox` numa mesma transacção de leitura/escrita. O `localStorage` permanece como cópia secundária e modo de compatibilidade, não como sincronização remota.
2. **Migração automática:** `loadOffline()` procura primeiro o estado IndexedDB; na primeira abertura, importa o histórico antigo de `ubuntu-pos360-demo-v1` sem recriar vendas nem enfileirar eventos históricos fictícios.
3. **Diário de operações pendentes:** `src/lib/offline-model.ts` identifica alterações nos registos de venda, compras, produtos, fiado, devoluções, movimentos de stock, encomendas, lotes, clientes, despesas, catálogos e outras colecções. Inclui configurações globais do protótipo e visibilidade do catálogo. Guarda um ID de operação único para cada mudança, ID da instalação, tipo de alteração, carga de dados, data, estado `pending`, tentativas e revisão remota **nula**.
4. **Transacções duráveis:** o instantâneo e os novos eventos são gravados na mesma transacção IndexedDB (quando suportado). No caso de falha na operação, não deve haver confirmação parcial dentro do IndexedDB. O modo `localStorage` não possui esta garantia.
5. **Identificador de versão local (`writeId`):** impede que uma segunda aba com uma versão antiga substitua silenciosamente o estado IndexedDB actualizado por outra aba. Em caso de conflito, surge um aviso para guardar backup e recarregar antes de continuar.
6. **Cache local da aplicação:** `public/sw.js` regista um Service Worker para armazenar a página principal `/`, scripts, CSS e imagens estáticas de mesma origem. Não intercepta POST nem cacheia APIs, sessões ou páginas de outros perfis. `public/manifest.webmanifest` prepara o atalho instalável (PWA), quando suportado pelo browser.
7. **Estado visível:** o topo mostra se o dispositivo indica ligação à rede ou ausência dela e o número de alterações na fila. **Definições → Modo offline e dados locais** apresenta o tipo de armazenamento, operações pendentes, estado da cache e última confirmação de gravação local.
8. **Exportação manual de cópia JSON:** guarda o estado corrente do protótipo e a fila de eventos. A cópia inclui nomes, contactos, saldos de fiado e movimentos comerciais: deve ficar num local seguro.
9. **Reposição explícita da demonstração:** limpa o diário local, sem tratar a reposição como eventos de exclusão remota. Não apaga outros sites ou aplicações do navegador.

## Sequência de utilização offline
1. Abrir a aplicação numa ligação HTTPS e **aguardar a preparação do cache**. A primeira utilização requer internet e compatibilidade com Service Workers.
2. Registar produtos/stock e efectuar vendas com a aplicação carregada; a UI grava dados locais mesmo que `navigator.onLine` indique ausência de internet.
3. Ao perder a ligação, a secção principal `/` pode ser aberta a partir da cache existente. Os recursos estáticos necessários precisam ter sido descarregados anteriormente.
4. O comerciante pode consultar o histórico e fazer operações da demonstração sem aguardar servidor. A fila **pendente** cresce à medida que os registos são alterados. Vários eventos podem resultar da mesma venda — por exemplo, venda, movimento de stock e alterações do produto.
5. Quando a internet regressar, o estado visual muda para «Com ligação», **mas a fila não é apagada nem enviada**. O servidor, autenticação e protocolos de sincronização ainda não existem nesta etapa.
6. O operador pode exportar uma cópia manual em **Definições** para proteger o trabalho.

## Restrições importantes
- **Não é sincronização activa com Supabase** nem com outros dispositivos. Os eventos ficam apenas no browser até existir serviço seguro.
- A **contagem de pendentes não significa número de vendas**: corresponde a mudanças de registos. A reedição de um mesmo produto gera outra operação pendente.
- O diário permite preparar idempotência com IDs únicos, mas a prevenção de **duplicações no servidor** requer uma API transaccional com `UNIQUE(client_operation_id)` e respostas de confirmação recuperáveis. O servidor ainda não foi criado, por isso **não existe garantia de ausência de duplicados entre dispositivos**.
- Os campos `baseRevision:null` impedem envio automático de operações que não tenham uma revisão remota conhecida. A função `checkRemoteRevision` devolve `conflict` quando a revisão não é conhecida ou diverge; para o futuro, será necessário um fluxo validado de registos novos e importações iniciais.
- **O funcionamento em separadores abertos em simultâneo está limitado**: IndexedDB detecta conflitos de versão e avisa, mas é necessário parar, exportar e recarregar. O modo compatível com localStorage não dá o mesmo isolamento.
- O Service Worker usa cache apenas para a **rota principal** e recursos estáticos. As rotas /empresa, /super-admin e o catálogo público não têm modo offline completo nesta etapa.
- O estado **online/offline é o indicador do navegador**, não uma confirmação de acesso ao Supabase.
- Não são efectuadas tentativas automáticas de envio, reconciliação, alteração do estado para «sincronizado», resolução silenciosa de conflitos, sincronização em background ou push.
- O IndexedDB é persistência *best effort*: utilizadores, sistemas operativos, navegadores ou limpeza de cookies/dados podem apagar a informação. Sem encriptação dos dados em repouso nem autenticação local; utilizar apenas para **demonstrações**.
- Como a interface React ainda confirma uma operação antes de o efeito assíncrono de armazenamento acabar, **não garantimos resistência a encerramento súbito entre o clique e a confirmação de gravação**. A informação de «Última gravação local» permite acompanhar a conclusão. Um POS de produção deverá aguardar `await persistOffline(...)` antes de mostrar «Venda concluída» e implementar transacções server-side equivalentes.
- O backup JSON não é cifrado; contém informação de clientes e não deve ser publicado ou partilhado sem autorização.

## Arquitectura de produção para a próxima fase com Supabase

### Multiempresa / multiutilizador
- Cada operação terá identificador obrigatório de **tenant** e eventualmente de loja/filial, além de ID da instalação, do operador autenticado e da operação. Os eventos locais desta fase **não estão autorizados para envio** até passar por reconciliação/importação autenticada.
- Policies RLS impedirão acesso entre empresas; clientes não poderão seleccionar ou alterar tenant IDs livremente.
- Uma operação de venda deverá escrever, numa só transacção PostgreSQL, venda, itens, stock, movimentos, fiado e pagamento autorizado, com validações de stock disponível, moeda e regras de catálogo.

### Protocolo recomendado
1. O cliente envia lotes de operações autenticadas com `client_operation_id`, `tenant_id`, `device_id`, `base_revision` e payload.
2. O servidor recusa tenant ou permissões inválidas e rejeita revisões desactualizadas como conflitos. Deve existir um caminho específico de importação inicial para eventos legados sem `base_revision`.
3. O servidor grava cada operação validada com chave única de idempotência, dentro de uma transacção que inclui as mutações comerciais.
4. A resposta contém a revisão persistida e o ID já aceite. **Só depois** o cliente poderá marcar a entrada correspondente como sincronizada/removida do outbox.
5. Se a resposta se perder e o cliente voltar a enviar a operação, o servidor devolve o resultado já gravado, sem criar venda duplicada.
6. Conflitos de stock/preços/movimentos serão apresentados ao utilizador ou tratados por regras de negócio explícitas, sem substituir a base silenciosamente.
7. Tratar devoluções, crédito, stock reservado, vendas parciais, lote farmacêutico e alteração simultânea de preços de modo específico por domínio.

## Testes automatizados
- Geração de eventos por inserção, alteração, remoção e configurações, sem eventos quando os dados são idênticos.
- Ids de operação únicos, fila com estados `pending/conflict` e contrato de revisão remota.
- Migração do histórico anterior sem eventos retroactivos.
- Gravação de snapshot e fila no modo de compatibilidade localStorage.
- Reposição da demonstração e limpeza da fila pendente.
- Integração do estado de ligação, indicadores, cópia de segurança e fluxo React.
- Verificação de TypeScript e compilação de produção pelo GitHub Actions.

## QA pendente
- Ensaio real em Chrome/Edge no Windows e Chrome Android, abrindo a rota principal em modo avião depois do primeiro carregamento online.
- Experiências com espaço cheio, navegação privada, IndexedDB indisponível, browser encerrado durante gravação e vários separadores.
- Verificação da exactidão do stock após vendas consecutivas sem ligação e recuperação de backups.
- Testes de segurança, acessibilidade, contraste e tamanho táctil em dispositivos reais.

**Conclusão:** esta etapa prepara o POS para uso local resiliente e futura sincronização segura, **não** a substitui por uma simulação de servidor.
