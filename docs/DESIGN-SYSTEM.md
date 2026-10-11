# Ubuntu POS 360 — Design System Claro e Humano (v1.1)

## Objectivo
Criar uma interface de gestão comercial que seja acolhedora, rápida, previsível, profissional e confortável de utilizar durante todo o dia. O sistema **abre em modo claro**. Não aplicamos tema escuro, faixas decorativas no topo dos cartões, brilhos ou gradientes sem função, ícones gigantes de preenchimento, nem cartões com falsos indicadores de tendência.

## Inspirações de UX profissional
- Shopify Admin e Polaris — densidade adaptada à tarefa, navegação previsível, grupos de informação, foco naquilo que o comerciante precisa de fazer.
  - https://www.shopify.com/blog/admin-new-look
  - https://shopify.dev/docs/apps/design/visual-design
- Atlassian Design System — componentes consistentes, acessibilidade, padrões familiares e decisões documentadas.
  - https://atlassian.design/get-started/about-atlassian-design-system
- Material Design — tipografia hierárquica e cores com papéis semânticos.
  - https://m3.material.io/

As referências são **inspiração funcional**, não reproduções gráficas.

## Paleta

| Papel | Cor | Valor |
|---|---|---|
| Fundo principal | Cinza muito claro | `#F8FAFC` |
| Superfícies e cartões | Branco | `#FFFFFF` |
| Texto principal | Azul-grafite | `#18212F` |
| Texto secundário | Cinza ardósia | `#475569` |
| Bordas | Cinza claro | `#E2E8F0` |
| Identidade | Verde esmeralda | `#10B981` |
| Botões primários com texto branco | Verde escuro contrastante | `#087F61` |
| Informação | Ciano | `#06B6D4` |
| Destaques / atenção | Âmbar | `#F59E0B` |
| Erros | Vermelho | `#EF4444` |

**Regra fundamental:** cor realça uma tarefa ou estado. A estrutura dos cartões não recebe faixas coloridas decorativas. Valores de fiado vencido recebem texto legível e um estado explícito, não apenas uma cor.

## Tipografia

- **Space Grotesk**: cabeçalhos e indicadores financeiros.
- **Hanken Grotesk**: menus, conteúdos, botões, formulários e mensagens.
- **JetBrains Mono**: referências, SKU e códigos.
- Usar fontes de sistema como fallback; não incluir nem distribuir ficheiros de fontes.
- Corpo: 14–16 px; tabelas: 13–14 px; títulos: 20–30 px; legendas: 12 px quando necessário.
- Valores em MZN com números tabulares para leitura rápida.

## Cartões e estruturas
- Superfície branca, borda neutra de 1 px, raio moderado, sombra discreta.
- Cada cartão: rótulo descritivo, número principal ou acção e contexto.
- Não colocar barras superiores, gradientes, setas de crescimento inventadas ou ícones sem função.
- Gráficos mostram dados reais do contexto; quando vazios, apresentam uma explicação útil.
- Barra lateral clara e recolhível, com destaque verde suave para a secção actual.
- Pesquisa e filtros próximos da tabela a que dizem respeito.

## Microcopy em português de Moçambique
Preferir:
- **Fiado e dívidas** (em vez de créditos genéricos)
- **Saldo por pagar**, **Dívidas vencidas**, **Registar pagamento**, **Perto do limite**
- **Produtos e stock**, **Caixa**, **Armazém**, **Registar venda**, **Utilizadores**
- Mensagens humanas, concretas e breves: «Ainda não há vendas»; «Registe o primeiro cliente para começar».

## Segurança e honestidade da interface
As operações da primeira fase são uma **demonstração local**. Evitar transmitir que existem pagamentos reais, emissão fiscal, tenant isolado, sincronização offline ou permissões que ainda não foram implementadas. Não usar dados reais de clientes.

## Qualidade
Aplicar boas práticas de WCAG 2.2 AA: contraste, labels, teclado, foco visível, estados de erro textuais, tamanho adequado de áreas clicáveis, desenho responsivo, redução de movimentos. Verificar desktop, tablet e telemóvel.

O guia por ecrã encontra-se em `docs/UX-ECRAS.md`.
