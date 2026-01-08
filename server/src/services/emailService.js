import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

// Create transporter for Gmail SMTP
let transporter = null;

if (gmailUser && gmailAppPassword) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });
}

export const sendEmail = async ({ to, subject, html }) => {
    if (!transporter) {
        console.log('---------------------------------------------------');
        console.log(`[MOCK EMAIL SERVICE] To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Body (HTML Preview):');
        console.log(html.substring(0, 500) + (html.length > 500 ? '...' : ''));
        console.log('---------------------------------------------------');
        return true;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Calendly Clone" <${gmailUser}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log(`✅ Email sent successfully to ${to} (Message ID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error('❌ Gmail SMTP Error:', error);
        return false;
    }
};
