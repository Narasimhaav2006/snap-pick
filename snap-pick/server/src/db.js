import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
    ...env.db,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,   // DATE columns come back as 'YYYY-MM-DD', like the frontend expects
});