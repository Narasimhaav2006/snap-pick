import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { buildSeed } from '../../src/mock/seed.js';

/** Resets requests and slots, and (re)creates the demo admin, collectors and vehicles. */
export async function seedDemo() {
    const seed = buildSeed();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            'INSERT IGNORE INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
            ['A1', 'Dispatcher Admin', 'admin@apex.com', await bcrypt.hash('admin123', 10)]
        );

        const collectorHash = await bcrypt.hash('collect123', 10);
        for (const c of seed.collectors) {
            await conn.query(
                'INSERT IGNORE INTO collectors (id, name, password_hash) VALUES (?, ?, ?)',
                [c.id, c.name, collectorHash]
            );
        }

        for (const v of seed.vehicles) {
            const accepts = JSON.stringify(v.accepts);
            await conn.query(
                `INSERT INTO vehicles (id, name, capacity_kg, collector_id, accepts) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = ?, capacity_kg = ?, collector_id = ?, accepts = ?`,
                [v.id, v.name, v.capacityKg, v.collectorId, accepts, v.name, v.capacityKg, v.collectorId, accepts]
            );
        }

        await conn.query('DELETE FROM requests');
        await conn.query('DELETE FROM slots');

        const rows = seed.requests.map((r) => [
            r.id, r.householdName, r.phone, `${r.phone}@demo.local`, r.address, r.area, r.wasteType,
            r.quantityKg, r.preferredDate, r.notes, null, 'PENDING', new Date(r.createdAt),
        ]);
        await conn.query(
            `INSERT INTO requests
         (id, household_name, phone, email, address, area, waste_type, quantity_kg,
          preferred_date, notes, photo_url, status, created_at)
       VALUES ?`,
            [rows]
        );

        await conn.commit();
        return { requests: rows.length };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}