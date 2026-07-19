export interface PropertyDigest {
  id: number;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl?: string;
}

export function generatePropertyDigestEmail(
  userName: string,
  properties: PropertyDigest[],
  frequency: 'daily' | 'weekly'
): string {
  const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${frequencyText} Property Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Your ${frequencyText} Property Digest</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0;">Hi ${userName}, we found ${properties.length} new properties for you!</p>
            </td>
          </tr>
          
          <!-- Properties -->
          ${properties.map(property => `
          <tr>
            <td style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="150" valign="top">
                    ${property.imageUrl ? `
                    <img src="${property.imageUrl}" alt="${property.address}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px;">
                    ` : `
                    <div style="width: 150px; height: 100px; background-color: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: #9ca3af; font-size: 14px;">No Image</span>
                    </div>
                    `}
                  </td>
                  <td style="padding-left: 20px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">${property.address}</h3>
                    <p style="margin: 0 0 5px 0; font-size: 24px; font-weight: bold; color: #2563eb;">$${property.price.toLocaleString()}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      ${property.beds} bed • ${property.baths} bath • ${property.sqft.toLocaleString()} sqft
                    </p>
                    <a href="https://yourdomain.com/property/${property.id}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">View Details</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `).join('')}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                You're receiving this email because you have active property alerts.
              </p>
              <p style="margin: 0; font-size: 14px;">
                <a href="https://yourdomain.com/alerts" style="color: #2563eb; text-decoration: none;">Manage Alerts</a> • 
                <a href="https://yourdomain.com/unsubscribe" style="color: #2563eb; text-decoration: none;">Unsubscribe</a>
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
