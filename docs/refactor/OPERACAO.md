# Operação, migração e rollback

## Instalação e validação

Use Node 20 ou superior e `npm ci`. Execute `npm run typecheck`, `npm test`, `npm run test:db`, `npm run test:timezones`, `npm run check:crm` e `npm run build`.

O comando `lint` continua sendo uma verificação TypeScript, compatível com os workflows existentes; não representa uma análise ESLint. PGlite é dependência somente de desenvolvimento e executa testes de permissões e migrations em PostgreSQL isolado, sem credenciais de produção.

## Persistência e importação

1. A migration `20261014234308_workspace_document_persistence.sql` foi aplicada no projeto existente e verificada com transação revertida.
2. Ao entrar, o aplicativo consulta o usuário e carrega `workspace_documents` antes de renderizar módulos privados. Um erro de carregamento não abre uma conta vazia.
3. Dados locais antigos não são associados automaticamente. Use “Revisar dados antigos deste navegador”, selecione os conjuntos e confirme a propriedade.
4. O aplicativo solicita o download de uma cópia antes da importação. Os originais continuam nas chaves antigas. Conjuntos com registros já presentes na conta não são substituídos; caches vazios podem receber a importação.
5. Depois de confirmar persistência, a página recarrega com os dados da conta. A leitura em outro navegador usa os mesmos documentos do servidor.
6. Alterações aguardando sincronização aparecem na faixa de estado. Em falha de rede, mantenha a janela e use “Exportar cópia” ou “Tentar salvar”.
7. Em conflito entre dispositivos, exporte a versão local e recarregue a do servidor. Uma cópia adicional fica em `solamigo.conflict-backup:<proprietário>:<timestamp>`. Nenhuma revisão mais recente é substituída automaticamente.

O cache `solamigo.workspace.v1:<proprietário>` protege a fila pendente. Não limpe o armazenamento do navegador antes de exportar alterações não sincronizadas. A troca de conta não disponibiliza o cache de outra conta na interface.

## Assinaturas — preparado, ainda não ativado

A migration `20261014235908_account_subscription_access.sql` está versionada, mas NÃO foi aplicada em produção: o conector retornou `Invalid or expired requestState` em duas tentativas. A sintaxe e as regras foram testadas em banco local isolado com `npm run test:db`.

Ela mantém `billing_enforced=false` por padrão, cria assinaturas com leitura apenas pelo proprietário e gravação somente por serviço confiável. O RPC `apply_billing_event` é reservado a `service_role`; valida eventos e ignora duplicados e antigos. Não recebe decisões de pagamento do navegador.

Antes de ativar cobrança:
- Escolha o provedor e valide se ele aceita o produto; não há confirmação de aceitação pela Kiwify.
- Implemente o adaptador usando autenticação oficial dos webhooks e consulta de reconciliação ao provedor.
- Configure credenciais somente no servidor, em ambiente de teste.
- Teste contratação, renovação, cancelamento com período pago, inadimplência, tolerância, reembolso, contestação e eventos duplicados/fora de ordem.
- Aplique a migration, verifique RLS/advisors e faça um piloto com contas de teste.
- Só então habilite a flag pelo servidor. Não use `user_metadata`, parâmetros de URL ou redirecionamento do checkout para liberar acesso.

Assinatura vencida deve preservar leitura e exportação; cancelamento de renovação preserva um período ainda pago. Reembolso e contestação suspendem gravação. Nenhuma dessas operações apaga documentos.

## Publicação comercial

`wrangler.toml` e `.env.example` preparam Cloudflare Pages. Configure build `npm run build`, saída `dist`, `VITE_BASE_PATH=/` e a URL final em `VITE_PUBLIC_APP_URL`. Não reutilize `/sol-amigo-pro/` em um domínio servido na raiz.

Não altere a URL dos links existentes sem planejar sua continuidade. Configure o novo domínio nas URLs permitidas do Supabase Auth, incluindo recuperação de senha. Teste acesso direto ao link público e carregamento de capas antes de divulgar.

A criação da conta Cloudflare, vínculo do repositório, domínio e configuração de DNS dependem dos acessos do proprietário. Esta refatoração não contratou serviços nem alterou DNS. GitHub Pages permanece como ambiente existente até a migração; não deve ser a hospedagem da operação SaaS comercial.

## Observabilidade e backups

`solamigo:error` emite operação, nome e código de erro saneados, sem mensagem, stack, token ou conteúdo de cliente. É um ponto de integração, não um serviço externo de monitoramento já contratado. Conecte um coletor autorizado e configure alertas de falha de sincronização e cobrança.

Faça backup gerenciado do banco e Storage e teste restauração em projeto separado antes de migrations destrutivas. A exportação JSON do workspace complementa, mas não substitui, backups de todos os registros relacionais e arquivos.

## Rollback

- Reverta o frontend para o commit anterior em caso de regressão visual; preserve os documentos e as chaves antigas.
- Não exclua `workspace_documents`: ele pode conter dados criados após a migração. Exporte antes de qualquer tentativa de restauração.
- Uma versão anterior do frontend não lê automaticamente dados novos do workspace. A recuperação desses dados deve ser planejada, não feita apagando a tabela.
- A futura cobrança pode ser desabilitada pela flag administrativa sem apagar assinaturas ou eventos. Não conceda essa atualização ao cliente autenticado.
