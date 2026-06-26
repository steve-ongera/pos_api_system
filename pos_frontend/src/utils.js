export const fmt = {
  money: (v) => `KSh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
  date: (v) => new Date(v).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }),
  datetime: (v) => new Date(v).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  time: (v) => new Date(v).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
};

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function confirm_modal(message) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:360px">
          <div class="modal-header">
            <span class="modal-title">Confirm</span>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="c-cancel">Cancel</button>
            <button class="btn btn-danger" id="c-ok">Confirm</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(overlay);
    const remove = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('#c-ok').onclick = () => remove(true);
    overlay.querySelector('#c-cancel').onclick = () => remove(false);
    overlay.onclick = (e) => { if (e.target === overlay) remove(false); };
  });
}
