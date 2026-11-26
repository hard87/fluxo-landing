# Landing comercial do Fluxo

Site estático publicado em https://fluxo.officina404.com.br/, sem etapa de build.

Versão no ar: landing comercial V5, com diagnóstico de 30 dias sem custo, começando pelas farmácias de Lages e região. Os alertas são entregues no portal, no Telegram e por e-mail. O WhatsApp da página é apenas contato comercial e não funciona como canal de alerta.

## Versões anteriores e propostas

- Landing publicada antes da V5 (commit `ef6caee`, no ar de 10/10/2026 a 26/11/2026):
  - tag Git `landing-publicada-pre-v5-2026-11-26`;
  - cópia consultável, com README e manifesto SHA-256, em `D:\Officina404\_arquivo\fluxo\landing-page\2026-11-26-pre-v5`.
- Propostas V3, V4 e V5, mantidas sem alteração em `D:\Officina404\propostas_fluxo\mockups\comercial-v3`, `comercial-v4` e `comercial-v5`. O README da V5 registra a relação entre alegação, nível e evidência, com a validação dos três canais de alerta em 13/11/2026.

As cópias históricas não são publicadas em URLs públicas.

## Visualizar localmente

Na raiz do repositório:

```powershell
python -m http.server 4174
```

Abra http://127.0.0.1:4174. Os arquivos do site estão na raiz.

## Formulário e entrega

O formulário de diagnóstico está configurado em https://formspree.io/f/xppqrrej, com destinatário verificado contato@officina404.com.br no Zoho Mail. O filtro Formshield permanece ativo.

O Formspree exige Cloudflare Turnstile e valida o token no receptor. A chave pública está em turnstileSiteKey, em site-config.js; a chave secreta fica exclusivamente nas configurações de CAPTCHA do Formspree, com o provedor Turnstile. O widget autoriza fluxo.officina404.com.br, no modo Managed, sem pre-clearance. Nunca desative a validação para testar o site. Para testes locais reais, autorize localhost temporariamente e remova-o ao terminar; os testes de CI usam um provedor simulado, sem enviar pedidos reais.

Validação controlada em 10/10/2026: ausência de token retornou HTTP 400; token inválido retornou HTTP 200 com ok: true, mas foi filtrado como Spam no painel. O envio com token real e contato sintético teste@example.com também foi filtrado. O contador da conta permaneceu em 1/50 após ambos. Portanto, sucesso na API não comprova passagem pelo filtro nem entrega no Zoho. A entrega após ativar Turnstile ainda precisa de um teste com contato real. A entrega anterior à ativação foi confirmada no Zoho.

Sem token, com token expirado ou com falha de carregamento, o navegador oferece a alternativa por e-mail. Cada tentativa de envio reinicia a verificação, pois o token é de uso único. Essa proteção reduz abuso, mas não garante que toda mensagem seja um lead legítimo nem substitui os limites do serviço.

Para manutenção ou substituição:

1. Crie um formulário no Formspree para o destinatário desejado e verifique o endereço.
2. Mantenha a proteção contra spam oferecida pelo serviço e confira a compatibilidade da configuração com envios AJAX. Se houver restrição por domínio disponível, limite-a a fluxo.officina404.com.br.
3. Coloque a URL pública https://formspree.io/f/ID em formEndpoint, no arquivo site-config.js. Nunca coloque senhas, tokens de API ou credenciais do Zoho no site.
4. Envie um pedido controlado depois da ativação e confirme tanto a entrada no painel do Formspree quanto a entrega no Zoho. Verifique limites do plano e a pasta de spam.

Sem endpoint, o formulário identifica claramente que apenas prepara um e-mail. Com endpoint, só confirma recebimento após uma resposta JSON com ok: true. O campo de contato rejeita o próprio endereço destinatário, ignorando maiúsculas e espaços nas pontas. Essa regra opera no navegador; não substitui validação no receptor ou proteção contra chamadas diretas ao endpoint. Outros endereços do domínio continuam permitidos. Falhas preservam os dados e oferecem e-mail preenchido como alternativa. O teste automatizado intercepta requisições e não envia e-mails reais.

## Medição

A medição está ativa com Umami Cloud. A configuração pública está em analytics, no arquivo site-config.js. O site respeita Do Not Track e não envia conteúdo dos campos do formulário. Para desativar, defina analytics como null. Ao trocar de fornecedor, atualize também a política de privacidade.

Eventos do formulário: form_view, form_submit, form_error, lead_received, email_prepared e email_alternative. Somente lead_received representa a confirmação do receptor; não comprova entrega na caixa do Zoho. Eventos de navegação: cta_click (propriedade origem), whatsapp_click, whatsapp_gerador, perfil_selecionado, tela_aba, tela_zoom, cena_sabado_vista e cena_sabado_replay. Nenhum evento recebe nome, contato ou mensagem. O pedido enviado ao Formspree leva interesse=diagnostico-30-dias e origem=landing-v5.

## Configuração da página

Em site-config.js ficam, além de formulário, Turnstile e Umami:

- whatsapp: número e mensagem padrão do contato comercial, (49) 98807-9237;
- email: contato@officina404.com.br, também usado para rejeitar o próprio endereço no campo de contato;
- city: cidade usada no gerador de mensagem;
- diagnosticSlots: quantidade de vagas do ciclo. Use um número inteiro somente quando a quantidade estiver confirmada. Com null, a página mostra um convite neutro, sem número. Com 0, mostra lista de espera.

## Testes e CI

```sh
npm ci
npx playwright install chromium
npm test
```

O smoke test roda em 1440, 1280, 768, 390 e 320 px. Ele cobre ausência de rolagem horizontal, menu, âncoras, cena do sábado, prefers-reduced-motion, seletor de perfis e hub, abas por teclado, zoom em dialog, FAQ, gerador de mensagem e WhatsApp. Também cobre metadados de busca e compartilhamento, estados de produto, validação de contato, envio confirmado, erros, preservação dos dados, alternativa por e-mail, analytics e Do Not Track, política de privacidade e 404. GitHub Actions executa os testes a cada push e pull request.

Se o download do Chromium do Playwright estiver bloqueado, rode com o Chrome instalado: `PLAYWRIGHT_CHANNEL=chrome npm test`.

## Publicação

Publique os arquivos estáticos da raiz, incluindo assets/ (imagens, ícones e fontes com licença), site-config.js, og-image.jpg, ícones da raiz, privacidade.html, 404.html, robots.txt, sitemap.xml e CNAME. Não publique node_modules/ ou resultados de teste. Atualize lastmod no sitemap apenas quando o conteúdo mudar significativamente.

## Conteúdo e direitos

A landing mostra a interface real com dados demonstrativos, a cena do sábado e a curva do topo como ilustrações rotuladas e o R1 como placa em bancada. Cada recurso aparece como Disponível, No piloto ou Próxima etapa. Não inventa resultados de clientes nem preços. O diário técnico em https://officina404.com.br/projetos/fluxo.html preserva evidências do desenvolvimento.

Pendências de conteúdo: razão social e CNPJ ainda não foram confirmados, por isso não aparecem na página. A quantidade de vagas do ciclo também não está confirmada, e diagnosticSlots fica em null até essa confirmação.

IBM Plex Sans e IBM Plex Mono são hospedadas localmente, com a licença OFL em assets/fonts/. O restante do projeto preserva todos os direitos reservados, conforme LICENSE.
