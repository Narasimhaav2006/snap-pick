import { seedDemo } from './seed.js';
import { pool } from './db.js';

try {
    const r = await seedDemo();
    console.log(`Seeded demo data: ${r.requests} requests`);
} catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}