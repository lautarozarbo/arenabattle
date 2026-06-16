export function showConfirm(msg, okLabel = 'Eliminar') {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-dialog');
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-ok').textContent = okLabel;
    overlay.classList.remove('hidden');
    const ok     = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = result => {
      overlay.classList.add('hidden');
      ok.onclick     = null;
      cancel.onclick = null;
      overlay.onclick = null;
      resolve(result);
    };
    ok.onclick      = () => cleanup(true);
    cancel.onclick  = () => cleanup(false);
    overlay.onclick = e => { if (e.target === overlay) cleanup(false); };
  });
}
