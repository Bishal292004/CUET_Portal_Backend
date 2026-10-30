import nodemailer from "nodemailer";

const requiredVariables = [
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USER",
  "MAIL_PASS",
  "MAIL_FROM",
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length) {
  throw new Error(`Missing email configuration: ${missingVariables.join(", ")}`);
}

const port = Number(process.env.MAIL_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("MAIL_PORT must be a valid port number.");
}

export const emailTransport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port,
  secure: process.env.MAIL_SECURE === "true",
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function verifyEmailConnection() {
  await emailTransport.verify();
}

export async function sendEmail({ to, subject, text, html }) {
  return emailTransport.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}
