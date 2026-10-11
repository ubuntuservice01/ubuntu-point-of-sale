# Design System Ubuntu POS 360 — Tactile Velocity

Referência de estilo aprovada: **tema azul-noite com acentos vivos**, cartões escuros com profundidade moderada, elevada legibilidade, hierarquia evidente e interacções discretas.

## Paleta

| Papel | Cor | Código |
| --- | --- | --- |
| Principal / êxito | Verde esmeralda | `#10B981` |
| Secundária / dados | Ciano | `#06B6D4` |
| Terciária / alerta | Âmbar | `#F59E0B` |
| Fundo e navegação | Azul-noite | `#0F172A` |
| Cartões | Azul ardósia escuro | `#17243B` |
| Texto primário | Branco suave | `#EDF8F5` |
| Bordas | Cinza azulado | `#2C3B54` |

Não usar cor para transmitir informação sozinha. Botões verdes sobre fundo escuro usam **texto escuro**, para garantir contraste. Texto principal deve ser claro sobre superfícies escuras.

## Tipografia

- **Títulos:** `Space Grotesk` — títulos, números em destaque, KPIs.
- **Texto do corpo:** `Hanken Grotesk` — menus, parágrafos, botões e formulários.
- **Etiquetas:** `JetBrains Mono` — referências de vendas, etiquetas técnicas e códigos.

Fontes obtidas por Google Fonts com fallback para fontes locais do sistema. Não incorporar nem disponibilizar ficheiros de fontes.

## Princípios UX

1. Foco visível para teclado e alvos tácteis confortáveis.
2. Todos os preços em **MZN**, sem imposto presumido.
3. Terminologia local: **fiado, dívidas, armazém, caixa, estabelecimento, utilizadores**.
4. Um botão deve executar uma acção clara, ou comunicar que o recurso ainda não está disponível.
5. Fluxos curtos, mensagens de erro úteis, ecrãs vazios explicativos.
6. Modo POS optimizado para rapidez; administração para leitura de números e tabelas.
7. Microinteracções rápidas; respeitar `prefers-reduced-motion`.
8. Diferenciar operações de **demonstração** de funcionalidades bancárias e fiscais reais.

## Fiado

- Um cliente pode ter um limite opcional; limite 0 impede novo fiado.
- Uma venda a fiado grava montante e prazo opcional.
- Pagamentos parciais são abatidos aos movimentos mais antigos.
- Dívidas só ficam **vencidas** se foi especificada uma data e essa data passou.
- Histórico guarda movimentos (compra, pagamento, saldo de abertura); não apaga o livro.
- **Atenção:** demonstração em `localStorage` não é sistema contabilístico definitivo. Migrar futuramente para operações transaccionais e políticas de autorização no Supabase.

