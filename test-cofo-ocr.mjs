/**
 * Test script for C of O OCR extraction
 * This script tests the OCR functionality with sample C of O documents
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock OCR extraction function (simulates what the real OCR would do)
function extractCofOData(text) {
  const data = {
    certificateNumber: null,
    ownerName: null,
    propertyAddress: null,
    issueDate: null,
    expiryDate: null,
    landUse: null,
    plotSize: null,
    titleNumber: null,
    registrationNumber: null,
    verificationCode: null,
  };

  // Extract certificate number
  const certMatch = text.match(/Certificate Number:\s*([A-Z0-9\/]+)/i);
  if (certMatch) data.certificateNumber = certMatch[1].trim();

  // Extract owner name
  const ownerMatch = text.match(/Name:\s*([A-Z\s]+)(?=\n|Address:)/i);
  if (ownerMatch) data.ownerName = ownerMatch[1].trim();

  // Extract property address
  const addressMatch = text.match(/Property Address:\s*([^\n]+)/i);
  if (addressMatch) data.propertyAddress = addressMatch[1].trim();

  // Extract issue date
  const issueDateMatch = text.match(/Date of Issue:\s*([^\n]+)/i);
  if (issueDateMatch) data.issueDate = issueDateMatch[1].trim();

  // Extract expiry date
  const expiryDateMatch = text.match(/Expiry Date:\s*([^\n]+)/i);
  if (expiryDateMatch) data.expiryDate = expiryDateMatch[1].trim();

  // Extract land use
  const landUseMatch = text.match(/Land Use:\s*([^\n]+)/i);
  if (landUseMatch) data.landUse = landUseMatch[1].trim();

  // Extract plot size
  const plotSizeMatch = text.match(/Plot Size:\s*([^\n]+)/i);
  if (plotSizeMatch) data.plotSize = plotSizeMatch[1].trim();

  // Extract title number
  const titleMatch = text.match(/Title Number:\s*([A-Z0-9\/]+)/i);
  if (titleMatch) data.titleNumber = titleMatch[1].trim();

  // Extract registration number
  const regMatch = text.match(/Registration Number:\s*([A-Z0-9\/]+)/i);
  if (regMatch) data.registrationNumber = regMatch[1].trim();

  // Extract verification code
  const verifyMatch = text.match(/VERIFICATION CODE:\s*([A-Z0-9\-]+)/i);
  if (verifyMatch) data.verificationCode = verifyMatch[1].trim();

  return data;
}

// Calculate extraction accuracy
function calculateAccuracy(extracted, expected) {
  const fields = Object.keys(expected);
  let correctFields = 0;
  const details = [];

  for (const field of fields) {
    const isCorrect = extracted[field] === expected[field];
    if (isCorrect) correctFields++;
    
    details.push({
      field,
      expected: expected[field],
      extracted: extracted[field],
      correct: isCorrect,
    });
  }

  const accuracy = (correctFields / fields.length) * 100;
  return { accuracy, correctFields, totalFields: fields.length, details };
}

// Main test function
async function testCofOOCR() {
  console.log('='.repeat(60));
  console.log('C of O OCR Extraction Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Read sample C of O document
    const samplePath = join(__dirname, 'test-data', 'sample-cofo.txt');
    const documentText = readFileSync(samplePath, 'utf-8');
    
    console.log('✓ Sample document loaded');
    console.log(`  Document length: ${documentText.length} characters`);
    console.log();

    // Extract data using OCR simulation
    console.log('Extracting data from document...');
    const extractedData = extractCofOData(documentText);
    console.log('✓ Data extraction complete');
    console.log();

    // Expected values (ground truth)
    const expectedData = {
      certificateNumber: 'LOS/COO/2023/045678',
      ownerName: 'ADEBAYO OLUWASEUN JOHNSON',
      propertyAddress: 'Plot 12, Block A, Victoria Garden City, Lekki Phase 1, Lagos',
      issueDate: '15th March, 2023',
      expiryDate: '14th March, 2122',
      landUse: 'Residential',
      plotSize: '600 Square Meters',
      titleNumber: 'LOS/TN/2023/VGC/012',
      registrationNumber: 'LR/2023/045678',
      verificationCode: 'LOS-2023-VGC-045678-VERIFY',
    };

    // Calculate accuracy
    const result = calculateAccuracy(extractedData, expectedData);

    // Display results
    console.log('Extraction Results:');
    console.log('-'.repeat(60));
    
    for (const detail of result.details) {
      const status = detail.correct ? '✓' : '✗';
      const color = detail.correct ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${status}${reset} ${detail.field}:`);
      console.log(`  Expected: ${detail.expected}`);
      console.log(`  Extracted: ${detail.extracted || '(not found)'}`);
      console.log();
    }

    console.log('='.repeat(60));
    console.log(`Accuracy: ${result.accuracy.toFixed(1)}% (${result.correctFields}/${result.totalFields} fields correct)`);
    console.log('='.repeat(60));
    console.log();

    if (result.accuracy === 100) {
      console.log('✅ All fields extracted correctly!');
    } else if (result.accuracy >= 80) {
      console.log('⚠️  Most fields extracted correctly, but some need improvement');
    } else {
      console.log('❌ Extraction accuracy is below acceptable threshold');
    }

    return {
      success: result.accuracy >= 80,
      accuracy: result.accuracy,
      extractedData,
      expectedData,
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
testCofOOCR()
  .then(result => {
    console.log();
    console.log('Test completed');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
