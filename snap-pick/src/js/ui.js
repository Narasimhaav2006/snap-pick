import gsap from 'gsap';
import { STATUS } from './config.js';
import { getSession, logout, HOME, ROLE_LABEL } from './auth.js';

/* ---------- Icons (thin-line SVG, inherit text colour) ---------- */
const ICONS = {
    user: '<path d="M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1"/><circle cx="12" cy="7" r="4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    truck: '<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
};

export function icon(name, cls = 'h-4 w-4') {
    return `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
}

/* ---------- Navbar ---------- */

export function renderNavbar(active = 'home') {
    const el = document.getElementById('navbar');
    if (!el) return;

    const s = getSession();
    const items = [{ key: 'home', label: 'Home', href: '/index.html' }];
    items.push(
        s
            ? { key: s.role, label: ROLE_LABEL[s.role], href: HOME[s.role] }   // only their own page
            : { key: 'login', label: 'Login', href: '/login.html' }
    );

    const links = items.map((n) => `
    <a href="${n.href}"
       class="rounded-full px-4 py-2 text-sm font-medium transition
       ${n.key === active
            ? 'bg-white/70 text-brand-dark shadow-sm'
            : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'}">
      ${n.label}
    </a>`).join('');

    const account = s
        ? `<span class="hidden items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 text-sm text-slate-700 sm:inline-flex">
             ${icon('user')}<span>${esc(s.name)}</span>
           </span>
           <button data-logout class="btn-ghost !px-3 !py-1.5">${icon('logout')}<span>Logout</span></button>`
        : '';

    el.innerHTML = `
    <header class="glass fixed inset-x-0 top-0 z-50 !rounded-none !border-x-0 !border-t-0">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a href="/index.html" class="flex items-center gap-2.5 font-bold tracking-tight">
          <img src="/logo.jpg" alt="Snap &amp; Pick logo" class="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <span>Snap <span class="text-brand">&amp; Pick</span></span>
        </a>
        <div class="flex items-center gap-2">
          <nav class="hidden gap-1 md:flex">${links}</nav>
          ${account}
          <button id="menuBtn" class="rounded-full p-2 text-slate-700 hover:bg-white/50 md:hidden" aria-label="Menu">${icon('menu', 'h-5 w-5')}</button>
        </div>
      </div>
      <nav id="mobileMenu" class="hidden flex-col gap-1 border-t border-white/60 px-4 py-3 md:hidden">${links}</nav>
    </header>`;

    document.getElementById('menuBtn').addEventListener('click', () => {
        const m = document.getElementById('mobileMenu');
        m.classList.toggle('hidden');
        m.classList.toggle('flex');
    });
    el.querySelector('[data-logout]')?.addEventListener('click', logout);
}

/* ---------- Status badge ---------- */
const BADGE = {
    [STATUS.PENDING]: 'bg-amber-100/80 text-amber-800 ring-amber-300/60',
    [STATUS.SCHEDULED]: 'bg-sky-100/80 text-sky-800 ring-sky-300/60',
    [STATUS.WAITLISTED]: 'bg-orange-100/80 text-orange-800 ring-orange-300/60',
    [STATUS.COLLECTED]: 'bg-emerald-100/80 text-emerald-800 ring-emerald-300/60',
    [STATUS.MISSED]: 'bg-rose-100/80 text-rose-800 ring-rose-300/60',
    [STATUS.CANCELLED]: 'bg-slate-200/70 text-slate-600 ring-slate-300/60',
};

export function statusBadge(status) {
    return `<span class="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${BADGE[status] ?? 'bg-slate-100 text-slate-600 ring-slate-300/60'}">${status}</span>`;
}

/* ---------- Toasts ---------- */
const TOAST_COLORS = {
    success: 'bg-emerald-700/90',
    error: 'bg-rose-700/90',
    info: 'bg-slate-800/90',
    warning: 'bg-amber-600/90',
};

export function toast(message, type = 'info') {
    let box = document.getElementById('toastBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toastBox';
        box.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = `rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md ${TOAST_COLORS[type] ?? TOAST_COLORS.info}`;
    t.textContent = message;
    box.appendChild(t);

    gsap.fromTo(t, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    gsap.to(t, {
        x: 60, opacity: 0, duration: 0.3, delay: 3.2, ease: 'power2.in',
        onComplete: () => t.remove(),
    });
}

/* ---------- Safe text (prevents HTML injection from user input) ---------- */
export function esc(str = '') {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

/* ---------- Status timeline ---------- */
export function statusTimeline(status) {
    if (status === STATUS.CANCELLED) {
        return `<p class="mt-3 text-xs font-medium text-slate-500">This request was cancelled.</p>`;
    }

    const reached = { PENDING: 0, WAITLISTED: 0, SCHEDULED: 1, COLLECTED: 2, MISSED: 2 }[status] ?? 0;
    const labels = [
        status === STATUS.WAITLISTED ? 'Waitlisted' : 'Requested',
        'Scheduled',
        status === STATUS.MISSED ? 'Missed' : 'Collected',
    ];

    const dotColor = (i) => {
        if (i > reached) return 'bg-white/80 ring-1 ring-slate-300';
        if (status === STATUS.MISSED && i === 2) return 'bg-rose-500';
        if (status === STATUS.WAITLISTED && i === 0) return 'bg-orange-500';
        return 'bg-brand';
    };

    const items = labels
        .map(
            (label, i) => `
      <li class="flex ${i < 2 ? 'flex-1' : ''} items-center">
        <div class="flex flex-col items-center">
          <span class="tl-dot h-3.5 w-3.5 rounded-full ${dotColor(i)}"></span>
          <span class="mt-1 text-[11px] font-medium text-slate-600">${label}</span>
        </div>
        ${i < 2 ? `<span class="mx-2 mb-4 h-0.5 flex-1 rounded-full ${i < reached ? 'bg-brand' : 'bg-white/70'}"></span>` : ''}
      </li>`
        )
        .join('');

    return `<ol class="mt-4 flex items-center">${items}</ol>`;
}

/* ---------- Photos ---------- */
export function photoThumb(r, size = 'h-16 w-16') {
    return r.photoUrl
        ? `<img src="${esc(r.photoUrl)}" alt="Waste photo for ${esc(r.id)}" data-photo
            class="${size} shrink-0 cursor-zoom-in rounded-xl border border-white/70 object-cover shadow-sm" />`
        : `<div class="${size} grid shrink-0 place-items-center rounded-xl border border-white/60 bg-white/40 text-center text-[10px] text-slate-400">No photo</div>`;
}

/** Call once per page: clicking any <img data-photo> opens a full-size viewer */
export function initPhotoViewer() {
    document.addEventListener('click', (e) => {
        const thumb = e.target.closest('img[data-photo]');
        if (!thumb) return;

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-50 grid place-items-center bg-emerald-950/70 p-4 backdrop-blur-md';
        overlay.innerHTML = `
      <figure class="max-w-3xl text-center">
        <img class="max-h-[80vh] rounded-2xl shadow-2xl" alt="" />
        <figcaption class="mt-2 text-sm text-white/80"></figcaption>
      </figure>
      <button class="btn-ghost absolute right-4 top-4 !px-3 !py-1.5" aria-label="Close">${icon('close')}<span>Close</span></button>`;
        overlay.querySelector('img').src = thumb.src;
        overlay.querySelector('img').alt = thumb.alt;
        overlay.querySelector('figcaption').textContent = thumb.alt;
        document.body.appendChild(overlay);

        gsap.from(overlay, { opacity: 0, duration: 0.2 });
        gsap.from(overlay.querySelector('figure'), { scale: 0.92, duration: 0.3, ease: 'power3.out' });

        const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (ev) => ev.key === 'Escape' && close();
        overlay.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
    });
}