import nodemailer from 'nodemailer';
import 'dotenv/config';

const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        family: 4,              // force IPv4 — avoids IPv6 ENETUNREACH
        connectionTimeout: 15000,
        greetingTimeout: 15000
    });

    transporter.verify()
        .then(() => console.log('📧 Mailer ready'))
        .catch(err => console.error('📧 Mailer verify failed:', err.message));
} else {
    console.warn('📧 Mailer not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)');
}

export function isMailerReady() {
    return transporter !== null;
}

export async function sendMail({ to, subject, text, html }) {
    if (!transporter) {
        console.warn('📧 Email skipped — mailer not configured');
        return { ok: false, skipped: true };
    }
    try {
        const info = await transporter.sendMail({
            from: SMTP_FROM || SMTP_USER,
            to,
            subject,
            text: text || '',
            html: html || `<pre style="font-family:inherit">${text || ''}</pre>`
        });
        console.log(`📧 Sent "${subject}" → ${to} (${info.messageId})`);
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        console.error('📧 Send failed:', err.message);
        return { ok: false, error: err.message };
    }
}