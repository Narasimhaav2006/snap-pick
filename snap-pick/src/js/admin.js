import { pageIn, staggerIn, countUp, fillBar } from './animations.js';
import { api } from './api.js';
import { AREAS, WASTE_TYPES, STATUS, CANCELLABLE, MAX_ADVANCE_DAYS } from './config.js';
import { addDaysISO, todayISO } from './validators.js';
import { requireRole } from './auth.js';
requireRole('admin');
import { renderNavbar, toast, statusBadge, esc, photoThumb, initPhotoViewer, icon } from './ui.js';

renderNavbar('admin');
pageIn();
initPhotoViewer();

const $ = (id) => document.getElementById(id);
const fmtDate = (iso) =>
    iso ? new Date(iso + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
const emptyState = (t) => `<div class="card text-center text-sm text-slate-500">${t}</div>`;

let requests = [];
let slots = [];
let first = true;   // animate only on the first load, so later refreshes don't flicker

/* ---------- Stats ---------- */
const STAT_DEFS = [
    { key: 'ALL', label: 'Total', color: 'text-ink' },
    { key: STATUS.PENDING, label: 'Pending', color: 'text-amber-600' },
    { key: STATUS.SCHEDULED, label: 'Scheduled', color: 'text-sky-700' },
    { key: STATUS.WAITLISTED, label: 'Waitlisted', color: 'text-orange-600' },
    { key: STATUS.COLLECTED, label: 'Collected', color: 'text-emerald-700' },
    { key: STATUS.MISSED, label: 'Missed', color: 'text-rose-600' },
];

function renderStats() {
    $('stats').innerHTML = STAT_DEFS.map((s) => `
    <div class="stat-card card !p-4">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">${s.label}</p>
      <p class="mt-1 text-3xl font-extrabold tracking-tight ${s.color}" data-stat="${s.key}">0</p>
    </div>`).join('');

    STAT_DEFS.forEach((s) => {
        const n = s.key === 'ALL' ? requests.length : requests.filter((r) => r.status === s.key).length;
        const el = document.querySelector(`[data-stat="${s.key}"]`);
        first ? countUp(el, n, 0.8) : (el.textContent = n);
    });
    if (first) staggerIn('.stat-card');
}

/* ---------- Slots + capacity bars ---------- */
function renderSlots() {
    const el = $('slotList');
    if (!slots.length) {
        el.innerHTML = `<div class="md:col-span-2 lg:col-span-3">${emptyState('No slots yet. Click "Run scheduler" to assign pending requests.')}</div>`;
        return;
    }

    el.innerHTML = slots.map((s) => {
        const pct = Math.round((s.allocatedKg / s.capacityKg) * 100);
        const bar = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand';
        const tag = s.status === 'FULL'
            ? 'bg-rose-100/80 text-rose-800 ring-rose-300/60'
            : 'bg-emerald-100/80 text-emerald-800 ring-emerald-300/60';
        return `
      <article class="slot-card card">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-xs font-semibold tracking-wide text-slate-400">${fmtDate(s.date)}</p>
            <h3 class="font-bold tracking-tight">${esc(s.vehicleName)} &middot; ${esc(s.area)}</h3>
          </div>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${tag}">${esc(s.status)}</span>
        </div>
        <p class="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <span class="text-brand-dark">${icon('user')}</span>
          <span>${esc(s.collectorName)} &middot; ${s.requestCount} request(s)</span>
        </p>
        <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-white/60 ring-1 ring-inset ring-white/70">
          <div class="cap-bar h-full rounded-full ${bar}" data-pct="${pct}"></div>
        </div>
        <p class="mt-1.5 text-xs text-slate-500">${s.allocatedKg} / ${s.capacityKg} kg (${pct}%)</p>
      </article>`;
    }).join('');

    el.querySelectorAll('.cap-bar').forEach((b) => {
        const pct = Number(b.dataset.pct);
        first ? fillBar(b, pct) : (b.style.width = `${Math.min(pct, 100)}%`);
    });
    if (first) staggerIn('.slot-card');
}

/* ---------- Waitlist + missed ---------- */
function renderAttention() {
    const waiting = requests.filter((r) => r.status === STATUS.WAITLISTED);
    const missed = requests.filter((r) => r.status === STATUS.MISSED);
    $('waitCount').textContent = waiting.length ? `(${waiting.length})` : '';
    $('missedCount').textContent = missed.length ? `(${missed.length})` : '';

    $('waitList').innerHTML = waiting.length
        ? waiting.map((r) => `
      <div class="flex gap-3 rounded-2xl border border-orange-300/60 bg-orange-100/60 p-3 text-sm">
        ${photoThumb(r, 'h-12 w-12')}
        <div class="min-w-0 flex-1">
          <div class="flex justify-between gap-2">
            <p class="font-semibold">${esc(r.householdName)} &middot; ${esc(WASTE_TYPES[r.wasteType] ?? r.wasteType)} &middot; ${esc(r.quantityKg)} kg</p>
            <span class="text-xs text-slate-500">${esc(r.area)}</span>
          </div>
          <p class="mt-1 text-xs text-orange-800">${esc(r.remark)}</p>
        </div>
      </div>`).join('')
        : '<p class="text-sm text-slate-500">Nothing waitlisted. All requests have a slot.</p>';

    $('missedList').innerHTML = missed.length
        ? missed.map((r) => `
      <div class="flex gap-3 rounded-2xl border border-rose-300/60 bg-rose-100/60 p-3 text-sm">
        ${photoThumb(r, 'h-12 w-12')}
        <div class="min-w-0 flex-1">
        <p class="font-semibold">${esc(r.householdName)} &middot; ${esc(r.area)} &middot; ${esc(r.quantityKg)} kg</p>
        <p class="text-xs text-slate-600">${esc(r.address)} &middot; was due ${fmtDate(r.scheduledDate ?? r.preferredDate)}</p>
        <div class="mt-2 flex items-center gap-2">
          <input type="date" class="input !py-1.5" data-date-for="${esc(r.id)}"
                 value="${addDaysISO(1)}" min="${todayISO()}" max="${addDaysISO(MAX_ADVANCE_DAYS)}" />
          <button class="btn-primary !px-3 !py-1.5 shrink-0" data-reschedule="${esc(r.id)}">Reschedule</button>
        </div>
        </div>
      </div>`).join('')
        : '<p class="text-sm text-slate-500">No missed pickups.</p>';
}

/* ---------- Grouped requests (by preferred date + area) ---------- */
function driverCell(slot) {
    if (!slot) return '<span class="text-xs text-slate-400">Not assigned</span>';
    return `<span class="inline-flex items-center gap-1.5 font-medium">
              <span class="text-brand-dark">${icon('user', 'h-3.5 w-3.5')}</span>${esc(slot.collectorName)}
            </span>
            <br><span class="text-xs text-slate-500">${esc(slot.vehicleName)}</span>`;
}

function renderGroups() {
    const area = $('fArea').value;
    const status = $('fStatus').value;
    const rows = requests.filter((r) => (!area || r.area === area) && (!status || r.status === status));
    const slotById = new Map(slots.map((s) => [s.id, s]));

    if (!rows.length) {
        $('groups').innerHTML = emptyState('No requests match these filters.');
        return;
    }

    const map = new Map();
    rows.forEach((r) => {
        const k = `${r.preferredDate}|${r.area}`;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
    });

    $('groups').innerHTML = [...map.keys()].sort().map((k) => {
        const [date, areaName] = k.split('|');
        const list = map.get(k);
        const kg = list.filter((r) => r.status !== STATUS.CANCELLED).reduce((n, r) => n + r.quantityKg, 0);

        const trs = list.map((r) => `
      <tr class="border-t border-white/60 align-top">
        <td class="py-2.5 pr-3 font-mono text-xs text-slate-500">${esc(r.id)}</td>
        <td class="py-2.5 pr-3">${esc(r.householdName)}<br><span class="text-xs text-slate-500">${esc(r.phone)}</span></td>
        <td class="py-2.5 pr-3 whitespace-nowrap">${driverCell(slotById.get(r.slotId))}</td>
        <td class="py-2.5 pr-3">${esc(WASTE_TYPES[r.wasteType] ?? r.wasteType)}</td>
        <td class="py-2.5 pr-3">${photoThumb(r, 'h-12 w-12')}</td>
        <td class="py-2.5 pr-3 whitespace-nowrap">${esc(r.quantityKg)} kg</td>
        <td class="py-2.5 pr-3">${statusBadge(r.status)}</td>
        <td class="py-2.5 pr-3 whitespace-nowrap">${fmtDate(r.scheduledDate)}</td>
        <td class="py-2.5 text-right">
          ${CANCELLABLE.includes(r.status)
                ? `<button class="text-xs font-semibold text-rose-600 hover:underline" data-cancel="${esc(r.id)}">Cancel</button>`
                : ''}
        </td>
      </tr>`).join('');

        return `
      <div class="group-card card !p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-2 font-bold tracking-tight">
            <span class="text-brand-dark">${icon('pin', 'h-4 w-4')}</span>${esc(areaName)}
            <span class="font-medium text-slate-400">&middot; ${fmtDate(date)}</span>
          </h3>
          <p class="text-sm text-slate-600">${list.length} request(s) &middot; <b>${kg} kg</b> total</p>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[800px] text-left text-sm">
            <thead class="text-[11px] uppercase tracking-widest text-slate-500">
              <tr><th class="pb-2 pr-3">ID</th><th class="pb-2 pr-3">Household</th><th class="pb-2 pr-3">Driver</th><th class="pb-2 pr-3">Waste</th><th class="pb-2 pr-3">Photo</th>
                  <th class="pb-2 pr-3">Qty</th><th class="pb-2 pr-3">Status</th><th class="pb-2 pr-3">Scheduled</th><th></th></tr>
            </thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    if (first) staggerIn('.group-card');
}

/* ---------- Demand analytics (stretch) ---------- */
function tally(list, keyFn) {
    const m = new Map();
    list.forEach((r) => m.set(keyFn(r), (m.get(keyFn(r)) ?? 0) + r.quantityKg));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function barBlock(title, entries, color) {
    const max = Math.max(...entries.map(([, v]) => v), 1);
    const rows = entries.length
        ? entries.map(([label, kg]) => `
        <div class="mt-3">
          <div class="flex justify-between text-xs"><span class="font-medium">${esc(label)}</span><span class="text-slate-500">${kg} kg</span></div>
          <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-white/60 ring-1 ring-inset ring-white/70">
            <div class="an-bar h-full rounded-full ${color}" data-pct="${Math.round((kg / max) * 100)}"></div>
          </div>
        </div>`).join('')
        : '<p class="mt-3 text-sm text-slate-500">No data yet.</p>';
    return `<div class="an-card card"><h3 class="font-bold tracking-tight">${title}</h3>${rows}</div>`;
}

function renderAnalytics() {
    const live = requests.filter((r) => r.status !== STATUS.CANCELLED);
    $('analytics').innerHTML =
        barBlock('By area (kg)', tally(live, (r) => r.area), 'bg-brand') +
        barBlock('By waste type (kg)', tally(live, (r) => WASTE_TYPES[r.wasteType] ?? r.wasteType), 'bg-sky-500') +
        barBlock('By preferred date (kg)',
            tally(live, (r) => r.preferredDate).sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [fmtDate(d), v]),
            'bg-amber-500');

    document.querySelectorAll('.an-bar').forEach((b) => {
        const pct = Number(b.dataset.pct);
        first ? fillBar(b, pct) : (b.style.width = `${pct}%`);
    });
    if (first) staggerIn('.an-card');
}

/* ---------- Load ---------- */
async function load() {
    try {
        [requests, slots] = await Promise.all([api.getRequests(), api.getSlots()]);
        renderStats();
        renderAnalytics();
        renderSlots();
        renderAttention();
        renderGroups();
        first = false;
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------- Filters ---------- */
$('fArea').innerHTML =
    '<option value="">All areas</option>' + AREAS.map((a) => `<option value="${a}">${a}</option>`).join('');
$('fStatus').innerHTML =
    '<option value="">All statuses</option>' +
    Object.values(STATUS).map((s) => `<option value="${s}">${s}</option>`).join('');
$('fArea').addEventListener('change', renderGroups);
$('fStatus').addEventListener('change', renderGroups);

/* ---------- Actions ---------- */
// Keeps the button's icon: saves its HTML before showing the loading text, restores it afterwards
function busy(btn, on, loadingLabel = '') {
    if (on) {
        btn.dataset.idle = btn.innerHTML;
        btn.textContent = loadingLabel;
    } else if (btn.dataset.idle) {
        btn.innerHTML = btn.dataset.idle;
        delete btn.dataset.idle;
    }
    btn.disabled = on;
    btn.classList.toggle('opacity-60', on);
}

$('runBtn').addEventListener('click', async () => {
    const btn = $('runBtn');
    busy(btn, true, 'Scheduling…');
    try {
        const r = await api.runScheduler($('schedDate').value || null);
        toast(
            `Processed ${r.processed}: ${r.scheduled} scheduled (${r.moved} moved), ${r.waitlisted} waitlisted`,
            r.waitlisted ? 'warning' : 'success'
        );
        await load();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        busy(btn, false);
    }
});

$('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset all demo data? This deletes every request and slot.')) return;
    if (!api.resetDemo) return toast('Reset is only available in mock mode', 'info');
    await api.resetDemo();
    $('schedDate').value = '';
    first = true;
    toast('Demo data reset', 'info');
    load();
});

// one delegated listener for cancel and reschedule buttons
document.addEventListener('click', async (e) => {
    const cancel = e.target.closest('[data-cancel]');
    const resched = e.target.closest('[data-reschedule]');

    try {
        if (cancel) {
            if (!confirm('Cancel this request?')) return;
            cancel.disabled = true;
            const r = await api.cancelRequest(cancel.dataset.cancel);
            toast(r.promoted ? `Cancelled. ${r.promoted} waitlisted request(s) promoted` : 'Request cancelled', 'info');
            load();
        } else if (resched) {
            const id = resched.dataset.reschedule;
            const date = document.querySelector(`[data-date-for="${id}"]`).value;
            resched.disabled = true;
            const r = await api.rescheduleRequest(id, date);
            toast(
                r.status === STATUS.SCHEDULED
                    ? `Rescheduled for ${fmtDate(r.scheduledDate)}`
                    : 'No capacity right now, so the request is waitlisted',
                r.status === STATUS.SCHEDULED ? 'success' : 'warning'
            );
            load();
        }
    } catch (err) {
        toast(err.message, 'error');
        load();
    }
});

load();