# Sol Amigo PRO

CRM solar publicado no GitHub Pages e conectado ao Supabase.

## Formulário integrado ao site

Cada conta possui um identificador público próprio. Em **Configurações → Formulário no site**, o usuário:

1. autoriza até dez origens HTTPS;
2. escolhe o modo embutido ou botão flutuante;
3. personaliza marca, cores, textos e política de privacidade;
4. ativa a integração e copia o código gerado;
5. testa a conexão antes de instalar no site.

O arquivo `public/widget.js` cria um iframe isolado. O formulário envia seus dados ao script da página com `postMessage`; o script faz a requisição a partir da origem real do site. A função `capture-lead` compara essa origem com a lista autorizada antes de criar o lead.

### Proteções

- integração desligada por padrão;
- isolamento por conta com RLS;
- origem HTTPS autorizada no servidor;
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
