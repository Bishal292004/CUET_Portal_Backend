// Builds the email for one notification. No database access, easy to test.

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// A subject must stay on one line
const oneLine = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

export function buildNotificationEmail({ user, university, notification, update, siteUrl }) {
  const firstName = oneLine(user.name).split(" ")[0] || "there";
  const subject = oneLine(`${university.name}: ${notification.title}`).slice(0, 200);

  const pageUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}${notification.link ?? ""}` : null;
  const officialUrl = update?.sourceUrl && /^https?:\/\//i.test(update.sourceUrl) ? update.sourceUrl : null;

  const text = [
    `Hi ${firstName},`,
    "",
    `${university.name} has posted an update:`,
    "",
    notification.title,
    notification.message ? `\n${notification.message}` : null,
    "",
    officialUrl ? `Official notice: ${officialUrl}` : null,
    pageUrl ? `See it on CUET PG Portal: ${pageUrl}` : null,
    "",
    "Always confirm dates and lists on the university's official website.",
    "",
    `You are receiving this because you follow ${university.name}. To stop these emails, switch off email notifications in your profile settings.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.5">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>${escapeHtml(university.name)} has posted an update:</p>
  <h3 style="margin:16px 0 4px">${escapeHtml(notification.title)}</h3>
  ${notification.message ? `<p style="margin:4px 0 16px">${escapeHtml(notification.message)}</p>` : ""}
  ${officialUrl ? `<p><a href="${escapeHtml(officialUrl)}">Read the official notice</a></p>` : ""}
  ${pageUrl ? `<p><a href="${escapeHtml(pageUrl)}">See it on CUET PG Portal</a></p>` : ""}
  <p style="font-size:13px;color:#555">Always confirm dates and lists on the university's official website.</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#777">You are receiving this because you follow ${escapeHtml(university.name)}.
  To stop these emails, switch off email notifications in your profile settings.</p>
</div>`.trim();

  return { subject, text, html };
}
