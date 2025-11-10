import * as React from 'react';

interface WelcomeEmailProps {
  userName?: string;
  loginUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  loginUrl,
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
        .feature {
          margin: 15px 0;
          padding-left: 25px;
          position: relative;
        }
        .feature:before {
          content: '💎';
          position: absolute;
          left: 0;
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
        <p style={{ margin: 0 }}>AI Visibility Platform</p>
      </div>
      <div className="content">
        <h1>Welcome to GEMflush{userName ? `, ${userName}` : ''}! 🎉</h1>
        
        <p>
          You've taken the first step towards dominating AI search results. 
          We're excited to help you get discovered by ChatGPT, Claude, Perplexity, and other AI assistants.
        </p>

        <h2>What's Next?</h2>
        
        <div className="feature">
          <strong>Check Your AI Visibility</strong><br />
          Get your free fingerprint report and see how visible you are to AI
        </div>
        
        <div className="feature">
          <strong>Benchmark Your Competition</strong><br />
          See how you stack up against competitors in AI search results
        </div>
        
        <div className="feature">
          <strong>Publish to Wikidata</strong><br />
          Upgrade to Pro to become the #1 recommendation in your category
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href={loginUrl} className="button">
            Access Your Dashboard
          </a>
        </div>

        <p style={{ marginTop: 30 }}>
          <strong>Need help getting started?</strong><br />
          Check out our <a href={`${process.env.BASE_URL}/docs`}>documentation</a> or 
          reply to this email - we're here to help!
        </p>
      </div>
      <div className="footer">
        <p>
          GEMflush - AI Visibility Platform<br />
          Making businesses discoverable in the age of AI
        </p>
        <p style={{ fontSize: 12, marginTop: 10 }}>
          You're receiving this because you signed up for GEMflush.<br />
          Questions? Contact us at support@gemflush.com
        </p>
      </div>
    </body>
  </html>
);

export default WelcomeEmail;

