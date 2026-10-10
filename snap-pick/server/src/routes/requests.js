import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { HttpError, wrap } from '../errors.js';
import { requireAuth } from '../guard.js';
import { toRequest } from '../mappers.js';
import { withTx, loadState, saveState } from '../state.js';
import { savePhoto, removePhoto } from '../photos.js';
import {
    schedule, releaseCapacity, validateRequest, addDaysISO, todayISO, isISODate,
    STATUS, CANCELLABLE, MAX_ADVANCE_DAYS, WASTE_TYPES,
} from '../shared.js';

const router = Router();
const FIELDS = ['householdName', 'phone', 'address', 'area', 'wasteType', 'quantityKg', 'preferredDate', 'notes', 'photo'];

// older sessions (from phone login) have no email: make the user log in again
const ownerEmail = (req) => {
    if (!req.user.email) throw new HttpError(401, 'Please log in again');
    return req.user.email;
};

/* ---------- Create (household) ---------- */
router.post('/', requireAuth('household'), wrap(async (req, res) => {
    const email = ownerEmail(req);
    const body = req.body ?? {};

    const clean = Object.fromEntries(
        FIELDS.map((k) => [k, ['string', 'number'].includes(typeof body[k]) ? String(body[k]).trim() : ''])
    );

    const errors = validateRequest(clean);
    if (clean.preferredDate && !isISODate(clean.preferredDate)) errors.preferredDate = 'Pick a valid date';
    if (clean.wasteType && !Object.hasOwn(WASTE_TYPES, clean.wasteType)) errors.wasteType = 'Invalid waste type';
    if (Object.keys(errors).length) throw new HttpError(400, 'Please correct the highlighted fields', errors);

    const photoUrl = clean.photo ? await savePhoto(clean.photo) : null;
    const id = 'REQ-' + randomBytes(3).toString('hex').toUpperCase();

    try {
        await pool.query(
            `INSERT INTO requests
         (id, household_name, phone, email, address, area, waste_type, quantity_kg, preferred_date, notes, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, clean.householdName, clean.phone, email, clean.address, clean.area, clean.wasteType,
                Number(clean.quantityKg), clean.preferredDate, clean.notes, photoUrl]
        );
    } catch (err) {
        await removePhoto(photoUrl);
        throw err;
    }

    const [[row]] = await pool.query('SELECT * FROM requests WHERE id = ?', [id]);
    res.status(201).json(toRequest(row));
}));

/* ---------- List (household: own only, admin: all) ---------- */
router.get('/', requireAuth('household', 'admin'), wrap(async (req, res) => {
    const q = req.query;
    const where = [];
    const args = [];
    const add = (sql, value) => { where.push(sql); args.push(String(value)); };

    if (req.user.role === 'household') add('email = ?', ownerEmail(req));   // ignores anything in the URL
    else if (q.phone) add('phone = ?', q.phone);

    if (q.area) add('area = ?', q.area);
    if (q.status) add('status = ?', q.status);
    if (q.slotId) add('slot_id = ?', q.slotId);
    if (q.date) {
        if (!isISODate(q.date)) throw new HttpError(400, 'Invalid date');
        add('preferred_date = ?', q.date);
    }

    const [rows] = await pool.query(
        `SELECT * FROM requests ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id`,
        args
    );
    res.json(rows.map(toRequest));
}));

/* ---------- Cancel (household: own, admin: any) ---------- */
router.patch('/:id/cancel', requireAuth('household', 'admin'), wrap(async (req, res) => {
    const email = req.user.role === 'household' ? ownerEmail(req) : null;

    const result = await withTx(async (conn) => {
        const { state, snap } = await loadState(conn);
        const r = state.requests.find((x) => x.id === req.params.id);
        if (!r || (email && r.email !== email)) throw new HttpError(404, 'Request not found');
        if (!CANCELLABLE.includes(r.status)) {
            throw new HttpError(409, `A ${r.status.toLowerCase()} request cannot be cancelled`);
        }

        if (r.slotId) state.slots = releaseCapacity(state.slots, r);
        Object.assign(r, { status: STATUS.CANCELLED, slotId: null, scheduledDate: null, remark: '' });

        const promo = schedule(state, { includePending: false });
        await saveState(conn, state, snap);
        return { ...r, promoted: promo.scheduled };
    });
    res.json(result);
}));

/* ---------- Mark collected / missed (collector: own slots only) ---------- */
router.patch('/:id/status', requireAuth('collector', 'admin'), wrap(async (req, res) => {
    const status = req.body?.status;
    if (![STATUS.COLLECTED, STATUS.MISSED].includes(status)) throw new HttpError(400, 'Invalid status');

    const [[row]] = await pool.query(
        `SELECT r.id, s.collector_id AS slot_collector
       FROM requests r LEFT JOIN slots s ON s.id = r.slot_id WHERE r.id = ?`,
        [req.params.id]
    );
    if (!row || (req.user.role === 'collector' && row.slot_collector !== req.user.id)) {
        throw new HttpError(404, 'Request not found');
    }

    const remark = status === STATUS.MISSED ? 'Pickup was missed. It can be rescheduled.' : '';
    const [result] = await pool.query(
        `UPDATE requests SET status = ?, remark = ? WHERE id = ? AND status = 'SCHEDULED'`,
        [status, remark, row.id]
    );
    if (!result.affectedRows) {
        throw new HttpError(409, `Only scheduled pickups can be marked ${status.toLowerCase()}`);
    }

    const [[updated]] = await pool.query('SELECT * FROM requests WHERE id = ?', [row.id]);
    res.json(toRequest(updated));
}));

/* ---------- Reschedule a missed pickup (admin) ---------- */
router.patch('/:id/reschedule', requireAuth('admin'), wrap(async (req, res) => {
    const date = req.body?.date || addDaysISO(1);
    if (!isISODate(date) || date < todayISO() || date > addDaysISO(MAX_ADVANCE_DAYS)) {
        throw new HttpError(400, 'Choose a valid date');
    }

    const result = await withTx(async (conn) => {
        const { state, snap } = await loadState(conn);
        const r = state.requests.find((x) => x.id === req.params.id);
        if (!r) throw new HttpError(404, 'Request not found');
        if (r.status !== STATUS.MISSED) throw new HttpError(409, 'Only missed pickups can be rescheduled');

        state.slots = releaseCapacity(state.slots, r);
        Object.assign(r, {
            preferredDate: date,
            status: STATUS.PENDING,
            slotId: null,
            scheduledDate: null,
            remark: 'Rescheduled after a missed pickup.',
            rescheduleCount: (r.rescheduleCount || 0) + 1,
        });
        schedule(state, { onlyId: r.id });
        await saveState(conn, state, snap);
        return r;
    });
    res.json(result);
}));

export default router;