# Auditoria e execução da refatoração — Sol Amigo Pro

Base: `ccd78721d3d1e38d51e7de854b70352555f88992`. Leitura do código e consulta do schema real em 14/10/2026. Não foram lidos dados comerciais dos clientes para elaborar este diagnóstico.

## Evidências e prioridades

| Prioridade | Evidência | Consequência | Tratamento |
|---|---|---|---|
| P0 | Clientes, propostas, catálogo, notas e notificações usavam chaves globais do navegador | Troca de conta podia mostrar cache da conta anterior; registros locais não apareciam em outro dispositivo | Workspace por proprietário, hidratação antes das telas e revisões otimistas |
| P0 | `calendar_events` não existe em produção, embora haja migration no repositório | Agenda retornava sucesso após falha e mantinha somente dados locais | Persistência da agenda pelo workspace; confirmação aguardada |
| P0 | `isDemoProposal` classificava por nomes reais e códigos | Registros reais podiam ser filtrados e sobrescritos | Só um marcador explícito de demonstração permite esse filtro |
| P0 | `proposals` em produção possui apenas identificadores, status e tipo | Dimensionamento, equipamentos e documento completo não eram persistidos nessa tabela | Documento integral preservado no workspace, sem alterar registros legados |
| P1 | Propostas rápidas inventavam valores, potência e marcas; conversores repetidos | PDF podia apresentar dados não preenchidos pelo usuário | Valores ausentes não viram exemplos; conversão e montagem centralizadas |
| P1 | Callback assíncrono do wizard não era aguardado | Modal fechava e anunciava sucesso antes de salvar | Geração aguarda persistência e mantém tela em falha |
| P1 | Caminhos lead/cliente criavam outro código e perdiam bateria/manutenção | Listagem, snapshot e aceite divergiam | Identidade e dados da proposta preservados |
| P1 | MFA retornava sucesso quando consulta de fatores falhava | Interface podia avançar sem concluir verificação | Falha fecha o acesso; recuperação ganhou formulário próprio |
| P2 | Anotações ~2.536 linhas, wizard ~1.961, editor de PDF ~1.382 | Alterações difíceis de revisar | Extração inicial de domínio e infraestrutura; decomposição visual adicional permanece incremental |
| P2 | Financeiro/contratos não estão nas rotas ativas e botões simulavam ações | Aparência não corresponde a funcionalidade | Ações demonstrativas desabilitadas; não anunciadas como módulos comerciais prontos |
| P2 | Testes de calendário/dashboard dependiam implicitamente do fuso do runner | Seis falhas em Pacific/Auckland | Fixtures de horário local e testes em três fusos |

## O que está funcional e deve ser preservado

- Login, cadastro, MFA, perfil, captação pública e upload de fatura possuem implementação; não são substituídos.
- CRM usa tabelas reais `leads`, `clients`, `lead_tasks`, `lead_documents` e `lead_activities`, com RLS por proprietário. Campos complementares e registros manuais agora têm persistência de workspace.
- Dimensionamento on-grid e backup híbrido possuem funções e testes existentes. A existência de “Off-Grid” em um tipo não comprova um fluxo completo; não foi anunciado um novo dimensionador off-grid nesta entrega.
- Precificação, manutenção, agenda, dashboard, catálogo, editor das 12 capas e PDF possuem implementação. O motor técnico e a identidade visual foram preservados.
- Propostas públicas já usam snapshot e token imprevisível, expiração e resposta pelo servidor. Foram mantidos.
- Empresa é atualmente uma conta proprietária. Não existe equipe com convites e papéis compartilhados; não conceder acesso de terceiros pelo campo editável `user_metadata`.

## Limites desta arquitetura

`workspace_documents` mantém coleções e documentos versionados por conta, reutilizando IDs e contratos atuais. É uma ponte de persistência, não uma alegação de que todas as entidades já foram normalizadas em novas tabelas. As tabelas relacionais de CRM existentes continuam operando.

O controle de revisão impede sobrescrita silenciosa. Um conflito requer exportar alterações locais e recarregar dados do servidor. Não há merge automático de registros concorrentes. Cada documento tem limite de 12 MiB; anexos grandes devem continuar em Storage. A migração não remove nenhuma chave antiga e não cria vínculo de propriedade sem confirmação do usuário.

A leitura inicial exige conexão com o servidor. Depois de carregada a conta, alterações pendentes são protegidas por cache separado e podem ser exportadas. Não foi anunciado um modo offline completo.

## Pendências externas e evoluções separadas

- Escolher/validar o provedor de cobrança, fornecer credenciais de teste e conectar webhooks oficiais. A base de autorização não deve ser ativada antes de testes ponta a ponta. Nenhum pagamento foi criado.
- Conectar Cloudflare e domínio escolhido; atualizar URLs do Auth e dos links públicos. A configuração de build foi preparada, sem criar conta ou contratar hospedagem.
- Equipes, papéis, convites e migração de proprietário para organização exigem um fluxo próprio. O isolamento implementado é por proprietário autenticado.
- Fluxo completo off-grid e validação elétrica completa permanecem separados; a comparação pontual de fórmulas das planilhas está documentada abaixo.
- ERP financeiro, contratos com provedor de assinatura e monitoramento de usinas não foram implementados nem anunciados como disponíveis.
- Decomposição adicional das telas extensas deve acompanhar mudanças funcionais e testes; não reescrever todo o layout em uma única alteração.

## Segurança do banco

A nova tabela de workspace tem RLS e não concede acesso anônimo. A coluna de revisão é validada no servidor. Teste transacional real confirmou leitura própria, negação entre proprietários, negação de proprietário forjado e rejeição de salto de revisão; a transação foi revertida.

Na primeira entrega, os advisors mantiveram os dois avisos preexistentes: função `delete_owned_lead` com SECURITY DEFINER (corpo verificado: exige usuário e limita por proprietário) e proteção contra senhas vazadas desativada. Não foi removida a função de exclusão, pois isso alteraria uma regra existente sem necessidade.

Após a aplicação da estrutura de assinaturas em 15/10/2026, o advisor também informa `billing_events` sem políticas. Isso é intencional: a tabela não concede acesso a clientes e é exclusiva do serviço. A cobrança continua desativada.

## Melhorias operacionais de 16/10/2026

A exportação de documentos do workspace também fica disponível quando os dados estão sincronizados. O diagnóstico técnico exportável mantém até 50 eventos em memória, sem conteúdo de clientes, URLs ou mensagens de erro. Não substitui monitoramento remoto ou backup integral. As dependências e evoluções estão discriminadas em [PENDENCIAS.md](PENDENCIAS.md).

## Comparação pontual com as planilhas fornecidas

Foram lidas as fórmulas e os valores salvos dos dois XLSX, sem modificar os arquivos. Não foi executado recálculo no Excel.

Na `Planilha de Dimensionamento.xlsx`, aba Análise Técnica, C3=1.016,6667 kWh/mês, C5=50 kWh, C9=5,3200583 HSP corrigida, C14=21,388% de perdas e C19=320 W. A fórmula C16 multiplica a potência teórica por `(1 + perdas)`. O motor existente usa a eficiência `1 - perdas` no denominador. Esses métodos não são equivalentes: a comparação independente resulta em aproximadamente 7,7046 kWp, 25 módulos e 8 kWp instalados, contra 24 módulos na planilha após o ajuste manual C21=1. O teste registra o método do motor e verifica que a geração cobre a meta; não copia silenciosamente a aproximação da planilha.

A planilha de curso também explicita geração como `módulos × potência × 30 × HSP × 0,8 / 1000` (Plan1!J9). Isso é compatível com a geração mensal do motor quando as mesmas hipóteses são usadas. A definição do consumo compensável é distinta: o motor separa o custo de disponibilidade. Estas duas comparações não constituem validação elétrica completa nem homologação do dimensionamento off-grid.

## Validação executada

- TypeScript, testes de domínio, integridade CRM e build de produção.
- Testes de calendário/dashboard em UTC, America/Sao_Paulo e Pacific/Auckland.
- PostgreSQL isolado (PGlite): migrations, RLS entre proprietários, tentativa de assinatura forjada, revisão inválida, restrição por vencimento, duplicidade e ordem dos eventos, cancelamento com período pago, reembolso e proteção do RPC de exclusão.
- Navegador com autenticação e transporte simulados: importação com seleção e confirmação, download do backup, preservação dos originais, outro dispositivo, outra conta, conflito, falha de rede/retry e agenda persistida.
- Rota pública anônima com resposta de documento simulada: sem requisições de conta, capa, sete páginas internas, payback, PDF A4 de oito páginas e viewport de 390 px. A refatoração não alterou o serviço público de aceite/recusa previamente validado em produção.
- Separadamente, transação real do workspace executada no Supabase e revertida, sem conservar registros de teste.

Os testes simulados de navegador não substituem uma compra real em ambiente de teste do provedor, nem afirmam que pagamentos ou hospedagem comercial foram ativados.
