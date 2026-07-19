import { sendGNNAlertEmail } from './server/services/gnnAlertEmailService.ts';

// Test data
const testData = {
  userName: 'John Investor',
  alertName: 'High ROI Properties in Lagos',
  matchCount: 2,
  properties: [
    {
      propertyId: 1,
      address: '123 Victoria Island Road',
      city: 'Lagos',
      price: 75000000,
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2500,
      primaryImage: undefined,
      investmentScore: 85,
      undervaluedPercentage: 15,
      trendStrength: 12.5,
      reason: 'Property shows strong investment potential with high ROI and positive market momentum in a growing neighborhood.',
    },
    {
      propertyId: 2,
      address: '456 Lekki Phase 1',
      city: 'Lagos',
      price: 120000000,
      bedrooms: 5,
      bathrooms: 4,
      squareFeet: 3200,
      primaryImage: undefined,
      investmentScore: 92,
      undervaluedPercentage: 22,
      trendStrength: 18.3,
      reason: 'Exceptional value opportunity - significantly undervalued compared to comparable properties, with strong appreciation potential.',
    },
  ],
  alertUrl: 'http://localhost:3000/gnn-alerts',
};

console.log('Testing GNN Alert Email Service...');
console.log('Sending test email to:', process.env.OWNER_EMAIL || 'test@example.com');

const result = await sendGNNAlertEmail(
  process.env.OWNER_EMAIL || 'test@example.com',
  testData
);

console.log('Result:', result);

if (result.success) {
  console.log('✅ Email sent successfully!');
} else {
  console.log('❌ Email failed:', result.error);
}
