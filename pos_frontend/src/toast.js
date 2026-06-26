let container;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = 3000) {
  const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
  getContainer().appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, duration);
}
