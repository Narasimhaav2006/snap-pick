import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { HttpError, wrap } from '../errors.js';
import { signToken } from '../guard.js';
import { issueOtp, verifyOtp, normalizeEmail } from '../otp.js';
import { randomInt, timingSafeEqual, createHash } from 'node:crypto';
import { env } from '../env.js';

const router = Router();

router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait a few minutes and try again' },
}));

// stops one machine from emailing many different addresses
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many code requests. Please try again later' },
});
// admin registration: very strict
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many registration attempts. Please try again later' },
});

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I
const newAdminId = () =>
    'ADM-' + Array.from({ length: 5 }, () => ID_CHARS[randomInt(ID_CHARS.length)]).join('');

// compare secrets in constant time
const sameSecret = (a, b) =>
    timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const raw = (v) => (typeof v === 'string' ? v : '');
const badLogin = () => new HttpError(401, 'Invalid credentials. Please check and try again');
const session = (user) => ({ ...user, token: signToken(user) });

router.post('/admin/register', registerLimiter, wrap(async (req, res) => {
    if (!env.adminInviteCode) throw new HttpError(403, 'Admin registration is disabled on this server');

    const b = req.body ?? {};
    if (!sameSecret(raw(b.inviteCode), env.adminInviteCode)) {
        throw new HttpError(403, 'Invalid invite code', { inviteCode: 'Invalid invite code' });
    }

    const name = text(b.name);
    const email = normalizeEmail(b.email);
    const password = raw(b.password);

    const errors = {};
    if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2-60 characters';
    if (!email) errors.email = 'Enter a valid email address';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (password.length > 72) errors.password = 'Password is too long (max 72)';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Use letters and numbers';
    if (Object.keys(errors).length) throw new HttpError(400, 'Please correct the highlighted fields', errors);

    const passwordHash = await bcrypt.hash(password, 10);

    for (let attempt = 0; attempt < 5; attempt++) {
        const id = newAdminId();
        try {
            await pool.query(
                'INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
                [id, name, email, passwordHash]
            );
            return res.status(201).json({ id, name, email });
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') throw err;
            if (/key '(admins\.)?email'/.test(err.message)) {
                throw new HttpError(409, 'This email is already registered', { email: 'This email is already registered' });
            }
            // otherwise the generated ID collided: loop and try a new one
        }
    }
    throw new Error('Could not generate a unique admin ID');
}));
router.post('/otp', otpLimiter, wrap(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) throw new HttpError(400, 'Enter a valid email address');
    await issueOtp(email);
    res.json({ sent: true });
}));

router.post('/login', wrap(async (req, res) => {
    const b = req.body ?? {};

    if (b.role === 'admin') {
        const ident = text(b.identifier ?? b.email);
        const byEmail = ident.includes('@');
        const [[a]] = await pool.query(
            `SELECT * FROM admins WHERE ${byEmail ? 'email' : 'id'} = ?`,
            [byEmail ? ident.toLowerCase() : ident.toUpperCase()]
        );
        if (!a || !(await bcrypt.compare(raw(b.password), a.password_hash))) throw badLogin();
        return res.json(session({ role: 'admin', id: a.id, name: a.name }));
    }

    if (b.role === 'collector') {
        const [[c]] = await pool.query('SELECT * FROM collectors WHERE id = ?', [text(b.collectorId).toUpperCase()]);
        if (!c || !(await bcrypt.compare(raw(b.password), c.password_hash))) throw badLogin();
        return res.json(session({ role: 'collector', id: c.id, name: c.name }));
    }

    if (b.role === 'household') {
        const email = normalizeEmail(b.email);
        if (!email) throw new HttpError(400, 'Enter a valid email address');
        await verifyOtp(email, text(b.otp));

        const [[last]] = await pool.query(
            'SELECT household_name FROM requests WHERE email = ? ORDER BY created_at DESC LIMIT 1', [email]);
        return res.json(session({
            role: 'household', id: email, email, name: last?.household_name ?? email.split('@')[0],
        }));
    }

    throw new HttpError(400, 'Unknown role');
}));

export default router;