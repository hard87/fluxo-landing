const { test, expect } = require('@playwright/test');
const endpoint = 'https://formspree.io/f/testfluxo';
const SITE = 'https://fluxo.officina404.com.br/';
const TITLE = 'Fluxo | Temperatura e umidade com alertas · Lages/SC';
const DESCRIPTION = 'Monitoramento de temperatura e umidade com histórico e alertas no portal, Telegram e e-mail. Diagnóstico de 30 dias sem custo em Lages e região.';

async function configure(page, enabled = true, extra = '') {
  await page.route('**/site-config.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FLUXO_CONFIG = { formEndpoint: '${enabled ? endpoint : ''}', turnstileSiteKey: 'public-test-key', email: 'contato@officina404.com.br', whatsapp: { number: '5549988079237' } ${extra} };` }));
  await page.addInitScript(() => { window.events = []; window.umami = { track: (name, props) => window.events.push({ name, props }) }; });
}
test.beforeEach(async ({ page }) => {
  await page.route('https://cloud.umami.is/script.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({ contentType: 'text/javascript', body: `window.turnstile={render:(element,options)=>{window.challengeOptions=options;options.callback('test-token');return 'test-widget';},reset:()=>{window.challengeOptions.callback('fresh-test-token');}};` }));
});
async function fill(page, contact = 'teste@example.com') {
  await page.locator('[name=nome]').fill('Pessoa de teste');
  await page.locator('[name=contato]').fill(contact);
  await page.locator('[name=cenario]').fill('Monitorar uma câmara fria');
}

test('layout sem rolagem horizontal, fontes e imagens locais, sem erros', async ({ page }) => {
  const errors = [], requests = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) failed.push(r.url()); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('h1')).toBeVisible();
  // percorre a página para carregar imagens lazy e confere a largura em todas as seções
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
  for (const image of await page.locator('main img:visible').all()) await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join())).toContain('IBM Plex Sans');
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(requests.filter(url => /fontshare|googleapis|gstatic/.test(url))).toEqual([]);
  expect(await page.content()).not.toMatch(/file:\/\/|[A-Z]:[\\/]|127\.0\.0\.1|localhost/);
});

test('menu e navegação por âncoras', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape'); await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(toggle).toBeFocused();
    await toggle.click();
  }
  await page.locator('#nav a[href="#diagnostico"]').click();
  await expect(page).toHaveURL(/#diagnostico$/);
  if (await toggle.isVisible()) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  for (const href of await page.locator('a[href^="#"]').evaluateAll(as => as.map(a => a.getAttribute('href')))) {
    expect(await page.locator(href).count(), href).toBe(1);
  }
});

test('cena do sábado mostra os três canais e permite repetir', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sabado').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-stage] .chan')).toHaveCount(3);
  await expect(page.locator('[data-stage]')).toHaveClass(/acked/, { timeout: 8000 });
  await page.locator('[data-replay]').click();
  await expect(page.locator('[data-stage]')).not.toHaveClass(/acked/);
  await expect(page.locator('[data-stage]')).toHaveClass(/acked/, { timeout: 8000 });
  await expect(page.locator('#sabado')).toContainText('demonstrativ');
});

test('prefers-reduced-motion mantém o estado final legível', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#sabado').scrollIntoViewIfNeeded();
  await page.locator('[data-replay]').click();
  await expect(page.locator('[data-stage]')).not.toHaveClass(/armed/);
  expect(await page.locator('html').evaluate(e => getComputedStyle(e).scrollBehavior)).not.toBe('smooth');
});

test('seletor de perfis por teclado sincroniza hub, gerador e formulário', async ({ page }) => {
  await configure(page);
  await page.goto('/');
  const first = page.locator('[data-profile="manipulacao"]');
  await expect(first).toHaveAttribute('aria-checked', 'true');
  await first.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-profile="drogaria"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-profile="drogaria"]')).toBeFocused();
  await expect(page.locator('[data-p="norm"]')).toContainText('RDC 44');
  await expect(page.locator('#genProfile')).toHaveValue('drogaria');
  await expect(page.locator('#formProfile')).toHaveValue('Drogaria e termolábeis');
  await expect(page.locator('.seg').first()).toContainText('insulinas');
  if (await page.locator('#hubLines').isVisible()) await expect.poll(() => page.locator('#hubLines path').count()).toBe(4);
  expect(await page.evaluate(() => window.events.some(e => e.name === 'perfil_selecionado' && e.props.perfil === 'drogaria'))).toBe(true);
});

test('abas por teclado e zoom em dialog com foco devolvido', async ({ page }) => {
  await page.goto('/');
  const firstTab = page.locator('[role=tab]').first();
  await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  await firstTab.focus(); await page.keyboard.press('ArrowRight');
  const second = page.locator('[role=tab]').nth(1);
  await expect(second).toHaveAttribute('aria-selected', 'true'); await expect(second).toBeFocused();
  await expect(page.locator('#' + await second.getAttribute('aria-controls'))).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('[role=tab]').last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  const shot = page.locator('[role=tabpanel]:visible [data-zoom]');
  await shot.click();
  await expect(page.locator('#zoom')).toBeVisible();
  await expect.poll(() => page.locator('#zoomImg').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#zoom')).toBeHidden(); await expect(shot).toBeFocused();
  await shot.click(); await page.locator('[data-zoom-close]').click();
  await expect(page.locator('#zoom')).toBeHidden();
  for (const cap of await page.locator('.shot-cap').allTextContents()) expect(cap).toContain('dados demonstrativos');
});

test('FAQ, gerador de mensagem e botões de WhatsApp', async ({ page }) => {
  await configure(page);
  await page.goto('/');
  await expect(page.locator('#faq details[open]')).toContainText('Telegram');
  const item = page.locator('#faq details').filter({ has: page.locator('summary', { hasText: 'Porta aberta' }) });
  await item.locator('summary').click(); await expect(item).toHaveAttribute('open', '');
  await item.locator('summary').press('Enter'); await expect(item).not.toHaveAttribute('open', '');
  await page.locator('#genPoint').selectOption('Ainda não sei');
  await expect(page.locator('#genText')).toHaveValue(/Lages[\s\S]*Ainda não sei qual ponto/);
  const href = decodeURIComponent(await page.locator('#genSend').getAttribute('href'));
  expect(href).toMatch(/^https:\/\/wa\.me\/5549988079237\?text=Olá! Vim pela página do Fluxo/);
  for (const a of await page.locator('[data-wa]').all()) await expect(a).toHaveAttribute('href', /^https:\/\/wa\.me\/5549988079237/);
  await expect(page.locator('.wa-float')).toHaveAttribute('aria-label', 'Falar no WhatsApp');
  await expect(page.locator('.site-footer')).toContainText('contato@officina404.com.br');
});

test('metadados de busca e compartilhamento sem duplicidade', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(TITLE);
  const one = async (sel, value) => {
    await expect(page.locator(sel)).toHaveCount(1);
    await expect(page.locator(sel)).toHaveAttribute(sel.startsWith('link') ? 'href' : 'content', value);
  };
  await one('meta[name=description]', DESCRIPTION);
  await one('meta[name=robots]', 'index, follow');
  await one('link[rel=canonical]', SITE);
  await one('meta[property="og:title"]', TITLE);
  await one('meta[property="og:description"]', DESCRIPTION);
  await one('meta[property="og:url"]', SITE);
  await one('meta[property="og:type"]', 'website');
  await one('meta[property="og:locale"]', 'pt_BR');
  await one('meta[property="og:site_name"]', /Fluxo.*Officina 404/);
  await one('meta[property="og:image"]', SITE + 'og-image.jpg');
  await one('meta[property="og:image:width"]', '1200');
  await one('meta[property="og:image:height"]', '630');
  await one('meta[property="og:image:alt"]', /Visibilidade para agir/);
  await one('meta[name="twitter:card"]', 'summary_large_image');
  await one('meta[name="twitter:title"]', TITLE);
  await one('meta[name="twitter:description"]', DESCRIPTION);
  await one('meta[name="twitter:image"]', SITE + 'og-image.jpg');
  await one('meta[name="twitter:image:alt"]', /Visibilidade para agir/);
  await expect(page.locator('title')).toHaveCount(1);
  expect(await page.content()).not.toContain('noindex');
});

test('estados de produto e conteúdo pendente', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('body').innerText();
  for (const label of ['Disponível', 'No piloto', 'Próxima etapa']) expect(text).toContain(label);
  expect(text).not.toMatch(/a preencher|CNPJ/i);
  expect(text).toContain('30 dias');
  expect(text).not.toMatch(/\d+\s+vagas?/);
  await expect(page.locator('[data-slots-row]')).toBeHidden();
});

test('quantidade de vagas aparece só quando configurada', async ({ page }) => {
  await configure(page, true, ', diagnosticSlots: 2, city: "Lages"');
  await page.goto('/');
  await expect(page.locator('[data-slots-text]').first()).toHaveText('2 vagas de diagnóstico em Lages neste ciclo');
  await expect(page.locator('[data-slots-row]')).toBeVisible();
});

test('validação de contato e campos obrigatórios bloqueia pedidos inválidos', async ({ page }) => {
  await configure(page); let count = 0;
  await page.route(endpoint, route => { count++; return route.fulfill({ json: { ok: true } }); });
  await page.goto('/');
  await page.locator('[type=submit]').click(); expect(count).toBe(0);
  await fill(page, 'abc'); await page.locator('[type=submit]').click();
  expect(await page.locator('[name=contato]').evaluate(e => e.validity.customError)).toBe(true); expect(count).toBe(0);
  for (const value of ['contato@officina404.com.br', 'CONTATO@OFFICINA404.COM.BR', '  contato@officina404.com.br  ']) {
    await page.locator('[name=contato]').fill(value);
    await page.locator('[type=submit]').click();
    expect(await page.locator('[name=contato]').evaluate(e => e.validationMessage)).toBe('Informe o seu e-mail ou telefone para que possamos responder.');
    expect(count).toBe(0);
  }
  for (const value of ['teste@example.com', 'pessoa@officina404.com.br', '(11) 99999-9999', '+55 (11) 99999-9999']) {
    await page.locator('[name=contato]').fill(value);
    expect(await page.locator('form').evaluate(f => f.checkValidity())).toBe(true);
  }
});

test('envio confirma receptor e mede conversão sem dados pessoais', async ({ page }) => {
  await configure(page); let body;
  await page.route(endpoint, async route => { body = route.request().postData(); await route.fulfill({ json: { ok: true } }); });
  await page.goto('/'); await fill(page);
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Pedido recebido');
  await expect(page.locator('[name=nome]')).toHaveValue('');
  expect(body).toContain('teste@example.com');
  expect(body).toContain('cf-turnstile-response');
  expect(body).toContain('test-token');
  expect(body).toContain('diagnostico-30-dias');
  const events = await page.evaluate(() => window.events);
  expect(events.some(e => e.name === 'lead_received')).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/Pessoa de teste|teste@example.com|câmara fria/);
});

test('token ausente, expirado ou falho impede envio; nova tentativa usa novo token', async ({ page }) => {
  await configure(page); const bodies = [];
  await page.route(endpoint, route => { bodies.push(route.request().postData()); return route.fulfill({ status: bodies.length === 1 ? 422 : 200, json: { ok: bodies.length > 1 } }); });
  await page.goto('/'); await fill(page);
  await page.evaluate(() => window.challengeOptions['expired-callback']());
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Conclua a verificação'); expect(bodies).toHaveLength(0);
  await page.evaluate(() => window.challengeOptions['error-callback']());
  await page.locator('[type=submit]').click(); expect(bodies).toHaveLength(0);
  await page.evaluate(() => window.challengeOptions.callback('first-token'));
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Não conseguimos confirmar');
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Pedido recebido');
  expect(bodies[0]).toContain('first-token'); expect(bodies[1]).toContain('fresh-test-token');
});

test('falha no carregamento da proteção mantém dados e oferece alternativa', async ({ page }) => {
  await configure(page); let count = 0;
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.abort());
  await page.route(endpoint, route => { count++; return route.fulfill({ json: { ok: true } }); });
  await page.goto('/'); await fill(page); await page.locator('[type=submit]').click();
  await expect(page.locator('[data-verification-status]')).toContainText('Não foi possível carregar');
  await expect(page.locator('[name=nome]')).toHaveValue('Pessoa de teste'); expect(count).toBe(0);
});

for (const failure of ['http', 'network', 'invalid-json', 'unconfirmed']) test(`falha ${failure} mantém pedido e oferece e-mail`, async ({ page }) => {
  await configure(page);
  await page.route(endpoint, route => failure === 'network' ? route.abort() : route.fulfill(failure === 'invalid-json' ? { contentType: 'text/html', body: '<html>erro</html>' } : { status: failure === 'http' ? 422 : 200, json: { ok: false } }));
  await page.goto('/'); await fill(page); await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Não conseguimos confirmar');
  await expect(page.locator('[name=nome]')).toHaveValue('Pessoa de teste');
  await expect(page.locator('[type=submit]')).toBeEnabled();
  expect(decodeURIComponent(await page.locator('[data-email-alternative]').getAttribute('href'))).toContain('teste@example.com');
  expect(await page.evaluate(() => window.events.some(e => e.name === 'lead_received'))).toBe(false);
});

test('envio em andamento bloqueia duplicidade', async ({ page }) => {
  await configure(page); let release, count = 0;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route(endpoint, async route => { count++; await waiting; await route.fulfill({ json: { ok: true } }); });
  await page.goto('/'); await fill(page); await page.locator('[type=submit]').click();
  await expect(page.locator('[type=submit]')).toBeDisabled();
  await page.locator('form').evaluate(f => f.dispatchEvent(new Event('submit', { cancelable: true })));
  expect(count).toBe(1); release();
  await expect(page.locator('[data-form-status]')).toContainText('Pedido recebido');
});

test('sem endpoint é explícito que o pedido não foi enviado', async ({ page }) => {
  await configure(page, false); await page.goto('/'); await fill(page);
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('ainda não foi enviado');
  expect(decodeURIComponent(await page.locator('[data-email-alternative]').getAttribute('href'))).toContain('Pessoa de teste');
  expect(await page.evaluate(() => window.events.some(e => e.name === 'lead_received'))).toBe(false);
});

test('política, ícones, sitemap e 404 disponíveis', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('.site-footer').getByRole('link', { name: 'Privacidade', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Política de privacidade');
  await expect(page.locator('main')).toContainText('WhatsApp');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const asset of ['/favicon.svg', '/favicon.png', '/apple-touch-icon.png', '/assets/favicon.png', '/assets/apple-touch-icon.png', '/og-image.jpg', '/sitemap.xml', '/robots.txt', '/assets/fonts/OFL-IBM-Plex.txt']) expect((await request.get(asset)).status(), asset).toBe(200);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://fluxo.officina404.com.br/</loc>');
  expect(sitemap).toContain('<loc>https://fluxo.officina404.com.br/privacidade.html</loc>');
  const response = await page.goto('/nao-existe'); expect(response.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Página não encontrada');
});

test('analytics retém eventos até carregar e não inclui dados do formulário', async ({ page }) => {
  const scriptUrl = 'https://analytics.example.com/script.js'; let release;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route('**/site-config.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FLUXO_CONFIG={formEndpoint:'',analytics:{scriptUrl:'${scriptUrl}',websiteId:'test-site'}};` }));
  await page.route(scriptUrl, async route => { await waiting; await route.fulfill({ contentType: 'text/javascript', body: 'window.events=[];window.umami={track:(name,props)=>window.events.push({name,props})};' }); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('a[data-cta="hero-diagnostico"]').click();
  release();
  await expect.poll(() => page.evaluate(() => window.events?.some(e => e.name === 'cta_click'))).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(window.events))).toContain('hero-diagnostico');
});

test('Do Not Track impede carregamento e eventos de analytics', async ({ page }) => {
  let analyticsRequests = 0;
  await page.addInitScript(() => { Object.defineProperty(navigator, 'doNotTrack', { value: '1' }); window.events = []; window.umami = { track: (name) => window.events.push(name) }; });
  await page.route('**/site-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.FLUXO_CONFIG={formEndpoint:'',analytics:{scriptUrl:'https://analytics.example.com/script.js',websiteId:'test-site'}};" }));
  await page.route('https://analytics.example.com/script.js', route => { analyticsRequests++; return route.fulfill({ body: '' }); });
  await page.goto('/'); await page.locator('a[data-cta="hero-diagnostico"]').click();
  expect(analyticsRequests).toBe(0); expect(await page.evaluate(() => window.events)).toEqual([]);
});
