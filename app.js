'use strict';
const $ = id => document.getElementById(id);
let mode = 'duration', unit = 'minutes', pending = null, sending = false;
function status(text, error = false) {
  $('status').textContent = text; $('status').hidden = false;
  $('status').className = 'status' + (error ? ' error' : '');
}
function updateAmount() {
  $('duration').max = unit === 'hours' ? 24 : 60;
  if (Number($('duration').value) > Number($('duration').max)) $('duration').value = $('duration').max;
  $('amount').textContent = $('duration').value;
  $('unit-label').textContent = unit === 'hours' ? 'h' : 'min';
  $('equivalent').textContent = unit === 'hours'
    ? 'Equivale a ' + Number($('duration').value) * 60 + ' minutos.'
    : 'Entre 1 y 60 minutos.';
}
function invalidate() { pending = null; $('review').hidden = true; }
function lock(value) {
  sending = value;
  for (const el of $('form').querySelectorAll('input,textarea,select,button')) el.disabled = value;
  $('send').textContent = value ? 'Enviando…' : 'Enviar aviso a GROS';
}
const endpoint = window.AORA_CONFIG?.endpoint || '';
let endpointReady = false;
try { const url = new URL(endpoint); endpointReady = url.protocol === 'https:' && !url.username && !url.password; } catch {}
$('setup').hidden = endpointReady;
const initial = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(Date.now()+60000));
$('start').value = initial.replace(' ', 'T');
$('modes').addEventListener('click', event => {
  const button = event.target.closest('[data-mode]'); if (!button || sending) return;
  mode = button.dataset.mode;
  for (const b of $('modes').children) b.setAttribute('aria-pressed', String(b === button));
  $('end-fields').hidden = mode !== 'end'; $('end').required = mode === 'end';
  $('duration-fields').hidden = mode !== 'duration'; invalidate();
});
$('units').addEventListener('click', event => {
  const button = event.target.closest('[data-unit]'); if (!button || sending) return;
  unit = button.dataset.unit;
  for (const b of $('units').children) b.setAttribute('aria-pressed', String(b === button));
  updateAmount(); invalidate();
});
$('duration').addEventListener('input', updateAmount);
for (const id of ['text','start','end','duration']) $(id).addEventListener('input', invalidate);
$('edit').addEventListener('click', () => { invalidate(); $('text').focus(); });
$('form').addEventListener('submit', event => {
  event.preventDefault(); if (sending) return;
  const text = $('text').value.trim(), duration = Number($('duration').value) * (unit === 'hours' ? 60 : 1);
  if (!text || /^\s*(?:Inicio|Fin|Fecha.*|Duraci[oó]n(?: en minutos)?)\s*:/im.test(text)) {
    status('Escribe el aviso sin líneas de programación como Inicio:, Fin: o Duración:.',true); return;
  }
  if (mode === 'end' && $('end').value <= $('start').value) {
    status('El final debe ser posterior al comienzo.',true); return;
  }
  if (!crypto.randomUUID) { status('Abre el formulario mediante HTTPS para continuar.',true); return; }
  pending = {requestId:crypto.randomUUID(),notice:{text,start:$('start').value,end:$('end').value,mode,duration}};
  $('summary').textContent = text + '\n\nInicio: ' + pending.notice.start.replace('T',' ') +
    '\n' + (mode === 'end' ? 'Fin: ' + pending.notice.end.replace('T',' ') : 'Duración: ' + $('duration').value + (unit === 'hours' ? ' h' : ' min'));
  $('review').hidden = false; $('status').hidden = true; $('send').disabled = !endpointReady;
  $('review').scrollIntoView({behavior:'smooth',block:'nearest'}); $('key').focus();
});
$('send').addEventListener('click', async () => {
  if (sending || !pending || !endpointReady) return;
  if ($('key').value.length < 32) { status('Introduce la clave de acceso de GROS (al menos 32 caracteres).',true); return; }
  lock(true);
  try {
    const response = await fetch(endpoint, {
      method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+$('key').value},
      body:JSON.stringify(pending),signal:AbortSignal.timeout(20000)
    });
    const data = await response.json();
    if (!response.ok || data.accepted !== true) throw Error(data.error || 'GROS no ha aceptado la solicitud.');
    $('key').value = ''; pending = null; $('review').hidden = true;
    status('GROS ha aceptado la solicitud para enviarla por correo a SERT. Comprueba después la lista de avisos del dashboard.');
  } catch (error) {
    status(error.name === 'TypeError' || error.name === 'TimeoutError'
      ? 'No se pudo confirmar la respuesta de GROS. Revisa la conexión. Puedes reintentar este mismo aviso; conserva su identificador para evitar duplicados.'
      : error.message,true);
  } finally { lock(false); }
});
