# Sol Amigo PRO

CRM solar publicado no GitHub Pages e conectado ao Supabase.

## Formulário integrado ao site

Cada conta possui um identificador público próprio. Em **Configurações → Formulário no site**, o usuário:

1. autoriza até dez origens HTTPS;
2. seleciona os estados em que atende novos clientes;
3. escolhe o modo embutido ou botão flutuante;
4. personaliza marca, cores, textos e política de privacidade;
5. opcionalmente aplica CSS avançado restrito às classes públicas do formulário;
6. ativa a integração e copia o código gerado;
7. testa a conexão antes de instalar no site.

O arquivo `public/widget.js` cria um iframe isolado. O formulário envia seus dados ao script da página com `postMessage`; o script faz a requisição a partir da origem real do site. A função `capture-lead` compara essa origem com a lista autorizada antes de criar o lead.

### Proteções

- integração desligada por padrão;
- isolamento por conta com RLS;
- origem HTTPS autorizada no servidor;
- área de atendimento validada no formulário e novamente no servidor;
- CSS personalizado isolado no iframe, limitado a 20 KB e sem recursos externos ou propriedades de ocultação;
- identificador público renovável, sem chave administrativa no navegador;
- limite de oito tentativas por IP anonimizado a cada dez minutos;
- limite de 120 tentativas por formulário a cada hora;
- campo-isca, validação no servidor e deduplicação por 30 dias;
- contadores de abuso mantidos no esquema privado, sem IP bruto.

O identificador do formulário não é uma senha. Ele apenas informa para qual conta o lead deve ser encaminhado; a autorização é decidida no servidor.

## Desenvolvimento

```bash
npm install
npm run lint
npm run build
```

Configure `VITE_PUBLIC_APP_URL` com a URL pública terminada em `/`. O valor usado no GitHub Pages é `https://lealt97.github.io/sol-amigo-pro/`.

## Proposta editorial e páginas internas

Em **Personalização da proposta PDF → Páginas internas**, configure as cinco
páginas internas de `Modelo_Proposta_Sol_Amigo_Pro`: projeto e dimensionamento,
kit e manutenção, análise financeira, condições e aceite. A capa continua usando uma das 12 bases SVG
existentes; nenhum arquivo de capa foi substituído.

É possível editar títulos, introduções, textos, imagens, cores, fonte, rodapé,
dados da empresa, validade padrão, ordem e inclusão das seções. Os dados de
consumo, equipamentos, dimensionamento e preço são editados no assistente da
proposta e alimentam automaticamente as tabelas e gráficos. A prévia do
customizador usa dados de exemplo identificados como tal.

Novas propostas guardam um snapshot completo no armazenamento já utilizado
pela aplicação. Ao reabrir, esse snapshot conserva os dados técnicos e
comerciais originais. Propostas antigas sem snapshot exibem os campos ausentes
como não informados, sem acrescentar payback ou equipamentos demonstrativos.
Esta alteração não adiciona sincronização remota dos snapshots.

A visualização imprime em A4 com **Imprimir / Salvar PDF**. Escolha **Salvar
como PDF** no navegador, sem cabeçalhos/rodapés do navegador. Tabelas longas de
equipamentos, dados técnicos e cargas criam folhas de continuação. A projeção
financeira apresenta a economia acumulada em oito anos e a referência do investimento; é linear e identifica suas limitações; ela não substitui um cálculo
de fluxo descontado, VPL ou TIR.
