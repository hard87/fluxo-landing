// Configuração pública da landing (V5). Nunca coloque senhas ou chaves privadas neste arquivo.
// Mesmos serviços de fluxo.officina404.com.br (Formspree + Turnstile + Umami).
// A chave do Turnstile é vinculada ao domínio de produção: em localhost o widget pode não carregar
// e o formulário cai no link de e-mail e no WhatsApp (comportamento esperado fora do domínio).
// WhatsApp aqui é canal de CONTATO comercial. Não é canal de alerta do Fluxo.
window.FLUXO_CONFIG = {
  formEndpoint: 'https://formspree.io/f/xppqrrej', // Piloto Fluxo → contato@officina404.com.br (Zoho Mail).
  turnstileSiteKey: '0x4AAAAAAFTI0quwZ0DAwGpE', // Pública. A chave secreta fica apenas no Formspree.
  whatsapp: {
    number: '5549988079237', // (49) 98807-9237
    message: 'Olá! Vim pela página do Fluxo e quero conversar sobre o diagnóstico de 30 dias.'
  },
  email: 'contato@officina404.com.br',
  city: 'Lages',
  // Vagas do ciclo: use um número inteiro só quando a quantidade estiver confirmada.
  // null mantém o convite neutro, sem número; 0 mostra "lista de espera".
  diagnosticSlots: null,
  analytics: {
    scriptUrl: 'https://cloud.umami.is/script.js',
    websiteId: '4d6c384b-8ebb-4c10-a4da-87c8f50fb3bf',
    domains: 'fluxo.officina404.com.br'
  }
};
