const passwordResetTemplate = ({ name, resetUrl, resetToken, expiresInMinutes }) => {
  const subject = "Reset Your Password";

  const text = `
Hello ${name},

We received a request to reset your password.

Reset Link:
${resetUrl}

Reset Token:
${resetToken}

This link/token will expire in ${expiresInMinutes} minutes.

If you did not request this, please ignore this email.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(15, 23, 42, 0.08);">
          
          <tr>
            <td style="background:#0f172a; padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; letter-spacing:0.3px;">
                Backend Template
              </h1>
              <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">
                Secure Password Recovery
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 32px 20px;">
              <h2 style="margin:0 0 14px; color:#111827; font-size:22px;">
                Reset your password
              </h2>

              <p style="margin:0 0 18px; color:#374151; font-size:15px; line-height:1.7;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="margin:0 0 22px; color:#374151; font-size:15px; line-height:1.7;">
                We received a request to reset your account password. Click the button below to continue.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:#2563eb; border-radius:10px;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:14px 24px; color:#ffffff; text-decoration:none; font-weight:bold; font-size:15px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px; color:#6b7280; font-size:14px; line-height:1.7;">
                This reset link will expire in <strong>${expiresInMinutes} minutes</strong>.
              </p>

              <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:22px 0;">
                <p style="margin:0 0 8px; color:#111827; font-size:14px; font-weight:bold;">
                  Testing Token
                </p>
                <p style="margin:0; color:#374151; font-size:13px; line-height:1.6; word-break:break-all;">
                  ${resetToken}
                </p>
              </div>

              <p style="margin:0 0 14px; color:#6b7280; font-size:13px; line-height:1.7;">
                If the button does not work, copy and paste this link into your browser:
              </p>

              <p style="margin:0; color:#2563eb; font-size:13px; line-height:1.7; word-break:break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 34px;">
              <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:18px 32px; text-align:center;">
              <p style="margin:0; color:#9ca3af; font-size:12px;">
                © ${new Date().getFullYear()} Backend Template. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return {
    subject,
    text,
    html,
  };
};

export default passwordResetTemplate;