const KEY = 'apex_session';

export const HOME = {
    household: '/household.html',
    admin: '/admin.html',
    collector: '/collector.html',
};

export const LOGIN = {
    household: '/login-household.html',
    admin: '/login-admin.html',
    collector: '/login-collector.html',
};

export const ROLE_LABEL = { household: 'Household', admin: 'Admin', collector: 'Collector' };

export function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function saveSession(session) {
    localStorage.setItem(KEY, JSON.stringify(session));
}

export function logout() {
    localStorage.removeItem(KEY);
    location.href = '/login.html';
}

/** Route guard: call at the top of each protected page. Returns the session, or null after redirecting. */
export function requireRole(role) {
    const s = getSession();
    if (!s) { location.replace('/login.html'); return null; }
    if (s.role !== role) { location.replace(HOME[s.role]); return null; }  // wrong role: send to their own page
    return s;
}