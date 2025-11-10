import * as React from 'react';

interface VisibilityReportEmailProps {
  businessName: string;
  score: number;
  insights: string[];
  dashboardUrl: string;
}

export const VisibilityReportEmail: React.FC<VisibilityReportEmailProps> = ({
  businessName,
  score,
  insights,
  dashboardUrl,
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
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .score {
          font-size: 48px;
          font-weight: bold;
          color: #7c3aed;
          text-align: center;
          margin: 20px 0;
        }
        .insight {
          margin: 12px 0;
          padding: 15px;
          background: #f3f4f6;
          border-left: 4px solid #7c3aed;
          border-radius: 4px;
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
        <div className="logo">💎</div>
        <h1 style={{ margin: 0 }}>AI Visibility Report</h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>{businessName}</p>
      </div>
      <div className="content">
        <h2 style={{ textAlign: 'center', marginBottom: 10 }}>Your AI Visibility Score</h2>
        <div className="score">{score}/100</div>
        
        <h3 style={{ marginTop: 30, marginBottom: 15 }}>📊 Key Insights</h3>
        {insights.map((insight, index) => (
          <div key={index} className="insight">
            {insight}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <a href={dashboardUrl} className="button">
            View Full Report
          </a>
        </div>

        <p style={{ marginTop: 30, fontSize: 14 }}>
          <strong>What This Means:</strong><br />
          Your score indicates how often and how positively AI assistants mention your business
          when users ask for recommendations in your category.
        </p>
      </div>
      <div className="footer">
        <p>
          GEMflush - AI Visibility Platform<br />
          Track your AI presence and improve your visibility
        </p>
      </div>
    </body>
  </html>
);

export default VisibilityReportEmail;

