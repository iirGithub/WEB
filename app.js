'use strict';
const $ = id => document.getElementById(id);
let mode = 'duration', unit = 'minutes', pending = null;
function status(text, error = false) {
  $('status').textContent = text; $('status').hidden = false;
  $('status').className = 'status' + (error ? ' error' : '');
}
function invalidate() { pending = null; $('review').hidden = true; $('send').removeAttribute('href'); }
function updateAmount() {
  $('duration').max = unit === 'hours' ? 24 : 60;
  $('amount').textContent = $('duration').value;
  $('unit-label').textContent = unit === 'hours' ? 'h' : 'min';
  $('equivalent').textContent = unit === 'hours'
    ? 'Equivale a ' + Number($('duration').value) * 60 + ' minutos.'
    : 'Entre 1 y 60 minutos.';
}
function madridDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const [y,m,d,h,min] = value.match(/\d+/g).map(Number);
  const wall = Date.UTC(y,m-1,d,h,min);
  const formatter = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const offsets = new Set([-36,0,36].map(hours=>{
    const sample = new Date(wall + hours*3600000);
    const p = Object.fromEntries(formatter.formatToParts(sample).map(x=>[x.type,x.value]));
    return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-sample.getTime();
  }));
  const candidates = [...offsets].map(offset=>wall-offset).filter(ms=>formatter.format(new Date(ms)).replace(' ','T')===value);
  return candidates.length ? Math.min(...candidates) : NaN;
}
function prepareNotice(n, recipient) {
  if (!/^[^\s@<>:,;?]+@[^\s@<>:,;?]+\.[^\s@<>:,;?]+$/.test(recipient)) throw Error('Introduce el correo de destino.');
  const text = n.text.trim(), start = madridDate(n.start);
  if (!text || text.length>2000 || /^\s*(?:Inicio|Fin|Fecha.*|Duraci[oó]n(?: en minutos)?)\s*:/im.test(text)) throw Error('Escribe el aviso sin líneas de programación como Inicio:, Fin: o Duración:.');
  const duration = Number(n.duration) * (n.unit==='hours'?60:1);
  if (!['duration','end'].includes(n.mode)) throw Error('Selecciona cómo finalizar el aviso.');
  if(n.mode==='duration' && (!['minutes','hours'].includes(n.unit) || !Number.isInteger(Number(n.duration)) || Number(n.duration)<1 || Number(n.duration)>(n.unit==='hours'?24:60))) throw Error('Selecciona una duración válida.');
  const end = n.mode==='end' ? madridDate(n.end) : start+duration*60000;
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end<=Date.now()) throw Error('Revisa las fechas: el final debe ser posterior al comienzo y a la hora actual.');
  const body='Inicio: '+n.start.replace('T',' ')+'\r\n'+(n.mode==='end'?'Fin: '+n.end.replace('T',' '):'Duración: '+duration)+'\r\n\r\n'+text;
  const subject='Aviso de pantalla';
  return {recipient,subject,body,url:'mailto:'+encodeURIComponent(recipient).replace(/%40/g,'@')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
}
$('recipient').value = 'rosapersonal@gmail.com';
const initial = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(Date.now()+60000));
$('start').value = initial.replace(' ', 'T');
$('modes').addEventListener('click', event => {
  const button = event.target.closest('[data-mode]'); if (!button) return;
  mode = button.dataset.mode;
  for (const b of $('modes').children) b.setAttribute('aria-pressed', String(b === button));
  $('end-fields').hidden = mode !== 'end'; $('end').required = mode === 'end';
  $('duration-fields').hidden = mode !== 'duration'; invalidate();
});
$('units').addEventListener('click', event => {
  const button = event.target.closest('[data-unit]'); if (!button) return;
  unit = button.dataset.unit;
  for (const b of $('units').children) b.setAttribute('aria-pressed', String(b === button));
  updateAmount(); invalidate();
});
$('duration').addEventListener('input', updateAmount);
for (const id of ['recipient','text','start','end','duration']) $(id).addEventListener('input', invalidate);
$('edit').addEventListener('click', () => { invalidate(); $('text').focus(); });
$('form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    pending=prepareNotice({text:$('text').value,start:$('start').value,end:$('end').value,mode,unit,duration:$('duration').value},$('recipient').value.trim());
    $('summary').textContent='Para: '+pending.recipient+'\nAsunto: '+pending.subject+'\n\n'+pending.body;
    $('send').href=pending.url;
    $('review').hidden=false; $('status').hidden=true;
    $('review').scrollIntoView({behavior:'smooth',block:'nearest'}); $('send').focus();
  } catch(error) { invalidate(); status(error.message,true); }
});
$('send').addEventListener('click', event => {
  if(!pending){event.preventDefault();return;}
  status('Se ha solicitado abrir tu aplicación de correo. Allí debes pulsar Enviar. Si no se abre, utiliza «Copiar correo». El aviso todavía no está confirmado en SERT.');
});
$('copy').addEventListener('click', async () => {
  if(!pending)return;
  try {
    await navigator.clipboard.writeText($('summary').textContent);
    status('Correo copiado. Pégalo en tu aplicación de correo y comprueba destinatario y asunto antes de enviarlo.');
  } catch { status('No se pudo copiar automáticamente. Selecciona y copia el texto de la revisión.',true); }
});
