# Links públicos de propostas

Abra a proposta e clique em **Compartilhar** ou **Link público**. O QR Code e os botões de copiar, abrir e baixar só ficam disponíveis depois da publicação. A plataforma salva uma cópia do documento no Supabase antes de exibir o endereço. Copie o link ou abra-o em outra janela. O cliente não precisa entrar na plataforma nem ter os dados no armazenamento local.

A cópia inclui os dados do cliente e da empresa, dimensionamento, equipamentos, condições comerciais, manutenção, gráfico de payback e personalização do PDF. Não inclui os custos internos ou margens. Alterações posteriores exigem um novo link. Os links expiram em 90 dias; o botão **Desativar todos os links desta proposta** também permite revogá-los. A exclusão da proposta solicita a remoção das cópias públicas associadas.

Os novos endereços usam `?proposta=<identificador aleatório de 256 bits>`. Endereços antigos com apenas o código (`?proposta=PROP-2026-128`) não permitem recuperar uma proposta local em outro navegador. Abra a proposta original para gerar um novo link.

O compartilhamento no editor de PDF usa a capa selecionada e uma proposta real. Quando há várias propostas, escolha qual deseja compartilhar. Nenhuma proposta de exemplo é criada.

O cliente pode aceitar ou recusar pelo link. A resposta fica no servidor; o aceite exige nome e concordância explícita. Uma resposta final não pode ser trocada pelo mesmo link. A integradora recebe o status e as notificações ao abrir a plataforma, retornar à janela ou na atualização periódica de 30 segundos.

## Publicação

- Aplique a migrations `public_proposal_documents` e `public_proposal_responses` e publique a Edge Function `public-proposal` com `verify_jwt = false`. A função aceita leitura e resposta públicas, valida o token e verifica a expiração. Somente a função pode registrar visualização e resposta; o proprietário não pode inserir respostas pré-fabricadas. A chave administrativa permanece somente no ambiente da função.
- A tabela não concede acesso ao papel `anon`. As políticas RLS permitem que o usuário autenticado insira, consulte e exclua somente suas próprias cópias. O token bruto não é salvo no banco, apenas seu hash SHA-256.
- `VITE_PUBLIC_APP_URL` define o endereço do aplicativo publicado, incluindo o subdiretório quando necessário. O padrão é `https://lealt97.github.io/sol-amigo-pro/`. Evite domínios de prévia do AI Studio, que podem exigir cookies ou acesso à prévia.
- A versão publicada precisa conter a rota pública do frontend. Atualizar o GitHub não atualiza automaticamente uma prévia aberta no AI Studio.

## Validação

`npm run lint`, `npm test`, `npm run check:crm` e `npm run build`.

Verificados também: leitura real da Edge Function sem login; RLS entre usuários; expiração; criação/cópia/revogação do link no navegador; capa SVG, sete páginas internas, impressão A4 e mensagens de links antigos/indisponíveis. Os registros de teste são removidos depois da validação.
