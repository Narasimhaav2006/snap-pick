import { USE_MOCK, API_BASE } from './config.js';
import * as mock from './mockApi.js';
import { getSession, logout } from './auth.js';

async function http(path, options = {}) {
    const res = await fetch(API_BASE + path, {
        headers: {
            'Content-Type': 'application/json',
            ...(getSession()?.token && { Authorization: `Bearer ${getSession().token}` }),
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));

    // expired or invalid token on a protected call: send the user back to login
    if (res.status === 401 && !path.startsWith('/auth')) {
        logout();
        throw new Error('Your session has expired. Please log in again');
    }

    if (!res.ok) {
        const err = new Error(data.message || 'Something went wrong');
        err.errors = data.errors;   // field-level errors from the backend
        throw err;
    }
    return data;
}

export const api = USE_MOCK
    ? mock
    : {
        createRequest: (payload) => http('/requests', { method: 'POST', body: payload }),
        getRequests: (q = {}) => http('/requests?' + new URLSearchParams(q)),
        cancelRequest: (id) => http(`/requests/${id}/cancel`, { method: 'PATCH' }),
        updateStatus: (id, status) => http(`/requests/${id}/status`, { method: 'PATCH', body: { status } }),
        rescheduleRequest: (id, date) => http(`/requests/${id}/reschedule`, { method: 'PATCH', body: { date } }),
        runScheduler: (date) => http('/schedule/run', { method: 'POST', body: { date } }),
        getSlots: (date) => http(`/slots?date=${date ?? ''}`),
        getVehicles: () => http('/vehicles'),
        getCollectors: () => http('/collectors'),
        getCollectorSchedule: (id, date) => http(`/collector/${id}/schedule?date=${date}`),
        login: (role, creds) => http('/auth/login', { method: 'POST', body: { role, ...creds } }),
        sendOtp: (email) => http('/auth/otp', { method: 'POST', body: { email } }),
        resetDemo: () => http('/admin/reset-demo', { method: 'POST' }),
        registerAdmin: (payload) => http('/auth/admin/register', { method: 'POST', body: payload }),
    };