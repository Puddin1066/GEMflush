import * as React from 'react';

interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName,
  resetUrl,
  expiresIn = '1 hour',
}) => (
  <html>
    <head>
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
          text-align: center;
        }
      `}</style>
    </head>
    <body>
      <div className="header">
        <div className="logo">💎 GEMflush</div>
        <p style={{ margin: 0 }}>Password Reset Request</p>
      </div>
      <div className="content">
        <h1>Reset Your Password</h1>
        
        <p>
          Hi{userName ? ` ${userName}` : ''},
        </p>

        <p>
          We received a request to reset your password for your GEMflush account. 
          Click the button below to create a new password:
        </p>

        <div style={{ textAlign: 'center' }}>
          <a href={resetUrl} className="button">
            Reset My Password
          </a>
        </div>

        <div className="warning">
          <strong>⏰ This link expires in {expiresIn}</strong><br />
          For security reasons, this password reset link will only work once and 
          expires after {expiresIn}.
        </div>

        <p>
          <strong>Didn't request this?</strong><br />
          If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </p>

        <p style={{ marginTop: 30, fontSize: 14, color: '#6b7280' }}>
          <strong>Security tip:</strong> Never share your password or this reset link with anyone. 
          GEMflush will never ask for your password via email.
        </p>
      </div>
      <div className="footer">
        <p>
          GEMflush - AI Visibility Platform<br />
          Need help? Contact support@gemflush.com
        </p>
        <p style={{ fontSize: 12, marginTop: 10 }}>
          If the button doesn't work, copy and paste this URL into your browser:<br />
          <span style={{ color: '#7c3aed', wordBreak: 'break-all' }}>{resetUrl}</span>
        </p>
      </div>
    </body>
  </html>
);

export default PasswordResetEmail;

