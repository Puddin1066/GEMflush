import * as React from 'react';

interface SubscriptionUpdatedEmailProps {
  userName?: string;
  planName: string;
  planPrice: string;
  features: string[];
  dashboardUrl: string;
  isUpgrade: boolean;
}

export const SubscriptionUpdatedEmail: React.FC<SubscriptionUpdatedEmailProps> = ({
  userName,
  planName,
  planPrice,
  features,
  dashboardUrl,
  isUpgrade,
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
        .plan-card {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid #7c3aed;
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
        }
        .feature {
          margin: 10px 0;
          padding-left: 25px;
          position: relative;
        }
        .feature:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #7c3aed;
          font-weight: bold;
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
        <p style={{ margin: 0 }}>
          {isUpgrade ? '🎉 Subscription Upgraded!' : '✓ Subscription Updated'}
        </p>
      </div>
      <div className="content">
        <h1>
          {isUpgrade 
            ? `Welcome to ${planName}!` 
            : `Your plan has been updated`
          }
        </h1>
        
        <p>
          Hi{userName ? ` ${userName}` : ''},
        </p>

        <p>
          {isUpgrade 
            ? `Congratulations on upgrading to ${planName}! You now have access to powerful features to dominate AI search results.`
            : `Your GEMflush subscription has been updated to ${planName}.`
          }
        </p>

        <div className="plan-card">
          <h2 style={{ margin: '0 0 10px 0', color: '#7c3aed' }}>{planName} Plan</h2>
          <p style={{ fontSize: 24, fontWeight: 'bold', margin: '10px 0' }}>
            {planPrice}
          </p>
          <div style={{ marginTop: 20 }}>
            <strong>Your Features:</strong>
            {features.map((feature, index) => (
              <div key={index} className="feature">{feature}</div>
            ))}
          </div>
        </div>

        {isUpgrade && (
          <>
            <h2>🚀 What's Next?</h2>
            <p>
              Your new features are active right now! Here's what you can do:
            </p>
            <ul>
              <li>Publish your business to Wikidata and become authoritative</li>
              <li>Run weekly AI fingerprints to track your visibility</li>
              <li>Add more businesses to your dashboard</li>
            </ul>
          </>
        )}

        <div style={{ textAlign: 'center' }}>
          <a href={dashboardUrl} className="button">
            Access Your Dashboard
          </a>
        </div>

        <p style={{ marginTop: 30, fontSize: 14 }}>
          <strong>Questions about your subscription?</strong><br />
          You can manage your plan, update payment details, or view invoices 
          anytime from your dashboard settings.
        </p>
      </div>
      <div className="footer">
        <p>
          GEMflush - AI Visibility Platform<br />
          Need help? Contact support@gemflush.com
        </p>
      </div>
    </body>
  </html>
);

export default SubscriptionUpdatedEmail;

