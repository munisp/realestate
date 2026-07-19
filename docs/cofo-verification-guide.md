# Certificate of Occupancy (C of O) Verification System - User Guide

**Author:** Manus AI  
**Last Updated:** November 23, 2025  
**Version:** 1.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Getting Started](#getting-started)
4. [Verification Process](#verification-process)
5. [Understanding Verification Results](#understanding-verification-results)
6. [Bulk Verification](#bulk-verification)
7. [SMS Notifications](#sms-notifications)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Introduction

The Certificate of Occupancy (C of O) Verification System is an automated platform designed to verify the authenticity and validity of property certificates in Nigeria. The system leverages Optical Character Recognition (OCR) technology to extract information from C of O documents and cross-references this data with government registries to ensure accuracy and legitimacy.

### Key Features

The system provides comprehensive verification capabilities that streamline the property documentation process. Property owners and buyers can upload C of O documents in various formats including PDF files and scanned images. The system automatically extracts critical information such as certificate numbers, owner names, property addresses, and registration details using advanced OCR technology.

Once the document is processed, the system performs validation checks against government registry data to confirm the certificate's authenticity. Users receive instant notifications via SMS when verification is complete, and they can access detailed verification reports through the platform. For organizations managing multiple properties, the system supports bulk verification processing, allowing hundreds of documents to be verified simultaneously.

### Benefits

Using this verification system offers significant advantages over traditional manual verification methods. The automated process reduces verification time from several days to just minutes, eliminating the need for physical visits to government offices. Property buyers gain confidence knowing that certificates have been independently verified, while sellers can demonstrate the legitimacy of their documents upfront, facilitating faster transactions.

The system maintains a complete audit trail of all verification activities, providing transparency and accountability. Historical verification records can be accessed at any time, and the platform generates comprehensive reports suitable for legal and financial purposes.

---

## System Overview

### Architecture

The C of O Verification System consists of several integrated components working together to provide seamless verification services. At the core is the document processing engine, which handles file uploads and prepares documents for OCR extraction. The OCR service analyzes uploaded documents and extracts structured data including certificate numbers, owner information, property details, and registration information.

The verification engine compares extracted data against government registry databases to validate certificate authenticity. When verification is complete, the notification service sends SMS alerts to property owners and relevant stakeholders. All verification activities are recorded in the verification history database, creating a permanent audit trail.

### Supported Document Formats

The system accepts C of O documents in multiple formats to accommodate various submission methods. PDF documents are fully supported, whether they are digitally generated or scanned from physical certificates. Image files in JPEG, PNG, and TIFF formats can be uploaded directly from mobile devices or scanners. For optimal OCR accuracy, documents should have a minimum resolution of 300 DPI and clear, legible text without significant distortion or damage.

### Data Security

Security and privacy are paramount in the verification system. All uploaded documents are encrypted during transmission using industry-standard TLS protocols. Stored documents are protected with AES-256 encryption, and access is restricted through role-based permissions. The system complies with Nigerian data protection regulations, and personal information is handled in accordance with established privacy policies. Users maintain full control over their data and can request deletion of documents and verification records at any time.

---

## Getting Started

### Prerequisites

Before using the C of O Verification System, ensure you have the following items ready. You will need digital copies of your Certificate of Occupancy documents, either as PDF files or high-quality scanned images. A valid phone number in Nigerian format (e.g., +2348012345678) is required to receive SMS notifications. Access to the platform requires user registration, which can be completed through the web interface.

### Registration Process

New users can register by navigating to the platform homepage and clicking the "Sign Up" button. The registration form requires basic information including your full name, email address, and phone number. After submitting the form, you will receive a verification email containing a link to activate your account. Click the link to verify your email address and complete the registration process. Once verified, you can log in using your credentials and begin using the verification system.

### Initial Setup

After logging in for the first time, take a moment to complete your profile information. Navigate to the Settings page and verify that your contact details are correct, particularly your phone number, as this will be used for SMS notifications. You may also want to configure notification preferences to control when and how you receive updates about verification activities.

---

## Verification Process

### Single Document Verification

Verifying a single C of O document is a straightforward process that can be completed in minutes. Begin by logging into the platform and navigating to the "Verify C of O" section from the main dashboard. Click the "Upload Document" button and select your C of O file from your computer or mobile device. The system supports drag-and-drop functionality for convenient file selection.

After selecting your document, review the file preview to ensure the correct document was chosen. You can add optional notes or reference numbers to help identify this verification later. When ready, click the "Start Verification" button to begin processing. The system will display a progress indicator showing the current stage of verification, including document upload, OCR extraction, and registry validation.

### Document Upload Guidelines

To ensure optimal verification results, follow these guidelines when uploading documents. Ensure that all text in the document is clearly legible and not obscured by shadows, folds, or damage. If scanning a physical document, use a flatbed scanner rather than a mobile phone camera when possible, as this produces higher quality images. Scan documents in color at 300 DPI or higher resolution.

Avoid uploading documents with handwritten annotations or stamps that might interfere with OCR processing. If your document has multiple pages, ensure all pages are included in a single PDF file rather than uploading them separately. Remove any staples or bindings that might create shadows or distortions in scanned images.

### Verification Stages

The verification process proceeds through several distinct stages, each performing specific validation tasks. During the document upload stage, the system receives your file and performs initial quality checks to ensure it meets minimum requirements. If the document passes these checks, it proceeds to the OCR extraction stage.

The OCR extraction stage analyzes the document and extracts key information fields including the certificate number, owner name, property address, issue date, expiry date, land use designation, plot size, title number, registration number, and verification code. The system uses pattern matching and natural language processing to identify and extract these fields accurately.

Once extraction is complete, the verification engine compares the extracted data against government registry records. This validation process checks whether the certificate number exists in official databases, confirms that owner information matches registry records, validates property address details, and verifies registration dates and status. The system also checks for any flags or alerts associated with the certificate, such as pending disputes or revocation notices.

### Verification Results

When verification is complete, the system generates a comprehensive verification report. This report includes a verification status indicating whether the certificate was successfully verified, partially verified, or failed verification. The report displays all extracted data fields alongside their verification status, showing which information was confirmed and which could not be validated.

The confidence score indicates the system's certainty in the verification results, expressed as a percentage. Higher confidence scores indicate stronger evidence supporting the certificate's authenticity. The report also includes timestamps showing when the verification was performed and any relevant notes or warnings about the certificate.

---

## Understanding Verification Results

### Verification Status Types

The system assigns one of several status types to each verification based on the results of the validation process. A "Verified" status indicates that all critical information was successfully extracted and validated against government registry data. This is the ideal outcome and provides strong confidence in the certificate's authenticity.

A "Partially Verified" status means that some information was validated but other fields could not be confirmed. This might occur if certain registry databases are temporarily unavailable or if some information in the document does not match registry records exactly. Partially verified certificates may still be legitimate but require additional manual review.

A "Failed" status indicates that the certificate could not be verified, either because critical information could not be extracted from the document or because the extracted data does not match any records in government registries. Failed verifications require investigation to determine whether the document is fraudulent or if there are issues with data quality or registry access.

A "Pending" status is assigned to verifications that are still in progress or awaiting additional information. This is typically a temporary status that will be updated once processing is complete.

### Confidence Scores

The confidence score provides additional context about verification results. Scores are calculated based on multiple factors including OCR extraction quality, registry data match accuracy, and document quality. A score of 90-100% indicates very high confidence with all critical fields verified and strong matches to registry data. Scores of 70-89% indicate good confidence with most fields verified but some minor discrepancies or missing data. Scores of 50-69% suggest moderate confidence with significant fields verified but notable gaps or inconsistencies. Scores below 50% indicate low confidence and warrant careful review.

### Common Issues and Resolutions

Several common issues can affect verification results. Poor document quality is one of the most frequent problems, occurring when scanned documents have low resolution, poor lighting, or physical damage. To resolve this, rescan the document at higher resolution with better lighting, or obtain a fresh copy of the certificate from the issuing authority.

Data mismatches can occur when information in the document does not exactly match registry records. This might be due to spelling variations, formatting differences, or outdated registry data. In such cases, manual review by an administrator may be necessary to confirm the certificate's validity.

Registry connectivity issues can temporarily prevent verification if government databases are unavailable. The system will automatically retry verification when connectivity is restored, or you can manually retry the verification after waiting a few hours.

---

## Bulk Verification

### Overview

The bulk verification feature allows organizations to process multiple C of O documents simultaneously, significantly reducing the time required to verify large property portfolios. This feature is particularly useful for real estate companies, financial institutions, and government agencies that need to verify dozens or hundreds of certificates.

### Preparing Bulk Uploads

To prepare documents for bulk verification, organize all C of O files into a single folder on your computer. Ensure that each file is named descriptively, preferably using the certificate number or property address to facilitate identification. All files should meet the same quality standards as single document uploads, with clear text and appropriate resolution.

The system supports uploading multiple files at once, either by selecting them individually or by uploading a ZIP archive containing all documents. When using a ZIP file, ensure that all documents are in the root directory of the archive rather than nested in subfolders.

### Processing Bulk Verifications

To initiate bulk verification, navigate to the "Bulk Verification" section from the main dashboard. Click "New Bulk Job" and provide a descriptive name for this verification batch, such as "Q4 2023 Portfolio Verification" or "Lekki Properties Batch 1". Upload your documents or ZIP archive, and review the file list to confirm all documents were successfully uploaded.

Before starting the verification process, you can configure notification settings to control how you receive updates about the batch progress. You can choose to receive SMS notifications when the entire batch is complete, or receive periodic updates as individual documents are processed.

Click "Start Bulk Verification" to begin processing. The system will process documents in parallel, significantly reducing total processing time compared to sequential verification. You can monitor progress through the bulk verification dashboard, which shows real-time statistics on completed, pending, and failed verifications.

### Bulk Verification Reports

When bulk verification is complete, the system generates a comprehensive summary report showing statistics for the entire batch. This report includes the total number of documents processed, the count of verified, partially verified, and failed documents, and the average confidence score across all verifications. The report also highlights any documents that require manual review.

Individual verification reports for each document in the batch can be accessed through the bulk verification dashboard. You can filter and sort results to quickly identify problematic documents or generate exports for further analysis. Reports can be downloaded in CSV or PDF format for record-keeping or sharing with stakeholders.

---

## SMS Notifications

### Notification Types

The system sends several types of SMS notifications to keep users informed about verification activities. Verification complete notifications are sent when a single document verification finishes, providing the verification status and a link to view the full report. Bulk verification complete notifications summarize the results of a bulk verification job, including counts of verified and failed documents.

Verification reminders are sent if a verification has been pending for an extended period, prompting users to check the status or provide additional information. Error notifications alert users to technical issues that prevented verification from completing, with guidance on next steps.

### Managing Notification Preferences

Users can customize their notification preferences through the Settings page. Options include enabling or disabling SMS notifications entirely, choosing which types of notifications to receive, and setting quiet hours during which notifications will not be sent. You can also configure email notifications as an alternative or supplement to SMS alerts.

### SMS Delivery Issues

If you are not receiving SMS notifications, verify that your phone number in your profile settings is correct and includes the country code (+234 for Nigeria). Check that your mobile device has adequate signal strength and is not blocking messages from unknown numbers. Some mobile carriers may filter automated messages, so you may need to contact your carrier to whitelist messages from the verification platform.

---

## Troubleshooting

### Common Problems and Solutions

This section addresses frequently encountered issues and their resolutions. If document upload fails, check that your file size does not exceed the maximum limit of 10 MB per document. Ensure the file format is supported (PDF, JPEG, PNG, or TIFF) and that the file is not corrupted. Try uploading from a different browser or device if problems persist.

If OCR extraction produces incomplete results, the document quality may be insufficient. Try rescanning the document at higher resolution, ensuring good lighting and no shadows or glare. Remove any physical damage or obstructions from the original document before scanning. If the document is very old or faded, consider obtaining a certified copy from the issuing authority.

If verification status remains "Pending" for an extended period, there may be connectivity issues with government registry databases. The system will automatically retry verification, but you can also manually retry by clicking the "Retry Verification" button on the verification details page. If the issue persists beyond 24 hours, contact support for assistance.

### Error Messages

The system provides specific error messages to help diagnose issues. An "Invalid Document Format" error indicates that the uploaded file is not in a supported format. Convert the document to PDF, JPEG, PNG, or TIFF and try again. A "Document Quality Too Low" error means the OCR system cannot reliably extract text from the document. Rescan at higher resolution or obtain a clearer copy.

A "Certificate Number Not Found" error indicates that the extracted certificate number does not match any records in government registries. Verify that the certificate number was correctly extracted by reviewing the OCR results. If the number is incorrect, the document may need to be rescanned. If the number is correct, the certificate may be fraudulent or not yet registered in the database.

A "Registry Connection Failed" error indicates temporary connectivity issues with government databases. The system will automatically retry verification. No action is required unless the error persists beyond 24 hours.

### Getting Support

If you encounter issues that cannot be resolved using this guide, contact the support team through the platform's help center. Click the "Help" button in the navigation menu and select "Contact Support". Provide a detailed description of the issue, including any error messages received, the certificate number or verification ID if applicable, and screenshots if relevant. The support team typically responds within one business day.

---

## API Reference

### Authentication

API access requires authentication using an API key, which can be generated from your account settings page. Include the API key in the `Authorization` header of all API requests using the format `Bearer YOUR_API_KEY`. API keys should be kept secure and never shared publicly or committed to version control systems.

### Endpoints

The verification API provides several endpoints for programmatic access to verification functionality. The primary endpoint for single document verification is `POST /api/land-records/verify-cofo`, which accepts a document file upload and returns verification results. Request parameters include the document file (multipart/form-data), optional owner name for validation, and optional notes or reference numbers.

The response includes a verification ID for tracking, extracted data fields, verification status, confidence score, and any warnings or errors. Example response structure:

```json
{
  "verificationId": "ver_abc123",
  "status": "verified",
  "confidence": 95,
  "extractedData": {
    "certificateNumber": "LOS/COO/2023/045678",
    "ownerName": "ADEBAYO OLUWASEUN JOHNSON",
    "propertyAddress": "Plot 12, Block A, Victoria Garden City",
    "issueDate": "2023-03-15",
    "expiryDate": "2122-03-14"
  },
  "verifiedFields": [
    "certificateNumber",
    "ownerName",
    "propertyAddress"
  ],
  "warnings": []
}
```

For bulk verification, use the `POST /api/land-records/bulk-verify` endpoint, which accepts multiple document files and returns a bulk job ID for tracking progress. Query bulk job status using `GET /api/land-records/bulk-verify/:jobId`, which returns current progress statistics and individual verification results.

### Rate Limits

API requests are subject to rate limiting to ensure fair usage and system stability. Standard accounts are limited to 100 verification requests per hour and 1000 requests per day. Bulk verification jobs count as a single request regardless of the number of documents in the batch. If you exceed rate limits, the API will return a 429 status code with information about when you can retry.

---

## Frequently Asked Questions

### How long does verification take?

Single document verification typically completes within 2-5 minutes, depending on document quality and registry database response times. Bulk verification processes documents in parallel, with most batches completing within 15-30 minutes regardless of size.

### What happens if my certificate cannot be verified?

If verification fails, the system provides detailed information about why validation could not be completed. Common reasons include certificate numbers not found in registries, mismatched owner information, or poor document quality preventing OCR extraction. You can retry verification after addressing the identified issues, or contact support for manual review.

### Can I verify certificates from any Nigerian state?

The system currently supports certificates issued by Lagos State, Abuja FCT, and several other major states. Coverage is continuously expanding as additional government registries are integrated. Check the platform documentation for the current list of supported states.

### Is my data secure?

Yes, the platform employs industry-standard security measures including encryption for data in transit and at rest, role-based access controls, and regular security audits. Your documents and personal information are protected in accordance with Nigerian data protection regulations.

### Can I delete my verification history?

Yes, you can request deletion of verification records and uploaded documents at any time through your account settings. Note that deletion is permanent and cannot be undone. Some records may be retained for legal compliance purposes as required by law.

### How accurate is the OCR extraction?

OCR accuracy depends on document quality, with high-quality scanned documents achieving 95-100% extraction accuracy. The system has been tested extensively with Nigerian C of O documents and achieves reliable extraction of all critical fields when documents meet quality standards.

### What if I don't receive SMS notifications?

Verify that your phone number is correctly entered in your profile settings with the country code (+234). Check your mobile device's signal strength and ensure it is not blocking messages from unknown senders. If problems persist, contact support for assistance.

### Can I integrate the verification system with my own application?

Yes, the platform provides a comprehensive API for integration with third-party applications. API documentation and access keys are available through your account settings. Contact sales for information about enterprise integration options and support.

---

## Conclusion

The Certificate of Occupancy Verification System provides a reliable, efficient solution for validating property certificates in Nigeria. By automating the verification process and leveraging advanced OCR technology, the platform reduces verification time from days to minutes while maintaining high accuracy and security standards.

For additional assistance or questions not covered in this guide, please contact the support team through the platform's help center or email support@realestate-platform.com.

---

**Document Version:** 1.0  
**Last Updated:** November 23, 2025  
**Author:** Manus AI
