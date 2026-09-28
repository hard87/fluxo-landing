const cases = {
  ambiente: {
    number: "01 / AMBIENTES",
    title: "Acompanhe condições críticas ao longo do tempo.",
    copy: "Temperatura e umidade ganham contexto, histórico e limites definidos conforme a necessidade da operação.",
    measure: "Temperatura e umidade",
    detect: "Desvios e permanência fora do limite",
    outcome: "Evidência para agir e investigar"
  },
  energia: {
    number: "02 / ENERGIA",
    title: "Entenda quando e como o consumo se transforma.",
    copy: "Potência, corrente e outras métricas deixam de ser leituras isoladas e passam a mostrar padrões de uso.",
    measure: "Potência, corrente e consumo, conforme o medidor",
    detect: "Picos, horários e mudanças de comportamento",
    outcome: "Base para eficiência e planejamento"
  },
  equipamentos: {
    number: "03 / EQUIPAMENTOS",
    title: "Observe sinais que antecedem uma ocorrência.",
    copy: "Condições de operação podem ser acompanhadas sem esperar que uma parada seja a primeira evidência do problema.",
    measure: "Temperatura, estados e, conforme o sensor, vibração",
    detect: "Operação fora da faixa esperada",
    outcome: "Contexto para manutenção e resposta"
  },
  processos: {
    number: "04 / PROCESSOS",
    title: "Crie uma memória confiável da operação.",
    copy: "Tempos, estados e variáveis de processo ficam disponíveis para comparação, rastreabilidade e aprendizado.",
    measure: "Estados, ciclos e variáveis relevantes",
    detect: "Variações, atrasos e recorrências",
    outcome: "Rastreabilidade e melhoria contínua"
  }
};

const selectors = {
  number: "[data-case-number]",
  title: "[data-case-title]",
  copy: "[data-case-copy]",
  measure: "[data-case-measure]",
  detect: "[data-case-detect]",
  outcome: "[data-case-outcome]"
};

const tabs = [...document.querySelectorAll("[data-case]")];
const panel = document.querySelector("#case-panel");

const selectCase = (button, { focus = false } = {}) => {
  const selected = cases[button.dataset.case];
  if (!selected) return;
  tabs.forEach((item) => {
    const active = item === button;
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  });
  Object.entries(selectors).forEach(([key, selector]) => {
    document.querySelector(selector).textContent = selected[key];
  });
  panel?.setAttribute("aria-labelledby", button.id);
  if (focus) button.focus();
};

tabs.forEach((button, index) => {
  button.addEventListener("click", () => selectCase(button));
  button.addEventListener("keydown", (event) => {
    const last = tabs.length - 1;
    const target = {
      ArrowRight: tabs[index === last ? 0 : index + 1],
      ArrowDown: tabs[index === last ? 0 : index + 1],
      ArrowLeft: tabs[index === 0 ? last : index - 1],
      ArrowUp: tabs[index === 0 ? last : index - 1],
      Home: tabs[0],
      End: tabs[last]
    }[event.key];
    if (!target) return;
    event.preventDefault();
    selectCase(target, { focus: true });
  });
});

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  navigation.classList.toggle("open", !open);
});
const closeMenu = () => {
  menuButton?.setAttribute("aria-expanded", "false");
  navigation?.classList.remove("open");
};
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation?.classList.contains("open")) {
    closeMenu();
    menuButton?.focus();
  }
});
document.addEventListener("click", (event) => {
  if (navigation?.classList.contains("open") && !event.target.closest(".header-inner")) closeMenu();
});

const header = document.querySelector("[data-header]");
const updateHeader = () => header?.classList.toggle("scrolled", window.scrollY > 12);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

document.querySelector("[data-year]").textContent = new Date().getFullYear();
