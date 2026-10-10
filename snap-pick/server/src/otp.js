import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';
import { env } from './env.js';
import { HttpError } from './errors.js';
import { sendOtpEmail } from './mail.js';

const { ttlMinutes, resendSeconds, maxAttempts } = env.otp;

/** Returns a clean lowercase email, or '' if it is invalid */
export function normalizeEmail(value) {
    const e = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : '';
}

const hash = (email, code) =>
    createHmac('sha256', env.jwtSecret).update(`${email}:${code}`).digest('hex');

export async function issueOtp(email) {
    const [[prev]] = await pool.query(
        'SELECT TIMESTAMPDIFF(SECOND, last_sent_at, NOW()) AS since FROM email_otps WHERE email = ?',
        [email]
    );
    if (prev && prev.since < resendSeconds) {
        throw new HttpError(429, `Please wait ${resendSeconds - prev.since}s before requesting another code`);
    }

    const code = String(randomInt(100000, 1000000));

    await pool.query(
        `INSERT INTO email_otps (email, code_hash, expires_at, attempts, last_sent_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0, NOW())
     ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at),
                             attempts = 0, last_sent_at = NOW()`,
        [email, hash(email, code), ttlMinutes]
    );

    try {
        await sendOtpEmail(email, code, ttlMinutes);
    } catch (err) {
        console.error('Email failed:', err.message);
        await pool.query('DELETE FROM email_otps WHERE email = ?', [email]);
        throw new HttpError(502, 'Could not send the email right now. Please try again');
    }
}

export async function verifyOtp(email, code) {
    const [[row]] = await pool.query(
        'SELECT code_hash, attempts, expires_at > NOW() AS live FROM email_otps WHERE email = ?',
        [email]
    );
    if (!row || !row.live) throw new HttpError(401, 'Code expired or not requested. Please request a new one');

    // count the attempt BEFORE checking, so parallel guesses cannot beat the limit
    const [bump] = await pool.query(
        'UPDATE email_otps SET attempts = attempts + 1 WHERE email = ? AND attempts < ?',
        [email, maxAttempts]
    );
    if (!bump.affectedRows) throw new HttpError(429, 'Too many wrong attempts. Please request a new code');

    const given = Buffer.from(hash(email, code));
    const stored = Buffer.from(row.code_hash);
    const match = given.length === stored.length && timingSafeEqual(given, stored);

    if (!match) {
        const left = maxAttempts - (row.attempts + 1);
        throw new HttpError(401, left > 0 ? `Incorrect code. ${left} attempt(s) left` : 'Incorrect code. Please request a new one');
    }

    const [used] = await pool.query('DELETE FROM email_otps WHERE email = ?', [email]);
    if (!used.affectedRows) throw new HttpError(401, 'Code already used. Please request a new one');
}