import { renderNavbar, toast, esc } from './ui.js';
import { pageIn, shake } from './animations.js';
import { api } from './api.js';

const $ = (id) => document.getElementById(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

renderNavbar('login');

const FIELDS = [
    { name: 'name', label: 'Full name', type: 'text', placeholder: 'e.g. Priya Nair', autocomplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' },
    { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters, letters and numbers', autocomplete: 'new-password' },
    { name: 'confirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat the password', autocomplete: 'new-password' },
    { name: 'inviteCode', label: 'Admin invite code', type: 'password', placeholder: 'Given to you by the system owner', autocomplete: 'off' },
];

$('registerRoot').innerHTML = `
  <div data-animate="card" class="card">
    <div class="grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-2xl">📊</div>
    <h1 class="mt-4 text-2xl font-extrabold">Register as admin</h1>
    <p class="mt-1 text-sm text-slate-600">You will receive an Admin ID to use when logging in.</p>
    <form id="regForm" novalidate class="mt-6 space-y-4">
      ${FIELDS.map((f) => `
        <div>
          <label class="label" for="${f.name}">${f.label}</label>
          <input class="input" id="${f.name}" name="${f.name}" type="${f.type}"
                 placeholder="${f.placeholder}" autocomplete="${f.autocomplete}" />
          <p class="error-text hidden" data-error-for="${f.name}"></p>
        </div>`).join('')}
      <p id="formError" class="error-text hidden"></p>
      <button id="regBtn" type="submit" class="btn-primary w-full">Create admin account</button>
    </form>
  </div>`;

pageIn();

const form = $('regForm');

function clearError(name) {
    const m = form.querySelector(`[data-error-for="${name}"]`);
    if (m) { m.textContent = ''; m.classList.add('hidden'); }
    form.elements[name]?.classList.remove('border-red-500');
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
    if (e.target.name) clearError(e.target.name);
    $('formError').classList.add('hidden');
});

function validate(d) {
    const e = {};
    if (d.name.length < 2) e.name = 'Name must be at least 2 characters';
    else if (d.name.length > 60) e.name = 'Name is too long (max 60)';

    if (!d.email) e.email = 'Email is required';
    else if (!EMAIL_RE.test(d.email)) e.email = 'Enter a valid email address';

    if (!d.password) e.password = 'Password is required';
    else if (d.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (d.password.length > 72) e.password = 'Password is too long (max 72)';
    else if (!/[A-Za-z]/.test(d.password) || !/\d/.test(d.password)) e.password = 'Use letters and numbers';

    if (d.confirm !== d.password) e.confirm = 'Passwords do not match';
    if (!d.inviteCode) e.inviteCode = 'The invite code is required';
    return e;
}

function showSuccess(admin) {
    $('registerRoot').innerHTML = `
    <div class="card text-center">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-green-100 text-2xl">✅</div>
      <h1 class="mt-4 text-2xl font-extrabold">Account created</h1>
      <p class="mt-1 text-sm text-slate-600">Welcome, <span id="okName"></span>. This is your Admin ID:</p>
      <p id="okId" class="mt-4 select-all rounded-xl bg-slate-100 py-4 text-3xl font-extrabold tracking-widest"></p>
      <p class="mt-3 text-xs text-slate-500">Save it now. You log in with this ID and your password. If you lose it, you can also log in with your email.</p>
      <div class="mt-6 flex gap-3">
        <button id="copyBtn" class="btn-ghost flex-1" type="button">Copy ID</button>
        <a href="/login-admin.html" class="btn-primary flex-1">Go to login</a>
      </div>
    </div>`;
    $('okName').textContent = admin.name;       // textContent: no HTML injection
    $('okId').textContent = admin.id;
    $('copyBtn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(admin.id);
            toast('Admin ID copied', 'success');
        } catch {
            toast('Select the ID and copy it manually', 'warning');
        }
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('[data-error-for]').forEach((m) => clearError(m.dataset.errorFor));
    $('formError').classList.add('hidden');

    const data = Object.fromEntries(new FormData(form));
    ['name', 'email', 'inviteCode'].forEach((k) => (data[k] = String(data[k]).trim()));

    const errors = validate(data);
    if (Object.keys(errors).length) return showErrors(errors);

    const btn = $('regBtn');
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    try {
        const { confirm, ...payload } = data;     // the server doesn't need the confirmation field
        showSuccess(await api.registerAdmin(payload));
    } catch (err) {
        if (err.errors) showErrors(err.errors);
        $('formError').textContent = err.message;
        $('formError').classList.remove('hidden');
        shake(form);
        btn.disabled = false;
        btn.textContent = 'Create admin account';
    }
});