import { renderNavbar, toast } from './ui.js';
import { pageIn, shake } from './animations.js';
import { api } from './api.js';
import { getSession, saveSession, HOME } from './auth.js';

const role = document.body.dataset.role;
const $ = (id) => document.getElementById(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

renderNavbar('login');

if (getSession()?.role === role) location.replace(HOME[role]);

const CFG = {
    admin: {
        icon: '📊', bg: 'bg-blue-100', title: 'Admin / Dispatcher login',
        sub: 'Log in with your Admin ID and password.',
        hint: 'Demo admin: ID A1, password admin123. New admins get an ID after registering. You can also log in with your email.',
        fields: [
            { name: 'identifier', label: 'Admin ID', type: 'text', placeholder: 'e.g. ADM-K7M2Q', autocomplete: 'username' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'current-password' },
        ],
    },
    collector: {
        icon: '🚛', bg: 'bg-amber-100', title: 'Collector login',
        sub: 'See your assigned pickups for the day.',
        hint: 'Demo login: C1, C2 or C3 with password collect123',
        fields: [
            { name: 'collectorId', label: 'Collector ID', type: 'text', placeholder: 'e.g. C1', autocomplete: 'username' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'current-password' },
        ],
    },
    household: {
        icon: '🏠', bg: 'bg-green-100', title: 'Household login',
        sub: 'Log in with your email to request and track pickups.',
        hint: 'Enter your email, tap Send code, then enter the 6-digit code we email you. Check your spam folder too.',
        fields: [
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', sendCode: true },
            { name: 'otp', label: 'Code', type: 'text', placeholder: '6-digit code', autocomplete: 'one-time-code', maxlength: 6, numeric: true },
        ],
    },
};

const c = CFG[role];

const fieldHtml = (f) => `
  <div>
    <label class="label" for="${f.name}">${f.label}</label>
    <div class="flex gap-2">
      <input class="input" id="${f.name}" name="${f.name}" type="${f.type}"
             placeholder="${f.placeholder}" autocomplete="${f.autocomplete}"
             ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} ${f.numeric ? 'inputmode="numeric"' : ''} />
      ${f.sendCode ? '<button id="otpBtn" type="button" class="btn-ghost shrink-0">Send code</button>' : ''}
    </div>
    <p class="error-text hidden" data-error-for="${f.name}"></p>
  </div>`;

$('loginRoot').innerHTML = `
  <div data-animate="card" class="card">
    <div class="grid h-12 w-12 place-items-center rounded-xl ${c.bg} text-2xl">${c.icon}</div>
    <h1 class="mt-4 text-2xl font-extrabold">${c.title}</h1>
    <p class="mt-1 text-sm text-slate-600">${c.sub}</p>
    <form id="loginForm" novalidate class="mt-6 space-y-4">
      ${c.fields.map(fieldHtml).join('')}
      <p id="formError" class="error-text hidden"></p>
      <button id="loginBtn" type="submit" class="btn-primary w-full">Log in</button>
    </form>
    <p class="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">${c.hint}</p>
  </div>`;

pageIn();

const form = $('loginForm');

/* ---------- Errors ---------- */
function clearError(name) {
    const m = form.querySelector(`[data-error-for="${name}"]`);
    if (m) { m.textContent = ''; m.classList.add('hidden'); }
    form.elements[name]?.classList.remove('border-red-500');
}

function clearAll() {
    form.querySelectorAll('[data-error-for]').forEach((m) => clearError(m.dataset.errorFor));
    $('formError').classList.add('hidden');
}

function showErrors(errors) {
    let first = true;
    for (const [name, msg] of Object.entries(errors)) {
        const m = form.querySelector(`[data-error-for="${name}"]`);
        const input = form.elements[name];
        if (m) { m.textContent = msg; m.classList.remove('hidden'); }
        if (input) {
            input.classList.add('border-red-500');
            shake(input);
            if (first) { input.focus(); first = false; }
        }
    }
}

form.addEventListener('input', (e) => {
    if (!e.target.name) return;
    if (e.target.inputMode === 'numeric') e.target.value = e.target.value.replace(/\D/g, '');
    clearError(e.target.name);
    $('formError').classList.add('hidden');
});

/* ---------- Validation (the server validates again) ---------- */
function validate(d) {
    const e = {};
    if (role === 'admin') {
        if (!d.identifier) e.identifier = 'Admin ID is required';
        if (!d.password) e.password = 'Password is required';
    }
    if (role === 'collector') {
        if (!d.collectorId) e.collectorId = 'Collector ID is required';
        if (!d.password) e.password = 'Password is required';
    }
    if (role === 'household') {
        if (!d.email) e.email = 'Email is required';
        else if (!EMAIL_RE.test(d.email)) e.email = 'Enter a valid email address';
        if (!d.otp) e.otp = 'Enter the code from your email';
        else if (!/^\d{6}$/.test(d.otp)) e.otp = 'The code is 6 digits';
    }
    return e;
}

/* ---------- Send code (household) ---------- */
const otpBtn = $('otpBtn');
let timer;

function cooldown(seconds) {
    clearInterval(timer);
    let left = seconds;
    otpBtn.disabled = true;
    otpBtn.textContent = `Resend in ${left}s`;
    timer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
            clearInterval(timer);
            otpBtn.disabled = false;
            otpBtn.textContent = 'Resend code';
        } else {
            otpBtn.textContent = `Resend in ${left}s`;
        }
    }, 1000);
}

otpBtn?.addEventListener('click', async () => {
    const email = form.elements.email.value.trim();
    if (!EMAIL_RE.test(email)) return showErrors({ email: 'Enter a valid email address' });

    otpBtn.disabled = true;
    otpBtn.textContent = 'Sending…';
    try {
        await api.sendOtp(email);
        toast(`Code sent to ${email}. Check your inbox and spam folder`, 'success');
        form.elements.otp.focus();
        cooldown(30);
    } catch (err) {
        toast(err.message, 'error');
        otpBtn.disabled = false;
        otpBtn.textContent = 'Send code';
    }
});

/* ---------- Submit ---------- */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAll();

    const data = Object.fromEntries(new FormData(form));
    Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));

    const errors = validate(data);
    if (Object.keys(errors).length) return showErrors(errors);

    const btn = $('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Logging in…';
    try {
        const session = await api.login(role, data);
        saveSession(session);
        toast(`Welcome, ${session.name}`, 'success');
        setTimeout(() => (location.href = HOME[role]), 500);
    } catch (err) {
        $('formError').textContent = err.message;
        $('formError').classList.remove('hidden');
        shake(form);
        btn.disabled = false;
        btn.textContent = 'Log in';
    }
});