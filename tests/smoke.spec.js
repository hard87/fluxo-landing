const { test, expect } = require('@playwright/test');
const endpoint = 'https://formspree.io/f/testfluxo';
async function configure(page, enabled = true) {
  await page.route('**/site-config.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FLUXO_CONFIG = { formEndpoint: '${enabled ? endpoint : ''}' };` }));
  await page.addInitScript(() => { window.events = []; window.umami = { track: (name, props) => window.events.push({name,props}) }; });
}
async function fill(page, contact = 'teste@example.com') {
  await page.locator('[name=nome]').fill('Pessoa de teste');
  await page.locator('[name=contato]').fill(contact);
  await page.locator('[name=cenario]').fill('Monitorar uma câmara fria');
}
test('navegação responsiva, fontes locais, imagens e abas por teclado', async ({page}) => {
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /^.{1,155}$/);
  await expect(page.locator('.hero-visual img').first()).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('#t-alert')).toHaveAttribute('aria-selected','true');
  await page.locator('#t-alert').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#p-screen')).toHaveAttribute('aria-labelledby','t-hist');
  await expect(page.locator('[data-s-img]')).toHaveAttribute('src','./img/tela-historico.webp');
  await page.keyboard.press('End');
  await expect(page.locator('#p-screen')).toHaveAttribute('aria-labelledby','t-dev');
  await page.locator('#t-dash').click();
  await expect(page.locator('[data-s-title]')).toHaveText('Visão geral dos dispositivos');
  await page.locator('#sensor').scrollIntoViewIfNeeded();
  for (const image of await page.locator('#sensor img').all()) await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  if (page.viewportSize().width < 961) {
    await page.locator('.menu-toggle').click(); await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');
    await page.locator('#navigation a[href="#piloto"]').click(); await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
    await expect(page).toHaveURL(/#piloto$/);
  }
  expect(errors).toEqual([]);
  expect(requests.filter(url => /fontshare|googleapis|gstatic/.test(url))).toEqual([]);
});
test('validação de contato e campos obrigatórios bloqueia pedidos inválidos', async ({page}) => {
  await configure(page); let count = 0;
  await page.route(endpoint, route => { count++; return route.fulfill({json:{ok:true}}); });
  await page.goto('/');
  await page.locator('[type=submit]').click(); expect(count).toBe(0);
  await fill(page,'abc'); await page.locator('[type=submit]').click();
  expect(await page.locator('[name=contato]').evaluate(e => e.validity.customError)).toBe(true); expect(count).toBe(0);
  for (const value of ['teste@example.com','(11) 99999-9999','+55 (11) 99999-9999']) {
    await page.locator('[name=contato]').fill(value);
    expect(await page.locator('form').evaluate(f => f.checkValidity())).toBe(true);
  }
});
test('envio confirma receptor e mede conversão sem dados pessoais', async ({page}) => {
  await configure(page); let body;
  await page.route(endpoint, async route => { body = route.request().postData(); await route.fulfill({json:{ok:true}}); });
  await page.goto('/'); await fill(page);
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Pedido recebido');
  await expect(page.locator('[name=nome]')).toHaveValue('');
  expect(body).toContain('teste@example.com');
  const events = await page.evaluate(() => window.events);
  expect(events.some(e=>e.name==='lead_received')).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/Pessoa de teste|teste@example.com|câmara fria/);
});
for (const failure of ['http','network','invalid-json','unconfirmed']) test(`falha ${failure} mantém pedido e oferece e-mail`, async ({page}) => {
  await configure(page);
  await page.route(endpoint, route => failure === 'network' ? route.abort() : route.fulfill(failure === 'invalid-json' ? {contentType:'text/html',body:'<html>erro</html>'} : {status: failure === 'http' ? 422 : 200,json:{ok:false}}));
  await page.goto('/'); await fill(page); await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('Não conseguimos confirmar');
  await expect(page.locator('[name=nome]')).toHaveValue('Pessoa de teste');
  await expect(page.locator('[type=submit]')).toBeEnabled();
  expect(decodeURIComponent(await page.locator('[data-email-alternative]').getAttribute('href'))).toContain('teste@example.com');
  expect(await page.evaluate(()=>window.events.some(e=>e.name==='lead_received'))).toBe(false);
});
test('ficha R1 preserva intenção; envio em andamento bloqueia duplicidade', async ({page}) => {
  await configure(page); let release, count = 0;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route(endpoint, async route => { count++; await waiting; await route.fulfill({json:{ok:true}}); });
  await page.goto('/'); await page.getByRole('link',{name:'Pedir a ficha técnica do R1'}).click();
  await expect(page.locator('[name=interesse]')).toHaveValue('ficha-r1');
  await fill(page); await page.locator('[type=submit]').click();
  await expect(page.locator('[type=submit]')).toBeDisabled();
  await page.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{cancelable:true})));
  expect(count).toBe(1); release();
  await expect(page.locator('[data-form-status]')).toContainText('Pedido recebido');
  expect(await page.evaluate(()=>window.events.find(e=>e.name==='lead_received').props.interest)).toBe('ficha-r1');
});
test('sem endpoint é explícito que o pedido não foi enviado', async ({page}) => {
  await configure(page,false); await page.goto('/'); await fill(page);
  await page.locator('[type=submit]').click();
  await expect(page.locator('[data-form-status]')).toContainText('O pedido ainda não foi enviado');
  await expect(page.locator('[data-email-alternative]')).toContainText('Abrir e-mail');
  expect(await page.evaluate(()=>window.events.some(e=>e.name==='lead_received'))).toBe(false);
});
test('política, FAQ, ícones e 404 disponíveis', async ({page,request}) => {
  await page.goto('/'); await page.getByText('Onde recebo os alertas?',{exact:true}).click();
  await expect(page.locator('#duvidas details[open]')).toContainText('portal');
  await page.getByRole('link',{name:'Privacidade',exact:true}).click();
  await expect(page.locator('h1')).toHaveText('Política de privacidade');
  for (const asset of ['/favicon.svg','/favicon.png','/apple-touch-icon.png','/sitemap.xml']) expect((await request.get(asset)).status()).toBe(200);
  const response = await page.goto('/nao-existe'); expect(response.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Página não encontrada');
});
test('analytics retém eventos até carregar e não inclui dados do formulário', async ({page}) => {
  const scriptUrl = 'https://analytics.example.com/script.js'; let release;
  const waiting = new Promise(resolve=>{release=resolve});
  await page.route('**/site-config.js',route=>route.fulfill({contentType:'text/javascript',body:`window.FLUXO_CONFIG={formEndpoint:'',analytics:{scriptUrl:'${scriptUrl}',websiteId:'test-site'}};`}));
  await page.route(scriptUrl,async route=>{await waiting;await route.fulfill({contentType:'text/javascript',body:'window.events=[];window.umami={track:(name,props)=>window.events.push({name,props})};'});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'Pedir a ficha técnica do R1'}).click();
  release();
  await expect.poll(()=>page.evaluate(()=>window.events?.some(e=>e.name==='cta_click'))).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify(window.events))).toContain('ficha-r1');
});
test('Do Not Track impede carregamento e eventos de analytics', async ({page}) => {
  let analyticsRequests = 0;
  await page.addInitScript(()=>{Object.defineProperty(navigator,'doNotTrack',{value:'1'});window.events=[];window.umami={track:(name)=>window.events.push(name)};});
  await page.route('**/site-config.js',route=>route.fulfill({contentType:'text/javascript',body:"window.FLUXO_CONFIG={formEndpoint:'',analytics:{scriptUrl:'https://analytics.example.com/script.js',websiteId:'test-site'}};"}));
  await page.route('https://analytics.example.com/script.js',route=>{analyticsRequests++;return route.fulfill({body:''})});
  await page.goto('/');await page.getByRole('link',{name:'Pedir a ficha técnica do R1'}).click();
  expect(analyticsRequests).toBe(0);expect(await page.evaluate(()=>window.events)).toEqual([]);
});
