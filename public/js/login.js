(function () {
  'use strict';
  const { $, api } = window.CC;
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#err'); err.classList.add('hidden');
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      await api('/api/admin/login', { method: 'POST', body: { username: $('#u').value.trim(), password: $('#p').value } });
      location.href = '/admin/';
    } catch (ex) {
      err.textContent = ex.message; err.classList.remove('hidden'); btn.disabled = false; $('#p').value = ''; $('#p').focus();
    }
  });
})();
