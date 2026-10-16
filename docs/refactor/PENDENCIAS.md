# Próximos passos — Sol Amigo Pro

Atualizado em 16/10/2026. A refatoração principal está mesclada. Isso não significa que toda a operação comercial ou todos os módulos planejados estão concluídos.

## Entregue e disponível

- Persistência do workspace por conta, confirmação de gravação e proteção contra sobrescrita entre dispositivos.
- Importação explícita dos dados antigos com cópia de segurança e confirmação de propriedade.
- Regras de proposta, precificação e documento centralizadas; validação de dados essenciais antes de publicar.
- Carregamento gradual das telas, recuperação de senha e tratamento de erros de renderização.
- Estrutura de assinaturas aplicada no banco, com cobrança desativada e eventos restritos ao servidor.
- Exportação dos documentos do workspace disponível também quando não há alterações pendentes.
- Diagnóstico técnico exportável na faixa de sincronização e nas telas de falha. Guarda até 50 eventos somente em memória nesta sessão: operação, nome/código de erro e horário. Não envia dados a terceiros e não inclui mensagens, URLs, pilhas de execução ou dados dos clientes.
- Testes e verificações automáticas antes das mesclas.

A exportação do workspace inclui os documentos carregados e a fila pendente. Não contém todos os registros relacionais do CRM, arquivos do Storage, credenciais nem um backup completo do Supabase. É um arquivo sensível de dados comerciais: guarde-o em local controlado. Não há restauração automática desse JSON nesta entrega.

## Pendências de acesso, configuração ou contratação

| Prioridade | Pendência | O que você precisa resolver | Trabalho posterior no projeto | Custo |
|---|---|---|---|---|
| Antes de cobrar | Provedor de pagamento | Escolher provedor, validar aceitação do SaaS, criar conta e disponibilizar acesso de teste por meio seguro | Checkout, webhook autenticado, reconciliação e testes de ciclo de assinatura; só depois ativar cobrança | Taxas e condições do provedor a confirmar |
| Antes de divulgar domínio comercial | Hospedagem e domínio | Conectar a conta de hospedagem e escolher domínio; disponibilizar acesso ao DNS | Publicar build preparado, configurar URLs do Auth e preservar links públicos antigos | Domínio e eventual plano conforme contratação; configuração não exige necessariamente plano pago |
| Antes de operação com dados reais em escala | Backup e recuperação | Conferir recursos do plano do banco, definir frequência, retenção e responsável | Criar rotina compatível com o plano e ensaiar restauração em ambiente separado, incluindo Storage | Depende da solução e do plano; ainda não definido |
| Antes de operação comercial | Entrega de e-mails | Definir remetente e serviço, fornecer acesso ao domínio e credenciais pelo ambiente seguro | Configurar autenticação do remetente e testar cadastro, confirmação e recuperação de senha | Depende de plano e volume |
| Antes de ampliar usuários | Alertas remotos de erro | Escolher destino de monitoramento e quem recebe os alertas | Conectar o ponto de diagnóstico existente, filtrar dados e testar alerta de falha | Pode haver modalidade gratuita; necessidade de contratação ainda não avaliada |
| Segurança da conta | Proteção de senhas vazadas | Conferir disponibilidade no plano e ativação no painel de autenticação | Validar comportamento com senha comprometida em conta de teste | Depende da disponibilidade no plano |
| Se houver assinatura eletrônica | Provedor de assinatura | Definir se o aceite atual é suficiente ao seu processo ou se deseja assinatura por provedor | Integração, eventos, armazenamento e rastreabilidade dos documentos | Contratação somente se essa integração for escolhida |
| Se houver monitoramento de usinas | Acesso às APIs dos fabricantes | Confirmar fabricantes, permissões de uso e contas de integração | Conectores, sincronização, limites, alertas e isolamento dos dados | Condições de cada fornecedor a confirmar |

Não coloque chaves secretas em variáveis `VITE_*`, arquivos versionados ou mensagens de suporte. As credenciais de serviço devem ficar apenas no servidor ou painel seguro do serviço.

## Evoluções de software — não são bloqueadas apenas por pagamento

| Prioridade | Evolução | O que falta para concluir |
|---|---|---|
| Alta | Recuperação completa de dados | Exportação/restauração de banco e Storage ensaiada; o JSON do workspace não substitui esse processo |
| Alta, quando houver equipe | Organizações, convites e papéis | Definir permissões e propriedade; implementar esquema, migração, RLS e testes entre organizações |
| Conforme escopo comercial | Dimensionamento off-grid completo | Definir entradas, autonomia e premissas; motor próprio e validação técnica com casos de referência |
| Contínua | Divisão das telas extensas | Extrair componentes e regras por fluxo, preservando comportamento e testes |
| Conforme crescimento | Normalização dos documentos | Migrar coleções de maior volume para tabelas próprias sem perder IDs, histórico e isolamento; hoje há limite de 12 MiB por documento |
| Conforme necessidade | Resolução de conflitos | Criar comparação e escolha por registro; atualmente a recuperação exige exportar alterações e recarregar o servidor |
| Conforme escopo comercial | Financeiro e contratos completos | Definir processos, implementar persistência e integrações; telas demonstrativas não representam ERP pronto |
| Antes de prometer operação offline | Modo offline completo | Definir dados disponíveis, validade de sessão e reconciliação; o carregamento inicial atual exige conexão |
| Antes de lançamento amplo | Piloto real | Usar contas de teste para cadastro, cliente, dimensionamento, proposta, PDF, link público, aceite e recuperação; compras só no ambiente de teste do provedor |

## Ordem sugerida

1. Confirmar os fluxos atuais com um pequeno piloto e guardar cópias dos dados.
2. Resolver domínio/hospedagem, remetente de e-mail e recuperação de backups.
3. Conectar alertas e revisar as configurações de segurança.
4. Escolher cobrança e concluir testes de contratação, renovação, cancelamento, inadimplência, reembolso e eventos duplicados/fora de ordem.
5. Ativar venda somente após validar o ciclo completo; manter os módulos ainda incompletos fora da oferta.
6. Priorizar equipe, off-grid e demais módulos conforme demanda real dos clientes.

Nenhum serviço foi contratado por esta entrega e nenhum preço de fornecedor foi presumido. Para execução técnica e rollback, consulte [OPERACAO.md](OPERACAO.md).
