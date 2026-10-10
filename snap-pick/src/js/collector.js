import { pageIn, staggerIn, countUp } from './animations.js';
import { api } from './api.js';
import { WASTE_TYPES, STATUS } from './config.js';
import { todayISO, addDaysISO } from './validators.js';
import { orderStops } from './route.js';
import { requireRole } from './auth.js';
const session = requireRole('collector');
import { renderNavbar, toast, statusBadge, esc, photoThumb, initPhotoViewer, icon } from './ui.js';

renderNavbar('collector');
pageIn();
initPhotoViewer();
const $ = (id) => document.getElementById(id);
const KEY = 'apex_collector_id';
let first = true;

const emptyState = (t) => `<div class="card text-center text-sm text-slate-500">${t}</div>`;

const line = (ic, content, extra = 'text-slate-600') => `
  <p class="mt-0.5 flex items-start gap-2 text-sm ${extra}">
    <span class="mt-0.5 shrink-0 text-brand-dark">${icon(ic, 'h-3.5 w-3.5')}</span>
    <span>${content}</span>
  </p>`;

function stop(r, i) {
    const open = r.status === STATUS.SCHEDULED;
    return `
    <li class="stop rounded-2xl border border-white/70 bg-white/40 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex gap-3">
          ${photoThumb(r, 'h-20 w-20')}
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand-dark">${i + 1}</span>
          <div>
            <p class="font-semibold">${esc(r.householdName)} <span class="text-xs font-normal text-slate-400">${esc(r.id)}</span></p>
            ${line('pin', esc(r.address))}
            ${line('recycle', `${esc(WASTE_TYPES[r.wasteType] ?? r.wasteType)} &middot; ${esc(r.quantityKg)} kg`)}
            ${line('phone', `<a class="font-medium text-brand-dark hover:underline" href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`)}
            ${r.notes ? line('note', esc(r.notes), 'text-slate-500') : ''}
          </div>
        </div>
        ${statusBadge(r.status)}
      </div>
      ${open ? `
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn-ghost !px-3 !py-1.5 !text-rose-600" data-miss="${esc(r.id)}">Missed</button>
          <button class="btn-primary !px-3 !py-1.5" data-done="${esc(r.id)}">${icon('check')}Collected</button>
        </div>` : ''}
    </li>`;
}

function renderSummary(slots) {
    const stops = slots.flatMap((s) => s.requests);
    const items = [
        ['Stops', stops.length, 'text-ink'],
        ['Remaining', stops.filter((r) => r.status === STATUS.SCHEDULED).length, 'text-sky-700'],
        ['Collected', stops.filter((r) => r.status === STATUS.COLLECTED).length, 'text-emerald-700'],
        ['Missed', stops.filter((r) => r.status === STATUS.MISSED).length, 'text-rose-600'],
    ];
    $('summary').innerHTML = items.map(([label, , color], i) => `
    <div class="sum-card card !p-4">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">${label}</p>
      <p class="mt-1 text-3xl font-extrabold tracking-tight ${color}" id="sum${i}">0</p>
    </div>`).join('');
    items.forEach(([, n], i) => {
        const el = $(`sum${i}`);
        first ? countUp(el, n, 0.6) : (el.textContent = n);
    });
}

async function load() {
    const collectorId = $('collectorSel').value;
    const date = $('dateSel').value;
    if (!collectorId || !date) return;

    try {
        const slots = await api.getCollectorSchedule(collectorId, date);

        renderSummary(slots);

        if (!slots.length) {
            $('schedule').innerHTML = emptyState('No pickups assigned for this date. The dispatcher may not have run the scheduler yet.');
            first = false;
            return;
        }

        $('schedule').innerHTML = slots.map((s) => {
            const opt = $('optRoute').checked;
            const { stops: reqs, km, kmFifo } = orderStops(s.requests, opt);
            const saved = kmFifo - km;
            const done = reqs.filter((r) => r.status === STATUS.COLLECTED).length;
            return `
        <section class="slot card">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
                <span class="text-brand-dark">${icon('truck', 'h-5 w-5')}</span>
                ${esc(s.vehicleName)} &middot; ${esc(s.area)}
              </h2>
              <p class="mt-1 text-sm text-slate-500">Load ${esc(s.allocatedKg)} / ${esc(s.capacityKg)} kg</p>
              <p class="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                ${icon('route', 'h-3.5 w-3.5')}
                <span>Route &asymp; ${km.toFixed(1)} km${opt && saved > 0.05 ? ` &middot; <span class="text-emerald-700">saves ${saved.toFixed(1)} km vs first-come order</span>` : ''}</span>
              </p>
            </div>
            <p class="rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-slate-600">${done} / ${reqs.length} done</p>
          </div>
          <ol class="mt-4 space-y-3">${reqs.map(stop).join('')}</ol>
        </section>`;
        }).join('');

        if (first) staggerIn('.stop');
        first = false;
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------- Init ---------- */
async function init() {
    try {
        const collectors = await api.getCollectors();
        $('collectorSel').innerHTML = collectors
            .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
            .join('');

        // a collector sees only their own schedule
        $('collectorSel').value = session.id;
        $('collectorSel').disabled = true;

        $('dateSel').value = addDaysISO(1);   // demo data is scheduled for tomorrow
        await load();
    } catch (err) {
        toast(err.message, 'error');
    }
}

$('collectorSel').addEventListener('change', () => {
    localStorage.setItem(KEY, $('collectorSel').value);
    first = true;
    load();
});
$('dateSel').addEventListener('change', () => { first = true; load(); });
$('todayBtn').addEventListener('click', () => { $('dateSel').value = todayISO(); first = true; load(); });
$('tomorrowBtn').addEventListener('click', () => { $('dateSel').value = addDaysISO(1); first = true; load(); });
$('optRoute').addEventListener('change', load);

/* ---------- Mark collected / missed (event delegation) ---------- */
$('schedule').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-done],[data-miss]');
    if (!btn) return;

    const isDone = btn.hasAttribute('data-done');
    const id = isDone ? btn.dataset.done : btn.dataset.miss;
    if (!isDone && !confirm('Mark this pickup as missed?')) return;

    btn.disabled = true;
    try {
        await api.updateStatus(id, isDone ? STATUS.COLLECTED : STATUS.MISSED);
        toast(isDone ? 'Marked as collected' : 'Marked as missed. The dispatcher can reschedule it', isDone ? 'success' : 'warning');
    } catch (err) {
        toast(err.message, 'error');
    }
    load();
});

init();