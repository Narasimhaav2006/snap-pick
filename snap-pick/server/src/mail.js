import nodemailer from 'nodemailer';
import { env } from './env.js';

let transport;
function getTransport() {
    const { host, port, user, pass } = env.mail;
    transport ??= nodemailer.createTransport({
        host,
        port,
        secure: port === 465,          // 465 = SSL, 587 = STARTTLS
        auth: { user, pass },
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
    });
    return transport;
}

export async function sendOtpEmail(email, code, ttlMinutes) {
    if (env.mail.provider === 'console') {
        console.log(`\n[EMAIL to ${email}] ${code} is your APEX Waste login code (valid ${ttlMinutes} min)\n`);
        return;
    }

    await getTransport().sendMail({
        from: env.mail.from,
        to: email,
        subject: `${code} is your APEX Waste login code`,
        text: `Your APEX Waste login code is ${code}.\nIt expires in ${ttlMinutes} minutes. Do not share it with anyone.\n\nIf you did not request this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:420px">
      <h2 style="color:#16a34a;margin:0 0 12px">APEX Waste</h2>
      <p>Your login code is:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
      <p style="color:#555">It expires in ${ttlMinutes} minutes. Do not share it with anyone.</p>
      <p style="color:#999;font-size:12px">If you did not request this, you can ignore this email.</p>
    </div>`,
    });
}