import { validateRequest, todayISO, addDaysISO, isValidPhone } from './validators.js';
import { STATUS, CANCELLABLE, MAX_ADVANCE_DAYS } from './config.js';
import { runScheduler as schedule, releaseCapacity } from './scheduler.js';
import { buildSeed } from '../mock/seed.js';

const K = {
    requests: 'apex_requests',
    slots: 'apex_slots',
    vehicles: 'apex_vehicles',
    collectors: 'apex_collectors',
    seeded: 'apex_seeded_v1',
};

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms)); // simulate network
const get = (k) => JSON.parse(localStorage.getItem(k) || '[]');
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const state = () => ({
    requests: get(K.requests),
    slots: get(K.slots),
    vehicles: get(K.vehicles),
    collectors: get(K.collectors),
});
const persist = (s) => { set(K.requests, s.requests); set(K.slots, s.slots); };

function ensureSeed() {
    if (localStorage.getItem(K.seeded)) return;
    const seed = buildSeed();
    set(K.vehicles, seed.vehicles);
    set(K.collectors, seed.collectors);
    set(K.requests, [...seed.requests, ...get(K.requests)]);
    set(K.slots, []);
    localStorage.setItem(K.seeded, '1');
}
ensureSeed();

const findOrThrow = (s, id) => {
    const r = s.requests.find((x) => x.id === id);
    if (!r) throw new Error('Request not found');
    return r;
};

/* ---------------- Requests ---------------- */

export async function createRequest(payload) {
    await wait();
    const errors = validateRequest(payload);   // the backend will validate again
    if (Object.keys(errors).length) {
        const err = new Error('Please correct the highlighted fields');
        err.errors = errors;
        throw err;
    }
    const s = state();
    const request = {
        id: 'REQ-' + Date.now().toString(36).slice(-5).toUpperCase(),
        householdName: payload.householdName.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        area: payload.area,
        wasteType: payload.wasteType,
        quantityKg: Number(payload.quantityKg),
        preferredDate: payload.preferredDate,
        notes: (payload.notes || '').trim(),
        photoUrl: payload.photo || null,
        status: STATUS.PENDING,
        slotId: null,
        scheduledDate: null,
        remark: '',
        rescheduleCount: 0,
        createdAt: new Date().toISOString(),
    };
    s.requests.unshift(request);
    try {
        persist(s);
    } catch {
        // localStorage is about 5 MB; a real database does not have this limit
        throw new Error('Browser storage is full. Click "Reset demo" on the admin page and try again');
    }
    return request;
}

export async function getRequests(q = {}) {
    await wait(200);
    return state()
        .requests.filter(
            (r) =>
                (!q.phone || r.phone === q.phone) &&
                (!q.area || r.area === q.area) &&
                (!q.date || r.preferredDate === q.date) &&
                (!q.status || r.status === q.status) &&
                (!q.slotId || r.slotId === q.slotId)
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cancelRequest(id) {
    await wait();
    const s = state();
    const r = findOrThrow(s, id);
    if (!CANCELLABLE.includes(r.status)) {
        throw new Error(`A ${r.status.toLowerCase()} request cannot be cancelled`);
    }

    if (r.slotId) s.slots = releaseCapacity(s.slots, r);  // free capacity (scheduled or missed)
    r.status = STATUS.CANCELLED;
    r.slotId = null;
    r.scheduledDate = null;
    r.remark = '';

    // freed capacity may let waitlisted requests in
    const promo = schedule(s, { includePending: false });
    persist(s);
    return { ...r, promoted: promo.scheduled };
}

/** Collector marks a scheduled pickup as COLLECTED or MISSED */
export async function updateStatus(id, status) {
    await wait();
    if (![STATUS.COLLECTED, STATUS.MISSED].includes(status)) throw new Error('Invalid status');
    const s = state();
    const r = findOrThrow(s, id);
    if (r.status !== STATUS.SCHEDULED) {
        throw new Error(`Only scheduled pickups can be marked ${status.toLowerCase()}`);
    }
    r.status = status;
    r.remark = status === STATUS.MISSED ? 'Pickup was missed. It can be rescheduled.' : '';
    persist(s);
    return r;
}

/** Missed pickup goes back into the queue for a new date (edge case: missed collection) */
export async function rescheduleRequest(id, newDate) {
    await wait();
    const s = state();
    const r = findOrThrow(s, id);
    if (r.status !== STATUS.MISSED) throw new Error('Only missed pickups can be rescheduled');

    const date = newDate || addDaysISO(1);
    if (date < todayISO() || date > addDaysISO(MAX_ADVANCE_DAYS)) throw new Error('Choose a valid date');
    s.slots = releaseCapacity(s.slots, r);   // give back the old slot's capacity
    Object.assign(r, {
        preferredDate: date,
        status: STATUS.PENDING,
        slotId: null,
        scheduledDate: null,
        remark: 'Rescheduled after a missed pickup.',
        rescheduleCount: (r.rescheduleCount || 0) + 1,
    });
    schedule(s, { onlyId: r.id });   // priority: place it straight away
    persist(s);
    return r;
}

/* ---------------- Scheduling ---------------- */

export async function runScheduler(date = null) {
    await wait(500);
    const s = state();
    const summary = schedule(s, { date });
    persist(s);
    return summary;
}

/* ---------------- Read models ---------------- */

export async function getVehicles() {
    await wait(100);
    return get(K.vehicles);
}

export async function getCollectors() {
    await wait(100);
    return get(K.collectors);
}

export async function getSlots(date = null) {
    await wait(200);
    const s = state();
    return s.slots
        .filter((x) => !date || x.date === date)
        .map((x) => ({
            ...x,
            vehicleName: s.vehicles.find((v) => v.id === x.vehicleId)?.name,
            collectorName: s.collectors.find((c) => c.id === x.collectorId)?.name,
            requestCount: s.requests.filter((r) => r.slotId === x.id).length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.vehicleId.localeCompare(b.vehicleId));
}

export async function getCollectorSchedule(collectorId, date) {
    await wait(200);
    const s = state();
    return s.slots
        .filter((x) => x.collectorId === collectorId && (!date || x.date === date))
        .map((x) => ({
            ...x,
            vehicleName: s.vehicles.find((v) => v.id === x.vehicleId)?.name,
            requests: s.requests.filter((r) => r.slotId === x.id),
        }));
}

/* ---------------- Demo helper (mock only) ---------------- */

export async function resetDemo() {
    Object.values(K).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('apex_household_phone');
    ensureSeed();
}

/* ---------------- Auth (mock) ---------------- */

const ADMIN = { id: 'A1', name: 'Dispatcher Admin', email: 'admin@apex.com', password: 'admin123' };
const COLLECTOR_PASSWORD = 'collect123';
const DEMO_OTP = '123456';

export async function sendOtp(phone) {
    await wait();
    if (!isValidPhone(phone)) throw new Error('Enter a valid 10-digit mobile number');
    return { sent: true };
}

/** Returns a session: { role, id, name, token } */
export async function login(role, c = {}) {
    await wait(400);
    const bad = () => new Error('Invalid credentials. Please check and try again');

    if (role === 'admin') {
        if (String(c.email ?? '').toLowerCase() !== ADMIN.email || c.password !== ADMIN.password) throw bad();
        return { role, id: ADMIN.id, name: ADMIN.name, token: 'mock-token' };
    }

    if (role === 'collector') {
        const col = get(K.collectors).find((x) => x.id === String(c.collectorId ?? '').toUpperCase());
        if (!col || c.password !== COLLECTOR_PASSWORD) throw bad();
        return { role, id: col.id, name: col.name, token: 'mock-token' };
    }

    if (role === 'household') {
        if (!isValidPhone(c.phone)) throw new Error('Enter a valid 10-digit mobile number');
        if (c.otp !== DEMO_OTP) throw new Error('Incorrect OTP');
        const known = get(K.requests).find((r) => r.phone === c.phone);
        return { role, id: c.phone, phone: c.phone, name: known?.householdName ?? `+91 ${c.phone}`, token: 'mock-token' };
    }

    throw new Error('Unknown role');
}