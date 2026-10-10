// Reuse the frontend's logic so mock mode and real mode behave the same
import { shiftDate } from '../../src/js/scheduler.js';

export { runScheduler as schedule, releaseCapacity, shiftDate } from '../../src/js/scheduler.js';
export { validateRequest, todayISO, addDaysISO, isValidPhone } from '../../src/js/validators.js';
export { STATUS, CANCELLABLE, MAX_ADVANCE_DAYS, WASTE_TYPES } from '../../src/js/config.js';

/** Strict YYYY-MM-DD check that also rejects impossible dates like 2026-02-30 */
export function isISODate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && shiftDate(s, 0) === s;
}