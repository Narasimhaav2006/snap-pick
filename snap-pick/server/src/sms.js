import { env } from './env.js';

async function readJson(res) {
    return res.json().catch(() => ({}));
}

export async function sendOtpSms(phone, code, ttlMinutes) {
    const { provider, twilioSid, twilioToken, twilioFrom, fast2smsKey } = env.sms;

    if (provider === 'console') {
        console.log(`\n[SMS to +91${phone}] ${code} is your APEX Waste login code (valid ${ttlMinutes} min)\n`);
        return;
    }

    if (provider === 'fast2sms') {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: fast2smsKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ route: 'otp', variables_values: code, numbers: phone }),
            signal: AbortSignal.timeout(10_000),
        });
        const data = await readJson(res);
        if (!res.ok || data.return !== true) {
            const reason = Array.isArray(data.message) ? data.message.join(' ') : data.message;
            throw new Error(`Fast2SMS failed (${res.status}): ${reason || 'unknown error'}`);
        }
        return;
    }

    if (provider === 'twilio') {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: `+91${phone}`,
                From: twilioFrom,
                Body: `${code} is your APEX Waste login code. It expires in ${ttlMinutes} minutes. Do not share it.`,
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`Twilio failed (${res.status}): ${await res.text()}`);
        return;
    }

    throw new Error(`Unknown SMS_PROVIDER "${provider}"`);
}