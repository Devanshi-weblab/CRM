/**
 * Email content helpers. Use with sendEmail({ subject, text, html }).
 */

function invitationEmail(options) {
  const { acceptUrl, tempPassword, companyName, recipientName } = options;
  const name = recipientName || 'there';
  const subject = `You're invited to join ${companyName || 'our team'}`;
  const text = [
    `Hi ${name},`,
    '',
    `You have been invited to join ${companyName || 'our team'} on the CRM.`,
    '',
    `Use this link to accept the invitation and set your password:`,
    acceptUrl,
    '',
    tempPassword ? `Your temporary password is: ${tempPassword}` : '',
    tempPassword ? '(You will set a new password on the next page.)' : '',
    '',
    'This link expires in 7 days.',
    '',
    'If you did not expect this email, you can ignore it.'
  ].filter(Boolean).join('\n');

  const html = `
    <p>Hi ${name},</p>
    <p>You have been invited to join <strong>${companyName || 'our team'}</strong> on the CRM.</p>
    <p><a href="${acceptUrl}" style="display:inline-block; padding:10px 20px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px;">Accept invitation</a></p>
    ${tempPassword ? `<p>Your temporary password: <code>${tempPassword}</code></p><p>You will set a new password on the next page.</p>` : ''}
    <p style="color:#666; font-size:12px;">This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
  `;
  return { subject, text, html };
}

module.exports = { invitationEmail };
