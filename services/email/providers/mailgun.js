const FormData = require('form-data');
const Mailgun = require('mailgun.js');

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.MAILGUN_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('Mailgun API key not set (MAILGUN_API_KEY or API_KEY)');
  const mailgun = new Mailgun(FormData);
  client = mailgun.client({
    username: 'api',
    key: apiKey,
    url: process.env.MAILGUN_URL || 'https://api.mailgun.net' // use https://api.eu.mailgun.net for EU
  });
  return client;
}

const domain = process.env.MAILGUN_DOMAIN || 'sandbox5128be11217a43c898a001653bee3294.mailgun.org';
const defaultFrom = process.env.MAIL_FROM || `Mailgun Sandbox <postmaster@${domain}>`;

/**
 * Send email via Mailgun.
 * @param {Object} options - { to: string|string[], subject, text, html?, from? }
 * @returns {Promise<{ id?: string }>}
 */
async function sendEmail(options) {
  const { to, subject, text, html, from = defaultFrom } = options;
  const toList = Array.isArray(to) ? to : [to];
  const mg = getClient();
  try {
    const data = await mg.messages.create(domain, {
      from,
      to: toList,
      subject,
      text: text || (html ? undefined : ''),
      html: html || undefined
    });
    return { id: data?.id };
  } catch (err) {
    if (err.status === 403 && err.details && typeof err.details === 'string' && err.details.includes('authorized recipients')) {
      throw new Error(
        'Mailgun sandbox can only send to authorized recipients. Add the recipient email in Mailgun Dashboard → Sending → Authorized recipients, or upgrade your account.'
      );
    }
    throw err;
  }
}

module.exports = { sendEmail };
