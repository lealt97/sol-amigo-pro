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

Em **Personalização da proposta PDF → Páginas internas**, configure três páginas: resumo comercial com cliente e emitente, materiais/serviços e investimento/contratação. As 12 capas SVG existentes continuam disponíveis.

O resumo mostra potência, consumo, geração, área, economia mensal/anual e payback simples. Sistemas híbridos incluem banco de baterias e autonomia calculada quando registrados. A proposta comercial não inclui o memorial completo, cargas ou projeções de longo prazo. Listagens de materiais extensas recebem continuação, com numeração contínua e total de páginas.

As páginas reutilizam o mapa de substituição de cores da capa, com contraste automático nos blocos preenchidos. É possível desligar o vínculo para usar uma paleta independente. Títulos, textos, imagens, dados do emitente, fonte e ordem permanecem editáveis. Valores de custos internos e margem não aparecem na proposta.

Novas propostas guardam os dados comerciais do perfil do usuário (nome, empresa, contato e CNPJ) junto ao snapshot técnico e comercial. Esses dados identificam o responsável que gerou a proposta. Os campos do customizador servem como alternativa para propostas antigas sem emitente. O CPF pessoal do usuário não é exportado.

Use **Imprimir / Salvar PDF**, sem cabeçalhos e rodapés do navegador. A prévia do customizador contém dados de exemplo identificados. Propostas reais apresentam dados ausentes como não informados.
