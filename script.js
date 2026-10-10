(() => {
  const header = document.querySelector('[data-header]');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  const screens = {
    dash: {
      title: 'Visão geral dos dispositivos',
      copy: 'Quantos dispositivos estão online, offline ou em estado desconhecido, quantas mensagens foram processadas ou rejeitadas e quando chegou a última telemetria.',
      list: ['Indicadores de dispositivos por estado', 'Mensagens processadas e rejeitadas', 'Horário da última telemetria recebida'],
      img: './img/tela-dashboard.webp', w: 1600, h: 708, bar: 'Dashboard',
      alt: 'Tela de Dashboard do Fluxo'
    },
    hist: {
      title: 'Histórico por dispositivo e período',
      copy: 'Selecione dispositivos e métricas, escolha o período e veja as séries no mesmo gráfico, com resumo de cada ponto monitorado.',
      list: ['Períodos rápidos ou intervalo personalizado', 'Dados brutos ou agregados por intervalo', 'Atual, mínimo, máximo, média e tendência', 'Valores também em tabela'],
      img: './img/tela-historico.webp', w: 1600, h: 1682, bar: 'Telemetry Explorer',
      alt: 'Tela de histórico de temperatura do Fluxo comparando duas câmaras frias'
    },
    alert: {
      title: 'Regras que viram eventos',
      copy: 'Cada regra define a métrica, o dispositivo, a condição e a severidade. Quando a condição é atendida, a plataforma abre um evento de alerta.',
      list: ['Exemplo: temperatura > 8 °C na camara-01', 'Severidade e estado da regra visíveis', 'Editar, desativar, arquivar e ver revisões', 'Abas de eventos, notificações e diagnóstico'],
      img: './img/tela-alertas.webp', w: 1600, h: 656, bar: 'Alertas · Regras',
      alt: 'Tela de regras de alerta do Fluxo'
    },
    dev: {
      title: 'Cada dispositivo identificado',
      copy: 'Sensores e gateways cadastrados com nome, identificador, categoria, estado e horário da última telemetria.',
      list: ['Busca por nome, identificador ou categoria', 'Filtro por estado', 'Cadastro de novos dispositivos'],
      img: './img/tela-dispositivos.webp', w: 1600, h: 651, bar: 'Dispositivos',
      alt: 'Tela de lista de dispositivos do Fluxo'
    }
  };

  const tabs = [...document.querySelectorAll('.screen-tabs [role=tab]')];
  const panel = document.getElementById('p-screen');
  const el = s => panel.querySelector(s);
  const img = el('[data-s-img]');
  let imageTimer;
  const select = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    if (focus) tab.focus();
    panel.setAttribute('aria-labelledby', tab.id);
    const d = screens[tab.dataset.screen];
    el('[data-s-title]').textContent = d.title;
    el('[data-s-copy]').textContent = d.copy;
    el('[data-s-bar]').textContent = d.bar;
    el('[data-s-list]').innerHTML = d.list.map(i => `<li>${i}</li>`).join('');
    img.classList.add('fading');
    clearTimeout(imageTimer);
    imageTimer = setTimeout(() => {
      el('[data-screen-open]').href = d.img; img.src = d.img; img.width = d.w; img.height = d.h; img.alt = d.alt;
      img.parentElement.scrollTop = 0;
      img.classList.remove('fading');
    }, 160);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(tabs[e.key === 'Home' ? 0 : tabs.length - 1], true); return; }
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.focus(); } });
  const config = window.FLUXO_CONFIG || {};
  const analyticsEnabled = Boolean(config.analytics?.scriptUrl && config.analytics?.websiteId) && navigator.doNotTrack !== '1';
  const pendingEvents = [];
  const track = (name, props = {}) => {
    // Nunca enviar conteúdo do formulário, contato ou nome para analytics.
    if (navigator.doNotTrack === '1') return;
    try {
      if (window.umami?.track) window.umami.track(name, props);
      else if (analyticsEnabled && pendingEvents.length < 30) pendingEvents.push({ name, props });
    } catch { /* Analytics não bloqueia o contato. */ }
  };
  if (analyticsEnabled) {
    const analytics = document.createElement('script');
    analytics.src = config.analytics.scriptUrl;
    analytics.defer = true;
    analytics.dataset.websiteId = config.analytics.websiteId;
    analytics.dataset.doNotTrack = 'true';
    analytics.addEventListener('load', () => {
      pendingEvents.splice(0).forEach(event => track(event.name, event.props));
    });
    document.head.append(analytics);
  }
  const form = document.querySelector('.pilot-form');
  const contact = form.elements.contato;
  const submit = form.querySelector('[type=submit]');
  const status = form.querySelector('[data-form-status]');
  const alternative = form.querySelector('[data-email-alternative]');
  const interest = form.elements.interesse;
  const title = form.querySelector('[data-form-title]');
  const endpoint = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(config.formEndpoint || '') ? config.formEndpoint : '';
  if (endpoint) form.action = endpoint;
  else submit.textContent = 'Preparar pedido por e-mail';
  const setStatus = message => { status.hidden = false; status.textContent = message; };
  const verification = form.querySelector('[data-verification-status]');
  const widget = form.querySelector('[data-turnstile]');
  let verificationToken = '', widgetId;
  const verificationStatus = message => { verification.hidden = false; verification.textContent = message; };
  const clearVerification = message => { verificationToken = ''; verificationStatus(message); };
  if (endpoint) {
    verificationStatus('Aguarde a verificação de segurança antes de enviar.');
    if (config.turnstileSiteKey) {
      widget.hidden = false;
      const challenge = document.createElement('script');
      challenge.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      challenge.async = true;
      challenge.addEventListener('load', () => {
        try {
          widgetId = window.turnstile.render(widget, {
            sitekey: config.turnstileSiteKey, size: 'flexible',
            callback: token => { verificationToken = token; verificationStatus('Verificação concluída. Você pode enviar o pedido.'); },
            'expired-callback': () => clearVerification('A verificação expirou. Aguarde uma nova verificação antes de enviar.'),
            'error-callback': () => { clearVerification('A verificação falhou. Recarregue a página ou use o link de e-mail abaixo.'); return true; }
          });
        } catch { clearVerification('Não foi possível iniciar a verificação. Use o link de e-mail abaixo.'); }
      });
      challenge.addEventListener('error', () => clearVerification('Não foi possível carregar a verificação. Recarregue a página ou use o link de e-mail abaixo.'));
      document.head.append(challenge);
    } else verificationStatus('O formulário está indisponível. Use o link de e-mail abaixo.');
  }
  const validContact = value => {
    const v = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
    if (!/^\+?[\d\s().-]+$/.test(v)) return false;
    const digits = v.replace(/\D/g, '');
    return /^(?:55)?[1-9][0-9][2-9][0-9]{7,8}$/.test(digits);
  };
  const validateContact = () => {
    if (contact.value.trim().toLowerCase() === 'contato@officina404.com.br') {
      contact.setCustomValidity('Informe seu próprio e-mail ou telefone para que possamos responder.');
      return;
    }
    contact.setCustomValidity(contact.value && !validContact(contact.value) ? 'Informe um e-mail válido ou um telefone com DDD.' : '');
  };
  contact.addEventListener('input', validateContact);
  const validateName = () => form.elements.nome.setCustomValidity(form.elements.nome.value.trim() ? '' : 'Informe seu nome.');
  form.elements.nome.addEventListener('input', validateName);
  const mailLink = () => {
    const body = ['Nome: ' + form.elements.nome.value.trim(), 'Contato: ' + contact.value.trim(), 'Interesse: ' + interest.value, '', form.elements.cenario.value.trim()].join('\n');
    alternative.href = 'mailto:contato@officina404.com.br?subject=' + encodeURIComponent(interest.value === 'ficha-r1' ? 'Ficha técnica do R1' : 'Piloto Fluxo') + '&body=' + encodeURIComponent(body);
    return alternative.href;
  };
  document.querySelectorAll('a[href="#piloto"]').forEach(link => link.addEventListener('click', () => {
    interest.value = link.dataset.interest || 'piloto';
    title.textContent = interest.value === 'ficha-r1' ? 'Pedir a ficha técnica do R1' : 'Conversar sobre um piloto';
    track('cta_click', { interest: interest.value });
    mailLink();
  }));
  form.addEventListener('input', mailLink);
  alternative.addEventListener('click', () => { mailLink(); track('email_alternative'); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { track('form_view'); observer.disconnect(); }
    }, { threshold: .25 });
    observer.observe(form);
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    validateContact();
    validateName();
    if (!form.reportValidity()) return;
    mailLink();
    if (!endpoint) {
      setStatus('Seu pedido foi preparado. Clique no link de e-mail abaixo e envie a mensagem pelo seu aplicativo. O pedido ainda não foi enviado.');
      alternative.textContent = 'Abrir e-mail com meu pedido';
      track('email_prepared');
      alternative.focus();
      return;
    }
    if (!verificationToken) {
      setStatus('Conclua a verificação de segurança antes de enviar. Se ela não carregar, use o link de e-mail abaixo.');
      return;
    }
    track('form_submit');
    submit.disabled = true;
    submit.textContent = 'Enviando…';
    form.setAttribute('aria-busy', 'true');
    setStatus('Enviando seu pedido…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const data = new FormData(form);
      data.set('cf-turnstile-response', verificationToken);
      data.set('nome', form.elements.nome.value.trim());
      data.set('contato', contact.value.trim());
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value.trim())) data.set('email', contact.value.trim());
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Submission failed');
      track('lead_received', { interest: interest.value });
      form.reset();
      title.textContent = 'Conversar sobre um piloto';
      alternative.href = 'mailto:contato@officina404.com.br';
      alternative.textContent = 'Escreva para contato@officina404.com.br';
      setStatus('Pedido recebido. A Officina404 entrará em contato pelo e-mail ou telefone informado.');
    } catch {
      track('form_error');
      setStatus('Não conseguimos confirmar o recebimento. Seus dados foram mantidos. Tente novamente ou envie seu pedido pelo link de e-mail abaixo.');
      alternative.textContent = 'Enviar meu pedido por e-mail';
    } finally {
      clearTimeout(timeout);
      submit.disabled = false;
      submit.textContent = 'Enviar pedido';
      form.removeAttribute('aria-busy');
      clearVerification('Aguarde uma nova verificação para enviar outro pedido.');
      if (widgetId !== undefined) {
        try { window.turnstile.reset(widgetId); }
        catch { verificationStatus('Recarregue a página para verificar novamente ou use o link de e-mail abaixo.'); }
      }
    }
  });
  select(tabs[0]);
})();
