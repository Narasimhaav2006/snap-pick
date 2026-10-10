import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { HttpError } from './errors.js';

export const signToken = (user) => jwt.sign(user, env.jwtSecret, { expiresIn: '12h' });

/** requireAuth('admin') or requireAuth('household', 'admin'). Sets req.user. */
export function requireAuth(...roles) {
    return (req, _res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return next(new HttpError(401, 'Please log in to continue'));

        try {
            req.user = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
        } catch {
            return next(new HttpError(401, 'Your session has expired. Please log in again'));
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return next(new HttpError(403, 'You do not have access to this action'));
        }
        next();
    };
}