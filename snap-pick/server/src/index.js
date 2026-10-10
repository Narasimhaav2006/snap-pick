import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './env.js';
import { pool } from './db.js';
import { UPLOAD_DIR } from './photos.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import opsRoutes from './routes/ops.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json({ limit: '6mb' }));   // photos arrive as compressed base64

// uploaded photos (random file names, so they are not guessable)
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '7d' }));

app.get('/api/health', async (_req, res) => {
    try {
        const [[row]] = await pool.query('SELECT DATABASE() AS db, NOW() AS now');
        res.json({ ok: true, database: row.db, time: row.now });
    } catch (err) {
        res.status(500).json({ ok: false, message: `Database not reachable: ${err.message}` });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api', opsRoutes);

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// one place that turns errors into JSON the frontend understands
app.use((err, _req, res, _next) => {
    if (err.status && err.status < 600) {
        return res.status(err.status).json({ message: err.message, errors: err.errors });
    }
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'The upload is too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again' });
});

app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));