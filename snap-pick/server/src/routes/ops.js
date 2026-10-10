import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, wrap } from '../errors.js';
import { requireAuth } from '../guard.js';
import { toRequest, toSlot, toVehicle } from '../mappers.js';
import { withTx, loadState, saveState } from '../state.js';
import { clearUploads } from '../photos.js';
import { seedDemo } from '../seed.js';
import { schedule, isISODate } from '../shared.js';

const router = Router();

const optionalDate = (value) => {
    if (!value) return null;
    if (!isISODate(value)) throw new HttpError(400, 'Choose a valid date');
    return value;
};

/* ---------- Run the scheduler (admin) ---------- */
router.post('/schedule/run', requireAuth('admin'), wrap(async (req, res) => {
    const date = optionalDate(req.body?.date);
    const summary = await withTx(async (conn) => {
        const { state, snap } = await loadState(conn);
        const out = schedule(state, { date });
        await saveState(conn, state, snap);
        return out;
    });
    res.json(summary);
}));

/* ---------- Slots (admin) ---------- */
router.get('/slots', requireAuth('admin'), wrap(async (req, res) => {
    const date = optionalDate(req.query.date);
    const [rows] = await pool.query(
        `SELECT s.*, v.name AS vehicle_name, c.name AS collector_name,
            (SELECT COUNT(*) FROM requests r WHERE r.slot_id = s.id) AS request_count
       FROM slots s
       JOIN vehicles v ON v.id = s.vehicle_id
       JOIN collectors c ON c.id = s.collector_id
       ${date ? 'WHERE s.slot_date = ?' : ''}
      ORDER BY s.slot_date, s.vehicle_id`,
        date ? [date] : []
    );
    res.json(rows.map((r) => ({
        ...toSlot(r),
        vehicleName: r.vehicle_name,
        collectorName: r.collector_name,
        requestCount: Number(r.request_count),
    })));
}));

/* ---------- Vehicles and collectors ---------- */
router.get('/vehicles', requireAuth('admin'), wrap(async (_req, res) => {
    const [rows] = await pool.query('SELECT * FROM vehicles ORDER BY id');
    res.json(rows.map(toVehicle));
}));

router.get('/collectors', requireAuth('admin', 'collector'), wrap(async (req, res) => {
    const own = req.user.role === 'collector';   // a collector only sees themselves
    const [rows] = await pool.query(
        `SELECT id, name FROM collectors ${own ? 'WHERE id = ?' : ''} ORDER BY id`,
        own ? [req.user.id] : []
    );
    res.json(rows);
}));

/* ---------- A collector's schedule ---------- */
router.get('/collector/:id/schedule', requireAuth('admin', 'collector'), wrap(async (req, res) => {
    const { id } = req.params;
    if (req.user.role === 'collector' && req.user.id !== id) {
        throw new HttpError(403, 'You can only view your own schedule');
    }
    const date = optionalDate(req.query.date);

    const [slots] = await pool.query(
        `SELECT s.*, v.name AS vehicle_name
       FROM slots s JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.collector_id = ? ${date ? 'AND s.slot_date = ?' : ''}
      ORDER BY s.slot_date, s.vehicle_id`,
        date ? [id, date] : [id]
    );

    const [reqs] = slots.length
        ? await pool.query('SELECT * FROM requests WHERE slot_id IN (?) ORDER BY created_at', [slots.map((s) => s.id)])
        : [[]];

    res.json(slots.map((s) => ({
        ...toSlot(s),
        vehicleName: s.vehicle_name,
        requests: reqs.filter((r) => r.slot_id === s.id).map(toRequest),
    })));
}));

/* ---------- Reset demo data (admin) ---------- */
router.post('/admin/reset-demo', requireAuth('admin'), wrap(async (_req, res) => {
    const out = await seedDemo();
    await clearUploads();
    res.json({ ok: true, ...out });
}));

export default router;