/**
 * Email service – provider-agnostic interface.
 * Switch provider via EMAIL_PROVIDER env (default: mailgun).
 * Add new providers in ./providers/ and require by name.
 */
const providerName = process.env.EMAIL_PROVIDER || 'mailgun';
let provider;

try {
  provider = require(`./providers/${providerName}.js`);
} catch (e) {
  throw new Error(`Email provider "${providerName}" not found. Set EMAIL_PROVIDER (e.g. mailgun).`);
}

/**
 * Send an email.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Subject line
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @param {string} [options.from] - Sender (optional; provider default if not set)
 * @returns {Promise<{ id?: string }>}
 */
async function sendEmail(options) {
  return provider.sendEmail(options);
}

module.exports = { sendEmail };
