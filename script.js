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
  const form = document.querySelector('.pilot-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const alvo = f.getAll('alvo').join(', ') || 'não informado';
    const body = [
      'Nome: ' + (f.get('nome') || ''),
      'Empresa: ' + (f.get('empresa') || ''),
      'Contato: ' + (f.get('contato') || ''),
      'O que quer monitorar: ' + alvo,
      'Já tem sensores instalados: ' + (f.get('sensores') || 'não informado'),
      '',
      'O que acontece hoje quando algo sai do limite:',
      f.get('cenario') || ''
    ].join('\n');
    const subject = 'Piloto Fluxo' + (f.get('empresa') ? ' - ' + f.get('empresa') : '');
    const status = form.querySelector('[data-form-status]');
    status.hidden = false;
    status.textContent = 'Abrindo o seu aplicativo de e-mail. Se nada abrir, escreva para contato@officina404.com.br.';
    window.location.href = 'mailto:contato@officina404.com.br?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
  select(tabs[0]);
  Object.values(screens).forEach(d => { const p = new Image(); p.src = d.img; });
})();

