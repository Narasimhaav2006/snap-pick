import { renderNavbar, toast, statusBadge, statusTimeline, esc, photoThumb, initPhotoViewer, icon } from './ui.js';
import { pageIn, staggerIn, shake, timelinePop } from './animations.js';
import { api } from './api.js';
import { requireRole } from './auth.js';
import { compressImage } from './photo.js';
import { AREAS, WASTE_TYPES, CANCELLABLE, MAX_REQUEST_KG, MAX_ADVANCE_DAYS, MAX_PHOTO_MB } from './config.js';
import { validateRequest, todayISO, addDaysISO } from './validators.js';

const session = requireRole('household');
renderNavbar('household');
pageIn();
initPhotoViewer();

const form = document.getElementById('requestForm');
const submitBtn = document.getElementById('submitBtn');
const listEl = document.getElementById('requestList');

document.getElementById('loggedAs').textContent = session?.email ? `Logged in as ${session.email}` : '';

/* ---------- Setup: fill dropdowns from config ---------- */
function fillSelect(id, placeholder, options) {
    document.getElementById(id).innerHTML =
        `<option value="">${placeholder}</option>` +
        options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

function setDateBounds() {
    const d = document.getElementById('preferredDate');
    d.min = todayISO();
    d.max = addDaysISO(MAX_ADVANCE_DAYS);
    d.value = addDaysISO(1);
}

fillSelect('area', 'Select area', AREAS.map((a) => [a, a]));
fillSelect('wasteType', 'Select type', Object.entries(WASTE_TYPES));
document.getElementById('maxHint').textContent = MAX_REQUEST_KG;
setDateBounds();

/* ---------- Form error helpers ---------- */
function clearError(field) {
    const msg = form.querySelector(`[data-error-for="${field}"]`);
    const input = form.elements[field];
    if (msg) { msg.textContent = ''; msg.classList.add('hidden'); }
    if (input) input.classList.remove('!border-rose-500');
}

function clearAllErrors() {
    form.querySelectorAll('[data-error-for]').forEach((m) => clearError(m.dataset.errorFor));
}

function showErrors(errors) {
    let first = true;
    for (const [field, message] of Object.entries(errors)) {
        const msg = form.querySelector(`[data-error-for="${field}"]`);
        const input = form.elements[field];
        if (msg) { msg.textContent = message; msg.classList.remove('hidden'); }
        if (input) {
            input.classList.add('!border-rose-500');
            shake(input);
            if (first) { input.focus(); first = false; }
        }
    }
}

form.addEventListener('input', (e) => e.target.name && clearError(e.target.name));

// digits only in the phone field
form.elements.phone.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

/* ---------- Photo ---------- */
const photoInput = document.getElementById('photoInput');
let photoData = '';

function setPhoto(dataUrl) {
    photoData = dataUrl;
    document.getElementById('photoPreview').src = dataUrl || '';
    document.getElementById('photoBox').classList.toggle('hidden', !dataUrl);
    document.getElementById('photoEmpty').classList.toggle('hidden', !!dataUrl);
}

photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    photoInput.value = '';
    if (!file) return;
    clearError('photo');

    if (!file.type.startsWith('image/')) return showErrors({ photo: 'Please choose an image file' });
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return showErrors({ photo: `Photo is too large (max ${MAX_PHOTO_MB} MB)` });

    try {
        setPhoto(await compressImage(file));
    } catch (err) {
        showErrors({ photo: err.message });
    }
});

document.getElementById('photoRemove').addEventListener('click', () => setPhoto(''));

/* ---------- Submit ---------- */
function readForm() {
    const raw = Object.fromEntries(new FormData(form));
    Object.keys(raw).forEach((k) => (raw[k] = String(raw[k]).trim()));
    return raw;
}

function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Submitting…' : 'Submit request';
    submitBtn.classList.toggle('opacity-60', busy);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const data = { ...readForm(), photo: photoData };
    const errors = validateRequest(data);
    if (Object.keys(errors).length) {
        showErrors(errors);
        toast('Please fix the highlighted fields', 'warning');
        return;
    }

    setBusy(true);
    try {
        const created = await api.createRequest({ ...data, quantityKg: Number(data.quantityKg) });
        toast(`Request ${created.id} submitted`, 'success');
        form.reset();
        setPhoto('');
        setDateBounds();
        await loadRequests();
    } catch (err) {
        if (err.errors) showErrors(err.errors);
        toast(err.message, 'error');
    } finally {
        setBusy(false);
    }
});

/* ---------- My requests ---------- */
const fmtDate = (iso) =>
    new Date(iso + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });


const emptyState = (text) => `<div class="card text-center text-sm text-slate-500">${text}</div>`;

function requestCard(r) {
    const canCancel = CANCELLABLE.includes(r.status);
    return `
    <article class="req-card card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold tracking-wide text-slate-400">${esc(r.id)}</p>
          <h3 class="font-bold tracking-tight">${esc(WASTE_TYPES[r.wasteType] ?? r.wasteType)} &middot; ${esc(r.quantityKg)} kg</h3>
        </div>
        ${statusBadge(r.status)}
      </div>

      <p class="mt-3 flex items-start gap-2 text-sm text-slate-600">
        <span class="mt-0.5 text-brand-dark">${icon('pin')}</span>
        <span>${esc(r.address)}, ${esc(r.area)}</span>
      </p>
      ${r.photoUrl ? `<div class="mt-3">${photoThumb(r, 'h-24 w-24')}</div>` : ''}
      <p class="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <span class="text-brand-dark">${icon('calendar')}</span>
        <span>Preferred: ${fmtDate(r.preferredDate)}</span>
      </p>
      ${r.scheduledDate ? `
        <p class="mt-1 flex items-center gap-2 text-sm font-semibold text-sky-800">
          <span>${icon('truck')}</span>
          <span>Scheduled: ${fmtDate(r.scheduledDate)}</span>
        </p>` : ''}
      ${r.remark ? `
        <p class="mt-3 flex items-start gap-2 rounded-xl bg-amber-100/70 px-3 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-300/60">
          <span class="mt-px shrink-0">${icon('info', 'h-3.5 w-3.5')}</span>
          <span>${esc(r.remark)}</span>
        </p>` : ''}
      ${r.notes ? `
        <p class="mt-2 flex items-start gap-2 text-sm text-slate-500">
          <span class="mt-0.5">${icon('note')}</span>
          <span>${esc(r.notes)}</span>
        </p>` : ''}

      ${statusTimeline(r.status)}

      ${canCancel ? `
        <div class="mt-4 text-right">
          <button class="btn-ghost !px-3 !py-1.5 !text-rose-600" data-cancel="${esc(r.id)}">Cancel request</button>
        </div>` : ''}
    </article>`;
}

async function loadRequests() {
    listEl.innerHTML = emptyState('Loading…');
    try {
        const rows = await api.getRequests();   // the server returns only this login's requests
        if (!rows.length) {
            listEl.innerHTML = emptyState('No requests yet. Submit your first pickup request.');
            return;
        }
        listEl.innerHTML = rows.map(requestCard).join('');
        staggerIn('.req-card');
        timelinePop(listEl);
    } catch (err) {
        listEl.innerHTML = emptyState('Could not load requests. Please try again.');
        toast(err.message, 'error');
    }
}

document.getElementById('refreshBtn').addEventListener('click', loadRequests);

/* ---------- Cancel (event delegation) ---------- */
listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    if (!confirm('Cancel this pickup request?')) return;

    btn.disabled = true;
    try {
        await api.cancelRequest(btn.dataset.cancel);
        toast('Request cancelled', 'info');
    } catch (err) {
        toast(err.message, 'error');
    }
    loadRequests();
});

loadRequests();