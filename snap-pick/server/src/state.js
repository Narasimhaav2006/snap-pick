import { pool } from './db.js';
import { toRequest, toSlot, toVehicle } from './mappers.js';

/** Runs fn(conn) inside a transaction. Commits on success, rolls back on any error. */
export async function withTx(fn) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const out = await fn(conn);
        await conn.commit();
        return out;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

const snapshot = (state) => ({
    slots: new Map(state.slots.map((s) => [s.id, JSON.stringify(s)])),
    requests: new Map(state.requests.map((r) => [r.id, JSON.stringify(r)])),
});

/**
 * Loads everything the scheduler needs.
 * The FOR UPDATE on vehicles is a global scheduling lock: a second scheduling
 * operation waits here until the first one commits, so a truck is never double-booked.
 */
export async function loadState(conn) {
    await conn.query('SELECT id FROM vehicles FOR UPDATE');
    const [vehicles] = await conn.query('SELECT * FROM vehicles');
    const [slots] = await conn.query('SELECT * FROM slots');
    const [requests] = await conn.query('SELECT * FROM requests');

    const state = {
        vehicles: vehicles.map(toVehicle),
        slots: slots.map(toSlot),
        requests: requests.map(toRequest),
    };
    return { state, snap: snapshot(state) };
}

/** Writes back only what the scheduler changed. */
export async function saveState(conn, state, snap) {
    // 1. slots first, because requests point at them
    for (const s of state.slots) {
        if (snap.slots.get(s.id) === JSON.stringify(s)) continue;
        await conn.query(
            `INSERT INTO slots (id, slot_date, area, vehicle_id, collector_id, capacity_kg, allocated_kg, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE area = VALUES(area), collector_id = VALUES(collector_id),
         capacity_kg = VALUES(capacity_kg), allocated_kg = VALUES(allocated_kg), status = VALUES(status)`,
            [s.id, s.date, s.area, s.vehicleId, s.collectorId, s.capacityKg, s.allocatedKg, s.status]
        );
    }

    // 2. changed requests
    for (const r of state.requests) {
        if (snap.requests.get(r.id) === JSON.stringify(r)) continue;
        await conn.query(
            `UPDATE requests
          SET status = ?, slot_id = ?, scheduled_date = ?, remark = ?, preferred_date = ?, reschedule_count = ?
        WHERE id = ?`,
            [r.status, r.slotId, r.scheduledDate, r.remark, r.preferredDate, r.rescheduleCount, r.id]
        );
    }

    // 3. slots that became empty were removed by the scheduler
    const live = new Set(state.slots.map((s) => s.id));
    for (const id of snap.slots.keys()) {
        if (!live.has(id)) await conn.query('DELETE FROM slots WHERE id = ?', [id]);
    }
}