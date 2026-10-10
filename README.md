# Landing comercial do Fluxo

Site estático publicado em https://fluxo.officina404.com.br/, sem etapa de build.

## Visualizar localmente

Na raiz do repositório:

```powershell
python -m http.server 4174
```

Abra http://127.0.0.1:4174. Os arquivos do site estão na raiz.

## Formulário e entrega

O formulário Piloto Fluxo está configurado em https://formspree.io/f/xppqrrej, com destinatário verificado contato@officina404.com.br no Zoho Mail. O filtro Formshield permanece ativo.

Para manutenção ou substituição:

1. Crie um formulário no Formspree para o destinatário desejado e verifique o endereço.
2. Mantenha a proteção contra spam oferecida pelo serviço e confira a compatibilidade da configuração com envios AJAX. Se houver restrição por domínio disponível, limite-a a fluxo.officina404.com.br.
3. Coloque a URL pública https://formspree.io/f/ID em formEndpoint, no arquivo site-config.js. Nunca coloque senhas, tokens de API ou credenciais do Zoho no site.
4. Envie um pedido controlado depois da ativação e confirme tanto a entrada no painel do Formspree quanto a entrega no Zoho. Verifique limites do plano e a pasta de spam.

Sem endpoint, o formulário identifica claramente que apenas prepara um e-mail. Com endpoint, só confirma recebimento após uma resposta JSON com ok: true. Falhas preservam os dados e oferecem e-mail preenchido como alternativa. O teste automatizado intercepta requisições e não envia e-mails reais.

## Medição

A medição externa está desativada até haver uma instância Umami configurada. Para ativar, preencha analytics com scriptUrl e websiteId em site-config.js e atualize privacidade.html com o fornecedor, tratamento e retenção reais antes de publicar. Use uma configuração sem cookies de publicidade e respeite Do Not Track.

Eventos: cta_click, form_view, form_submit, form_error, lead_received, email_prepared e email_alternative. Somente lead_received representa a confirmação do receptor; não comprova entrega na caixa do Zoho. Nenhum evento recebe nome, contato ou mensagem. A propriedade interest distingue piloto de ficha-r1.

## Testes e CI

```sh
npm ci
npx playwright install chromium
npm test
```

O smoke test cobre navegação responsiva, abas por teclado, validação de contato, envio confirmado, erros, preservação dos dados, alternativa por e-mail e interesse na ficha do R1. GitHub Actions executa os testes a cada push e pull request.

## Publicação

Publique os arquivos estáticos da raiz, incluindo fonts/, img/, site-config.js, ícones, privacidade.html e 404.html. Não publique node_modules/ ou resultados de teste. Atualize lastmod no sitemap apenas quando o conteúdo mudar significativamente.

## Conteúdo e direitos

A landing mostra a interface real com dados demonstrativos e o R1 como protótipo e conceito de gabinete. Não inventa resultados de clientes nem preços. O diário técnico em https://officina404.com.br/projetos/fluxo.html preserva evidências do desenvolvimento.

DM Sans e JetBrains Mono são hospedadas localmente com suas licenças OFL em fonts/. O restante do projeto preserva todos os direitos reservados, conforme LICENSE.
