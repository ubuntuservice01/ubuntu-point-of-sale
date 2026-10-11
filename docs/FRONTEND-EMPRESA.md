# Ubuntu POS 360 — Administração empresarial (Frontend antes do Supabase)

## Objectivo
Construir o painel de gestão que cada empresa contratante utilizará, preservando a separação visual do Super Admin da Ubuntu Service.

## Endereço e navegação
- `/` — Ponto de venda e painel comercial demonstrativos.
- `/super-admin` — Super Admin demonstrativo, que regista organizações e planos.
- `/empresa` — Administração de empresa (abre o primeiro tenant de exemplo).
- `/empresa?tenant=<ID>` — Escolhe a empresa da demonstração por identificador. **Este endereço não autentica nem isola dados.**

Existe um botão «Painel da empresa» na ficha de empresa do Super Admin; no painel empresarial, pode-se alternar entre empresas de exemplo. A alternância é apenas uma ajuda de prototipagem; **não é uma funcionalidade a manter sem autenticação no lançamento**.

## Ecrãs implementados

| Área | Funções demonstrativas |
| --- | --- |
| Visão geral | Filiais activas, funcionários, perfis, actividade, plano e atalhos |
| Filiais | Registar, editar, pesquisar, desactivar e reactivar estabelecimentos |
| Funcionários | Registar, editar, atribuir perfil e filiais, pesquisar, desactivar e reactivar |
| Perfis e permissões | Perfis base e personalizados, atribuição de permissões simuladas |
| Dados da empresa | Designação social, NUIT, nome comercial, contactos, morada, rodapé de recibo |
| Configurações | Stock baixo, desconto máximo, fiado, aprovação de devoluções e formato do recibo |
| Histórico | Registos de alterações locais por empresa |

## Regras que já podem ser verificadas no frontend

- Não exceder o número de filiais e de utilizadores previsto no plano demonstrativo.
- Não repetir códigos de filiais ou e-mails de funcionários da empresa.
- Não desactivar o último administrador activo da empresa.
- Não desactivar a última filial activa ou deixar funcionários sem outra filial activa atribuída.
- Não retirar todas as permissões de um perfil personalizado.
- Os perfis base são protegidos de edição na demonstração.
- Validar NUIT, percentagem de desconto, valor mínimo de stock e campos obrigatórios.
- O histórico regista operações locais, sem fingir autenticação ou auditoria inviolável.

## Modelo pré-Supabase
`src/lib/company-demo.ts` define:
- `CompanyWorkspace`: espaço de dados de demonstração de cada empresa;
- `Branch`: estrutura de estabelecimento/filial;
- `Employee`: funcionário com perfil e filiais;
- `Role`: conjunto de permissões;
- `Profile`: dados institucionais;
- `Options`: parâmetros comerciais;
- `CompanyEvent`: registo de alteração.

Os dados locais são separados por chave `ubuntu-pos360-company-demo-v1-<tenantId>`. Esta separação **não oferece segurança**: os dados estão no mesmo navegador e não existem controlos de acesso.

## Requisitos obrigatórios para integrar o Supabase

1. Autenticação de utilizadores e gestão de sessões, emitidas e verificadas pelo servidor.
2. Tabelas de tenants, filiais, utilizadores, memberships, perfis, permissões e auditoria.
3. Políticas RLS que garantam acesso apenas aos dados do tenant e das filiais autorizadas.
4. Perfis de Super Admin e de administrador empresarial protegidos por verificações no backend.
5. Fluxo de convite de funcionário e credenciais seguras; nunca enviar palavras-passe em texto simples.
6. Validação transaccional dos limites dos planos no backend.
7. Guardar o histórico de auditoria em ambiente controlado, sem alterações livres pelo cliente.
8. Testes negativos de acesso entre empresas, filiais e perfis.

**Não colocar dados pessoais ou comerciais reais na demonstração.**
