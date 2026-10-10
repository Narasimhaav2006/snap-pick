import 'dotenv/config';

for (const key of ['DB_USER', 'DB_NAME', 'JWT_SECRET']) {
    if (!process.env[key]) {
        console.error(`Missing ${key} in server/.env`);
        process.exit(1);
    }
}

const provider = (process.env.MAIL_PROVIDER || 'console').toLowerCase();

if (!['console', 'smtp'].includes(provider)) {
    console.error(`Unknown MAIL_PROVIDER "${provider}". Use console or smtp`);
    process.exit(1);
}
if (provider === 'smtp') {
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) {
        if (!process.env[key]) {
            console.error(`MAIL_PROVIDER=smtp needs ${key} in server/.env`);
            process.exit(1);
        }
    }
}
if (process.env.NODE_ENV === 'production' && provider === 'console') {
    console.error('MAIL_PROVIDER=console prints OTPs in the log. Not allowed in production.');
    process.exit(1);
}
if (process.env.ADMIN_INVITE_CODE && process.env.ADMIN_INVITE_CODE.length < 8) {
    console.error('ADMIN_INVITE_CODE must be at least 8 characters');
    process.exit(1);
}
export const env = {
    port: Number(process.env.PORT || 5000),
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME,
    },
    jwtSecret: process.env.JWT_SECRET,
    adminInviteCode: process.env.ADMIN_INVITE_CODE || '',
    otp: {
        ttlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
        resendSeconds: Number(process.env.OTP_RESEND_SECONDS || 30),
        maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    },
    mail: {
        provider,
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM,
    },
};