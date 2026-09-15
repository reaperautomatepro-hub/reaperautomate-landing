'use strict';

// As abas aceitam clique, setas, Home e End.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
  });
});
const compactTabs = window.matchMedia('(max-width: 800px)');
function syncTabOrientation() {
  document.querySelector('[role="tablist"]').setAttribute('aria-orientation', compactTabs.matches ? 'horizontal' : 'vertical');
}
compactTabs.addEventListener('change', syncTabOrientation);
syncTabOrientation();

// Dialog nativo: foco contido, Escape e retorno ao botão de origem.
const dialog = document.getElementById('screenshot-dialog');
const dialogImage = document.getElementById('screenshot-image');
const dialogCaption = document.getElementById('screenshot-caption');
let lastTrigger;
document.querySelectorAll('[data-zoom]').forEach((button) => {
  button.addEventListener('click', () => {
    lastTrigger = button;
    dialogImage.src = button.dataset.zoom;
    dialogImage.alt = button.querySelector('img').alt;
    dialogCaption.textContent = button.dataset.caption;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  });
});
dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  if (lastTrigger) lastTrigger.focus({ preventScroll: true });
});

// Mantém o contrato e os pisos da landing anterior. Falhas não ocupam espaço.
async function loadStats() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://assistente.reaperautomate.com/api/scale-stats', { signal: controller.signal });
    if (!response.ok) return;
    const data = await response.json();
    if (!data || !data.ok) return;
    const metrics = [
      { stat: data.users, min: 10, label: 'pessoas cadastradas' },
      { stat: data.schedules, min: 10, label: 'escalas geradas' },
      { stat: data.minutes, min: 60, label: 'minutos de estudo no player' },
    ].filter(({ stat, min }) => stat && Number.isFinite(stat.value) && stat.value >= min);
    if (!metrics.length) return;
    const row = document.getElementById('statsRow');
    metrics.forEach(({ stat, label }) => {
      const block = document.createElement('div');
      block.className = 'stat';
      const number = document.createElement('div');
      number.className = 'stat-n';
      number.textContent = Math.floor(stat.value).toLocaleString('pt-BR') + (stat.plus ? '+' : '');
      const caption = document.createElement('div');
      caption.className = 'stat-l';
      caption.textContent = label;
      block.append(number, caption);
      row.append(block);
    });
    document.getElementById('statsband').hidden = false;
  } catch (_) {
    // A página permanece completa se o serviço de estatísticas falhar.
  } finally {
    window.clearTimeout(timeout);
  }
}
loadStats();
