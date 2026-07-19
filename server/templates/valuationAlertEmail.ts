/**
 * Valuation Alert Email Template
 * 
 * Responsive HTML email template for property valuation change notifications
 */

export interface ValuationAlertEmailData {
  propertyId: number;
  propertyTitle?: string;
  propertyAddress: string;
  propertyImage?: string;
  previousValuation: number;
  newValuation: number;
  changeAmount: number;
  changePercentage: number;
  changeReason?: string;
  valuationUrl: string;
  unsubscribeUrl: string;
  userName?: string;
}

export function generateValuationAlertEmail(data: ValuationAlertEmailData): string {
  const {
    propertyId,
    propertyTitle,
    propertyAddress,
    propertyImage,
    previousValuation,
    newValuation,
    changeAmount,
    changePercentage,
    changeReason,
    valuationUrl,
    unsubscribeUrl,
    userName,
  } = data;

  const isIncrease = changeAmount > 0;
  const direction = isIncrease ? "increased" : "decreased";
  const directionIcon = isIncrease ? "📈" : "📉";
  const changeColor = isIncrease ? "#10b981" : "#ef4444";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Property Valuation Alert</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Main Content -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                ${directionIcon} Valuation Alert
              </h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 16px;">
                Your property valuation has ${direction}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          ${userName ? `
          <tr>
            <td style="padding: 24px 32px 0;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.5;">
                Hi ${userName},
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Main Message -->
          <tr>
            <td style="padding: 16px 32px;">
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Great news! The AI-powered valuation for your monitored property has ${direction} significantly.
              </p>
            </td>
          </tr>

          <!-- Property Card -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                
                <!-- Property Image -->
                ${propertyImage ? `
                <tr>
                  <td style="padding: 0;">
                    <img src="${propertyImage}" alt="${propertyTitle || 'Property'}" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;">
                  </td>
                </tr>
                ` : ''}

                <!-- Property Details -->
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px; font-weight: 600;">
                      ${propertyTitle || `Property #${propertyId}`}
                    </h2>
                    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
                      📍 ${propertyAddress}
                    </p>

                    <!-- Valuation Change -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                      <tr>
                        <td style="padding: 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="width: 50%; padding: 0 8px 0 0;">
                                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                  Previous
                                </p>
                                <p style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
                                  ${formatCurrency(previousValuation)}
                                </p>
                              </td>
                              <td style="width: 50%; padding: 0 0 0 8px;">
                                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                  New Valuation
                                </p>
                                <p style="margin: 0; color: ${changeColor}; font-size: 18px; font-weight: 600;">
                                  ${formatCurrency(newValuation)}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0;">
                          <div style="height: 1px; background-color: #e5e7eb; margin: 0 0 12px;"></div>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="width: 50%; padding: 0 8px 0 0;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                  Change Amount
                                </p>
                                <p style="margin: 4px 0 0; color: ${changeColor}; font-size: 16px; font-weight: 600;">
                                  ${isIncrease ? '+' : ''}${formatCurrency(Math.abs(changeAmount))}
                                </p>
                              </td>
                              <td style="width: 50%; padding: 0 0 0 8px;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                  Percentage Change
                                </p>
                                <p style="margin: 4px 0 0; color: ${changeColor}; font-size: 16px; font-weight: 600;">
                                  ${isIncrease ? '+' : ''}${Math.abs(changePercentage).toFixed(1)}%
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${changeReason ? `
                    <!-- Change Reason -->
                    <div style="margin: 16px 0 0; padding: 12px; background-color: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5;">
                        <strong>Key Factors:</strong> ${changeReason}
                      </p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${valuationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                View Full Valuation Report
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">
                See detailed analysis, neighborhood insights, and more
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Footer Info -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                💡 <strong>What's next?</strong>
              </p>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Review the complete valuation breakdown</li>
                <li>Compare with similar properties in the area</li>
                <li>Contact an agent to discuss your options</li>
                <li>${isIncrease ? 'Consider listing at the new higher value' : 'Explore opportunities to buy at the adjusted price'}</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-align: center;">
                You're receiving this email because you enabled valuation alerts for this property.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Manage alert preferences</a> | 
                <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 12px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © 2025 Next-Generation Real Estate Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

// Plain text version for email clients that don't support HTML
export function generateValuationAlertPlainText(data: ValuationAlertEmailData): string {
  const {
    propertyId,
    propertyTitle,
    propertyAddress,
    previousValuation,
    newValuation,
    changeAmount,
    changePercentage,
    valuationUrl,
    unsubscribeUrl,
    userName,
  } = data;

  const isIncrease = changeAmount > 0;
  const direction = isIncrease ? "increased" : "decreased";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return `
PROPERTY VALUATION ALERT

${userName ? `Hi ${userName},\n\n` : ''}Your monitored property valuation has ${direction}!

PROPERTY DETAILS
${propertyTitle || `Property #${propertyId}`}
${propertyAddress}

VALUATION CHANGE
Previous Valuation: ${formatCurrency(previousValuation)}
New Valuation: ${formatCurrency(newValuation)}
Change: ${isIncrease ? '+' : ''}${formatCurrency(Math.abs(changeAmount))} (${isIncrease ? '+' : ''}${Math.abs(changePercentage).toFixed(1)}%)

View your full valuation report:
${valuationUrl}

WHAT'S NEXT?
- Review the complete valuation breakdown
- Compare with similar properties in the area
- Contact an agent to discuss your options
- ${isIncrease ? 'Consider listing at the new higher value' : 'Explore opportunities to buy at the adjusted price'}

---
You're receiving this email because you enabled valuation alerts for this property.
Manage preferences: ${unsubscribeUrl}
Unsubscribe: ${unsubscribeUrl}

© 2025 Next-Generation Real Estate Platform
  `.trim();
}
