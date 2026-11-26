// Fluxo V5: interações da página
// menu, cena do sábado, seletor de perfil + hub, abas com zoom, gerador de mensagem,
// WhatsApp flutuante, analytics (Umami) e formulário (Formspree + Turnstile).
(() => {
  'use strict';
  const config = window.FLUXO_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Analytics (Umami, respeita Do Not Track; nunca envia dados do formulário) ----------
  const analyticsEnabled = Boolean(config.analytics?.scriptUrl && config.analytics?.websiteId) && navigator.doNotTrack !== '1';
  const pending = [];
  const track = (name, props = {}) => {
    if (navigator.doNotTrack === '1') return;
    try {
      if (window.umami?.track) window.umami.track(name, props);
      else if (analyticsEnabled && pending.length < 30) pending.push({ name, props });
    } catch { /* analytics não bloqueia o contato */ }
  };
  if (analyticsEnabled) {
    const s = document.createElement('script');
    s.src = config.analytics.scriptUrl; s.defer = true;
    s.dataset.websiteId = config.analytics.websiteId;
    if (config.analytics.domains) s.dataset.domains = config.analytics.domains;
    s.dataset.doNotTrack = 'true';
    s.addEventListener('load', () => pending.splice(0).forEach(e => track(e.name, e.props)));
    document.head.append(s);
  }

  // ---------- Vagas (opcional, vem do site-config) ----------
  // Sem número confirmado (diagnosticSlots null), a página mantém o convite neutro do HTML.
  const city = config.city || 'Lages';
  if (Number.isInteger(config.diagnosticSlots)) {
    const slots = Math.max(config.diagnosticSlots, 0);
    const slotsText = slots > 0
      ? `${slots} ${slots === 1 ? 'vaga' : 'vagas'} de diagnóstico em ${city} neste ciclo`
      : `Vagas deste ciclo preenchidas em ${city}: entre na lista de espera`;
    $$('[data-slots-text]').forEach(el => { el.textContent = slotsText; });
    $$('[data-slots]').forEach(el => { el.textContent = String(slots); });
    $$('[data-slots-row]').forEach(el => { el.hidden = false; });
  }

  // ---------- Menu mobile ----------
  const nav = $('#nav'), toggle = $('.menu-toggle');
  const setMenu = open => { nav.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); } });
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => { if (nav.classList.contains('open') && Math.abs(window.scrollY - lastY) > 60) setMenu(false); lastY = window.scrollY; }, { passive: true });

  // ---------- Cena "Sábado, 23h47": três canais e reconhecimento ----------
  const stage = $('[data-stage]'), banner = $('.ack-banner');
  const chans = $$('.chan', stage);
  let timers = [];
  const play = () => {
    timers.forEach(clearTimeout); timers = [];
    if (reduceMotion) return; // sem animação: estado final já visível
    stage.classList.add('armed'); banner.classList.add('armed');
    stage.classList.remove('acked'); banner.classList.remove('acked');
    chans.forEach(c => c.classList.remove('on'));
    // os três canais chegam quase juntos: é o ponto da cena
    chans.forEach((c, i) => timers.push(setTimeout(() => c.classList.add('on'), 500 + i * 260)));
    timers.push(setTimeout(() => { stage.classList.add('acked'); banner.classList.add('acked'); }, 3200));
  };
  // só arma (esmaece) quando a cena está chegando à tela: fora dela, o estado final fica legível
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { play(); track('cena_sabado_vista'); io.disconnect(); } }, { rootMargin: '0px 0px 120px 0px' });
    io.observe(stage);
  }
  $('[data-replay]').addEventListener('click', () => { play(); track('cena_sabado_replay'); });

  // ---------- Seletor de perfil + hub ----------
  const PROFILES = {
    manipulacao: {
      label: 'Farmácia de manipulação', phrase: 'uma farmácia de manipulação',
      norm: 'Farmácias · RDC 67/2007',
      pain: 'O laboratório fecha no sábado às 13h. A sala, o almoxarifado e a geladeira de insumos ficam 43 horas sem ninguém olhar.',
      detail: 'Umidade alta no almoxarifado e calor na sala de manipulação aparecem entre uma anotação e outra. Na geladeira de insumos, o problema costuma aparecer de madrugada.',
      rule: 'SE umidade · almoxarifado &gt; 70 % POR 30 min<br />ENTÃO alerta → portal + Telegram + e-mail',
      segs: [
        ['R1 · temperatura', 'Geladeira de insumos', 'Faixa de 2 a 8 °C. A sonda passa pela vedação da porta e o visor mostra a leitura do lado de fora.'],
        ['Central · temp. + umidade', 'Sala de manipulação', 'Temperatura e umidade da sala, lidas a cada 30 segundos.'],
        ['Central · temp. + umidade', 'Almoxarifado de matérias-primas', 'Umidade e calor que a prancheta não pega, principalmente no verão e nos dias de chuva.'],
        ['Central · temp. + umidade', 'Controle de qualidade', 'Registro contínuo da sala onde ficam reagentes e amostras de referência.']
      ]
    },
    drogaria: {
      label: 'Drogaria e termolábeis', phrase: 'uma drogaria',
      norm: 'Drogarias · RDC 44/2009 · RDC 430/2020',
      pain: 'Insulinas, canetas e vacinas dependem de uma geladeira que ninguém olha entre o fechamento e a abertura.',
      detail: 'Queda de energia à noite ou porta mal fechada no fim do expediente só aparecem na conferência da manhã seguinte, quando o produto já passou horas fora da faixa.',
      rule: 'SE temperatura · geladeira &gt; 8,0 °C POR 5 min<br />ENTÃO alerta → portal + Telegram + e-mail',
      segs: [
        ['R1 · temperatura', 'Geladeira de insulinas e canetas', 'Faixa de 2 a 8 °C, leitura no visor do lado de fora e aviso se o sensor parar de enviar.'],
        ['R1 · temperatura', 'Geladeira de vacinas', 'Mesmo controle, em ponto separado, com histórico próprio.'],
        ['Central · temp. + umidade', 'Área de dispensação', 'Temperatura e umidade do salão onde ficam os medicamentos expostos.'],
        ['Central · temp. + umidade', 'Estoque de reserva', 'O depósito dos fundos, que costuma ser o ponto mais quente da loja.']
      ]
    },
    clinica: {
      label: 'Clínica e laboratório', phrase: 'uma clínica ou laboratório',
      norm: 'Clínicas, vacinas e análises',
      pain: 'Vacinas, reagentes e amostras não avisam quando a geladeira esquenta. Quem descobre é a primeira pessoa a chegar.',
      detail: 'Um refrigerador que oscila de madrugada ou uma sala de coleta que esquenta à tarde podem comprometer imunobiológicos e resultados sem deixar sinal na anotação do dia.',
      rule: 'SE temperatura · conservadora &gt; 8,0 °C POR 5 min<br />ENTÃO alerta → portal + Telegram + e-mail',
      segs: [
        ['R1 · temperatura', 'Conservadora de vacinas', 'Faixa de 2 a 8 °C, com histórico por período e aviso fora do horário.'],
        ['R1 · temperatura', 'Geladeira de reagentes', 'Controle separado para reagentes e kits de diagnóstico.'],
        ['R1 · temperatura', 'Freezer de amostras', 'Faixa definida com o responsável técnico para cada equipamento.'],
        ['Central · temp. + umidade', 'Sala de coleta', 'Temperatura e umidade do ambiente de atendimento e preparo.']
      ]
    },
    frio: {
      label: 'Câmara fria e alimentos', phrase: 'uma operação com câmara fria',
      norm: 'Cadeia fria e estoques climatizados',
      pain: 'Uma câmara que desarma na sexta à noite vira prejuízo na segunda de manhã.',
      detail: 'Câmaras frias, freezers e depósitos climatizados precisam de alguém olhando o tempo todo. Com o Fluxo, o aviso chega na hora, e não quando a mercadoria já foi perdida.',
      rule: 'SE temperatura · câmara &gt; −15 °C POR 10 min<br />ENTÃO alerta → portal + Telegram + e-mail',
      segs: [
        ['R1 · temperatura', 'Câmara de congelados', 'Faixa definida por produto, com aviso fora do horário e no fim de semana.'],
        ['R1 · temperatura', 'Câmara de resfriados', 'Ponto separado, com histórico próprio para consulta.'],
        ['R1 · temperatura', 'Freezers e balcões', 'Os equipamentos menores que costumam ficar sem controle.'],
        ['Central · temp. + umidade', 'Depósito climatizado', 'Temperatura e umidade do estoque seco.']
      ]
    }
  };
  let profile = 'manipulacao';
  const radios = $$('[data-profile]');
  const genProfile = $('#genProfile'), formProfile = $('#formProfile');
  const applyProfile = (key, origin) => {
    const p = PROFILES[key]; if (!p) return;
    profile = key;
    radios.forEach(r => { const on = r.dataset.profile === key; r.setAttribute('aria-checked', String(on)); r.tabIndex = on ? 0 : -1; });
    const set = (sel, html) => { const el = $(`[data-p="${sel}"]`); if (el) { el.innerHTML = html; el.classList.remove('fade'); void el.offsetWidth; el.classList.add('fade'); } };
    set('norm', p.norm); set('pain', p.pain); set('detail', p.detail); set('rule', p.rule);
    $$('.seg').forEach((seg, i) => {
      const [m, t, d] = p.segs[i];
      $('[data-s="m"]', seg).textContent = m; $('[data-s="t"]', seg).textContent = t; $('[data-s="d"]', seg).textContent = d;
      seg.classList.remove('fade'); void seg.offsetWidth; seg.classList.add('fade');
    });
    if (genProfile) genProfile.value = key;
    if (formProfile) formProfile.selectedIndex = Math.max(0, Object.keys(PROFILES).indexOf(key));
    updateGen();
    schedule();
    if (origin) track('perfil_selecionado', { perfil: key, origem: origin });
  };
  radios.forEach((r, i) => {
    r.addEventListener('click', () => applyProfile(r.dataset.profile, 'seletor'));
    r.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      const next = radios[(i + k + radios.length) % radios.length];
      applyProfile(next.dataset.profile, 'seletor'); next.focus();
    });
  });

  // curvas do núcleo até a borda interna de cada card (mesma técnica da V4)
  const hub = $('#hub'), svg = $('#hubLines'), core = $('#hubCore');
  const NS = 'http://www.w3.org/2000/svg';
  const drawHub = () => {
    svg.replaceChildren();
    if (getComputedStyle(svg).display === 'none') return;
    const h = hub.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
    const c = core.getBoundingClientRect();
    const cx = c.left - h.left + c.width / 2, cy = c.top - h.top + c.height / 2;
    $$('.seg', hub).forEach(card => {
      const r = card.getBoundingClientRect();
      const left = r.left + r.width / 2 < h.left + h.width / 2;
      const x = (left ? r.right : r.left) - h.left;
      const y = r.top - h.top + r.height / 2;
      const dir = left ? -1 : 1, reach = Math.abs(x - cx) * .55;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${cx + dir * c.width / 2 * .8} ${cy} C${cx + dir * reach} ${cy}, ${x - dir * reach} ${y}, ${x} ${y}`);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 4);
      svg.append(p, dot);
    });
  };
  let raf;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawHub); }
  window.addEventListener('resize', schedule);
  window.addEventListener('load', drawHub);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(hub);

  // ---------- Abas com telas reais ----------
  const tabs = $$('.tab');
  const select = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const panel = $('#' + t.getAttribute('aria-controls'));
      panel.hidden = !on; panel.classList.toggle('active', on);
    });
    if (focus) tab.focus();
    track('tela_aba', { aba: tab.id });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(tabs[e.key === 'Home' ? 0 : tabs.length - 1], true); return; }
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });

  // zoom em <dialog>
  const zoom = $('#zoom'), zoomImg = $('#zoomImg');
  let zoomOrigin = null;
  $$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    if (typeof zoom.showModal !== 'function') { window.open(b.dataset.zoom, '_blank', 'noopener'); return; }
    zoomOrigin = b;
    zoomImg.src = b.dataset.zoom; zoomImg.alt = b.dataset.zoomAlt || '';
    zoom.showModal(); track('tela_zoom', { tela: b.dataset.zoom });
  }));
  $('[data-zoom-close]').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', e => { if (e.target === zoom) zoom.close(); });
  zoom.addEventListener('close', () => { if (zoomOrigin) zoomOrigin.focus(); });

  // ---------- Gerador de mensagem para WhatsApp (contato comercial, não alerta) ----------
  const wa = config.whatsapp || {};
  const waNumber = wa.number || '5549988079237';
  const genCity = $('#genCity'), genPoint = $('#genPoint'), genText = $('#genText'), genSend = $('#genSend');
  let genEdited = false;
  const buildMsg = () => {
    const p = PROFILES[genProfile.value] || PROFILES.manipulacao;
    const c = (genCity.value || city).trim();
    const point = genPoint.value;
    const pointLine = point === 'Ainda não sei'
      ? 'Ainda não sei qual ponto monitorar primeiro.'
      : `O ponto que mais me preocupa: ${point.toLowerCase()}.`;
    return [
      'Olá! Vim pela página do Fluxo.',
      `Tenho ${p.phrase} em ${c} e quero saber sobre o diagnóstico de 30 dias.`,
      pointLine,
      'Qual o melhor horário para uma conversa de 15 minutos?'
    ].join('\n');
  };
  const syncHref = () => { genSend.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(genText.value.trim())}`; };
  function updateGen() { if (!genText) return; if (!genEdited) genText.value = buildMsg(); syncHref(); }
  if (genText) {
    genCity.value = city;
    [genProfile, genCity, genPoint].forEach(el => el.addEventListener('input', () => { genEdited = false; if (el === genProfile && PROFILES[el.value] && el.value !== profile) applyProfile(el.value, 'gerador'); else updateGen(); }));
    genText.addEventListener('input', () => { genEdited = true; syncHref(); });
    genSend.addEventListener('click', () => { syncHref(); track('whatsapp_gerador', { perfil: genProfile.value }); });
  }

  // ---------- WhatsApp padrão ----------
  const waHref = `https://wa.me/${waNumber}` + (wa.message ? `?text=${encodeURIComponent(wa.message)}` : '');
  $$('[data-wa]').forEach(a => { a.href = waHref; a.addEventListener('click', () => track('whatsapp_click')); });
  $$('a[data-cta]').forEach(a => a.addEventListener('click', () => track('cta_click', { origem: a.dataset.cta })));

  // botão flutuante some quando já há CTA, gerador ou formulário na tela
  const floatBtn = $('.wa-float');
  if (floatBtn && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      floatBtn.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: .15 });
    [$('.hero-cta'), $('.terms'), $('#gerador'), $('#leadForm')].forEach(el => el && io.observe(el));
  }

  // ---------- Formulário (Formspree + Turnstile, mesmo fluxo da landing publicada) ----------
  const form = $('#leadForm');
  const contact = form.elements.contato, nameField = form.elements.nome;
  const submit = $('[type=submit]', form), status = $('[data-form-status]', form);
  const alternative = $('[data-email-alternative]', form);
  const email = config.email || 'contato@officina404.com.br';
  const endpoint = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(config.formEndpoint || '') ? config.formEndpoint : '';
  if (endpoint) form.action = endpoint; else submit.textContent = 'Preparar pedido por e-mail';
  const setStatus = m => { status.hidden = false; status.textContent = m; };
  const verification = $('[data-verification-status]', form), widget = $('[data-turnstile]', form);
  let token = '', widgetId, turnstileLoaded = false;
  const vStatus = m => { verification.hidden = false; verification.textContent = m; };
  const clearV = m => { token = ''; vStatus(m); };

  // Turnstile só carrega quando o formulário se aproxima da tela (não pesa no carregamento inicial)
  const loadTurnstile = () => {
    if (turnstileLoaded || !endpoint) return;
    turnstileLoaded = true;
    vStatus('Aguarde a verificação de segurança antes de enviar.');
    if (!config.turnstileSiteKey) { vStatus('O formulário está indisponível. Use o WhatsApp ou o e-mail abaixo.'); return; }
    widget.hidden = false;
    const ch = document.createElement('script');
    ch.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; ch.async = true;
    ch.addEventListener('load', () => {
      try {
        widgetId = window.turnstile.render(widget, {
          sitekey: config.turnstileSiteKey, size: 'flexible',
          callback: t => { token = t; vStatus('Verificação concluída. Você pode enviar o pedido.'); },
          'expired-callback': () => clearV('A verificação expirou. Aguarde uma nova verificação antes de enviar.'),
          'error-callback': () => { clearV('A verificação falhou. Recarregue a página ou use o WhatsApp ou o e-mail abaixo.'); return true; }
        });
      } catch { clearV('Não foi possível iniciar a verificação. Use o WhatsApp ou o e-mail abaixo.'); }
    });
    ch.addEventListener('error', () => clearV('Não foi possível carregar a verificação. Use o WhatsApp ou o e-mail abaixo.'));
    document.head.append(ch);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { loadTurnstile(); track('form_view'); io.disconnect(); } }, { rootMargin: '400px 0px' });
    io.observe(form);
  } else loadTurnstile();
  form.addEventListener('focusin', loadTurnstile, { once: true });

  const validContact = v => {
    v = v.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
    if (!/^\+?[\d\s().-]+$/.test(v)) return false;
    return /^(?:55)?[1-9][0-9][2-9][0-9]{7,8}$/.test(v.replace(/\D/g, ''));
  };
  const validate = () => {
    nameField.setCustomValidity(nameField.value.trim() ? '' : 'Informe seu nome.');
    if (contact.value.trim().toLowerCase() === email) contact.setCustomValidity('Informe o seu e-mail ou telefone para que possamos responder.');
    else contact.setCustomValidity(validContact(contact.value) ? '' : 'Informe um e-mail válido ou um telefone com DDD.');
  };
  nameField.addEventListener('input', validate); contact.addEventListener('input', validate);

  const mailLink = () => {
    const body = ['Nome: ' + nameField.value.trim(), 'Contato: ' + contact.value.trim(), 'Farmácia: ' + form.elements.empresa.value.trim(),
      'Perfil: ' + form.elements.segmento.value, 'Pontos: ' + form.elements.pontos.value, '', form.elements.cenario.value.trim()].join('\n');
    alternative.href = `mailto:${email}?subject=${encodeURIComponent('Diagnóstico de 30 dias, Fluxo')}&body=${encodeURIComponent(body)}`;
  };
  form.addEventListener('input', mailLink);
  alternative.addEventListener('click', () => { mailLink(); track('email_alternative'); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    validate();
    if (!form.reportValidity()) return;
    mailLink();
    if (!endpoint) { setStatus('Pedido preparado. Use o link de e-mail abaixo para enviar. Ele ainda não foi enviado.'); track('email_prepared'); return; }
    if (!token) { setStatus('Conclua a verificação de segurança antes de enviar. Se ela não carregar, use o WhatsApp ou o e-mail abaixo.'); return; }
    track('form_submit');
    submit.disabled = true; submit.textContent = 'Enviando…'; form.setAttribute('aria-busy', 'true'); setStatus('Enviando seu pedido…');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
    try {
      const data = new FormData(form);
      data.set('cf-turnstile-response', token);
      data.set('nome', nameField.value.trim()); data.set('contato', contact.value.trim());
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value.trim())) data.set('email', contact.value.trim());
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctl.signal });
      const out = await res.json();
      if (!res.ok || out.ok !== true) throw new Error('falha no envio');
      track('lead_received');
      form.reset(); applyProfile(profile);
      setStatus('Pedido recebido. Entramos em contato pelo e-mail ou telefone informado.');
    } catch {
      track('form_error');
      setStatus('Não conseguimos confirmar o recebimento. Seus dados foram mantidos. Tente novamente ou fale pelo WhatsApp ou e-mail.');
    } finally {
      clearTimeout(to); submit.disabled = false; submit.textContent = 'Enviar pedido'; form.removeAttribute('aria-busy');
      clearV('Aguarde uma nova verificação para enviar outro pedido.');
      if (widgetId !== undefined) { try { window.turnstile.reset(widgetId); } catch { vStatus('Recarregue a página para verificar novamente.'); } }
    }
  });

  // estado inicial
  applyProfile('manipulacao');
  drawHub();
})();
