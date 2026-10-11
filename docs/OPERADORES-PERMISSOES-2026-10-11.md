# Ubuntu POS 360 — Gestão de operadores e permissões (fase de frontend)
**Ubuntu Service, Lda.** | 11 de Outubro de 2026

## Âmbito desta fase
Implementada uma demonstração funcional de identificação local de operadores, perfis, restrições de menus e fluxos de aprovação com PIN. **Não é autenticação segura de produção, não tem Supabase, não existe isolamento multiempresa e não altera os painéis externos de Super Admin/Empresa.**

O protótipo mantém o histórico de vendas, produtos, clientes, fiado e movimentos existentes. A migração do estado anterior cria somente um **Gerente da demonstração**, sem PIN, para preservar o acesso à aplicação antiga. Recomenda-se configurar um PIN no primeiro acesso; até lá o gerente de exemplo pode iniciar sessão sem PIN.

## Perfis
| Perfil | Áreas visíveis | Restrições |
|---|---|---|
| Gerente | Todas as secções, operadores, lucros, relatórios, preços, caixa | É o responsável pelo cadastro, PINs e aprovações |
| Supervisor | Vendas, caixa, clientes, produtos, fornecedores, compras, devoluções, operações sectoriais | Não abre relatórios de lucro, administração ou definições; alteração de preços de venda/compra requer PIN do gerente |
| Operador de caixa | Ponto de venda, clientes, caixa, alertas | Sem lucros, preços de produtos, inventário ou administração; devolução requer PIN do supervisor ou gerente |
| Responsável de stock | Produtos (consulta), inventário, compras, fornecedores, alertas | Sem vendas, relatórios financeiros, edição directa de preços ou administração |

As permissões são verificadas na navegação, pesquisa de secções, menu lateral, menus rápidos no telemóvel e no encaminhamento de operações pelo ecrã principal. O acesso a módulos não autorizados não se baseia apenas na ocultação do menu. Porém, os dados continuam no navegador e podem ser adulterados com ferramentas do programador: **este frontend não é uma fronteira real de segurança**.

## Fluxos disponíveis

### Gerente: criar e gerir operador
1. Abrir **Operadores e permissões**.
2. Clicar **Novo operador**.
3. Introduzir nome, papel e PIN de 4 a 8 números.
4. Guardar. O PIN é processado localmente por **PBKDF2/SHA-256 com sal aleatório**, 160.000 iterações; não é guardado em texto simples.
5. Editar nome/papel, definir novo PIN ou activar/desactivar contas existentes. Não é permitido desactivar a própria conta nem retirar o último gerente activo.
6. As alterações de operadores são lançadas no histórico de auditoria local. Sem servidor, ninguém pode confiar nestes registos como prova irrefutável.

### Operador: entrar, trocar e sair
- Em **Perfil do operador → Sair ou trocar de operador**, a sessão local é terminada e o carrinho actual é limpo.
- Escolher operador activo, introduzir PIN (quando configurado), e abrir a secção apropriada ao perfil.
- A sessão é armazenada apenas na tab do navegador (`sessionStorage`). A aplicação não revela automaticamente contas inactivas.
- Se um operador é desactivado durante a sessão, o frontend retira o acesso ao detectar a alteração.
- **Nota:** sessões locais não usam refresh tokens, cookies seguros, políticas RLS, rate limiting no servidor ou auditoria imutável.

### Caixa: solicitar devolução
1. No ponto de venda, **Solicitar devolução**.
2. Um supervisor ou gerente **diferente do caixa** escolhe o nome e introduz o seu PIN.
3. Se válido, é criado um registo local de aprovação com aprovador, solicitante, data e descrição; o operador abre temporariamente o módulo de devoluções.
4. O acesso temporário expira após aproximadamente 2 minutos, ou ao navegar para outra secção. As devoluções novas recebem `operatorId` e `approvedBy` no registo.
5. O supervisor/gerente já tem permissão directa para devoluções; não precisa de repetir a aprovação.
- **Em produção**, a autorização deve ser vinculada a uma transacção e validada pelo servidor antes de criar devolução ou reembolso.

### Supervisor: pedir autorização para alterar preço
1. No cadastro de produto, modificar preço de compra ou venda, ou cadastrar artigo novo com preços.
2. O frontend solicita o PIN de **outro gerente activo** com PIN configurado.
3. Após PIN correcto, efectua a alteração e regista aprovação e acção no histórico de auditoria.
4. Um supervisor pode modificar outros dados permitidos do produto sem pedir autorização de preço.
5. Operador de caixa e responsável de stock não abrem o editor de produto.

## Identificação no histórico
As novas vendas recebem `operatorId`. As novas sessões de caixa também recebem `operatorId`. Devoluções aprovadas recebem o operador e, quando aplicável, `approvedBy`. O histórico de auditoria inclui o operador associado a actos do ecrã principal e eventos de gestão de equipa.

Históricos antigos **não ganham autores inventados**. A identificação poderá servir de base a relatórios por operador e por turno, após integrar autenticação real.

## Limitações e segurança
- **O PIN nesta demonstração NÃO é uma credencial segura em produção.** Ainda que derivado criptograficamente, os hashes e toda a informação de operadores estão no mesmo armazenamento local que o próprio POS e podem ser alterados.
- O gerente bootstrap sem PIN foi mantido intencionalmente para retrocompatibilidade. Deve ser substituído por onboarding com credenciais de servidor antes de vender o sistema.
- Não existe bloqueio por tentativas de PIN, MFA, recuperação segura de contas, federação de identidade, acções administrativas autenticadas no backend, nem suspensão automática por inactividade.
- A alteração do papel de um utilizador noutra aba não produz uma autorização garantida em tempo real; o armazenamento do protótipo continua específico de cada dispositivo.
- Os módulos de Super Admin e Empresa que usam outras rotas são demonstrações independentes e precisam de integração futura à mesma base de autenticação.
- Os dados de clientes e custos continuam carregados no browser. Ocultar os ecrãs de relatório **não impede** que o operador inspeccione a memória local.
- O PIN é usado para demonstrações com dados fictícios. Não introduza PINs reais de trabalhadores enquanto não houver protecção do servidor.

## Próximos passos recomendados — Supabase (só após aprovação do frontend)
1. Modelar `tenants`, `branches`, `operators`, `memberships`, `role_permissions`, `sessions`, `approval_requests` e `audit_events`.
2. Implementar autenticação por identidade única; PIN pode actuar como desbloqueio de estação gerida e nunca como a única fonte de verdade de um utilizador de empresa.
3. RLS por `tenant_id`, `branch_id`, perfil, estado de empregado e identidade confirmada.
4. Validar cada venda, preço, inventário, devolução e reembolso com função transaccional no servidor.
5. Aprovações assinadas/validadas pela sessão do gerente, com validade curta, escopo e IDs de transacção definidos.
6. Auditoria no servidor que não possa ser alterada pelo operador local e protecção contra alteração de preços em fluxos especializados.
7. Testes com utilizadores reais, scanners USB, impressoras, internet intermitente e política de protecção de dados pessoais.

## Testes do frontend
- Matriz de permissões, acesso por secção e acção.
- Migração não destrutiva de versões anteriores.
- PIN numérico (tamanho, sal, hash, verificação), sessão activa e logout.
- Gerente único protegido contra desactivação acidental.
- Menus por caixa e stock e formulário de edição conforme papel.
- Fluxo de aprovação com PIN para devoluções e alterações de preços.
- Regressões de vendas, caixa, stock, fiado, relatórios, scanner, offline e comprovativos.

**Conclusão:** gestão de operadores e permissões demonstrativas no frontend, com Supabase inalterado. A aplicação continua imprópria para guardar credenciais reais ou autorizar operações financeiras de empresas sem validação server-side.
