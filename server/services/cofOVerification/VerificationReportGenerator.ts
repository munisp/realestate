import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { storagePut } from "../../storage";

interface ReportTemplate {
  id: string;
  name: string;
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  includeWatermark?: boolean;
  watermarkText?: string;
}

interface VerificationData {
  cofONumber: string;
  propertyAddress: string;
  ownerName: string;
  state: string;
  lga: string;
  verificationDate: Date;
  overallStatus: string;
  governmentApiStatus: string;
  fraudDetectionScore: number | null;
  geospatialValidationScore: number | null;
  governmentApiDetails: any;
  fraudDetectionDetails: any;
  geospatialValidationDetails: any;
}

/**
 * Verification Report Generator
 * 
 * Generates customizable PDF reports for C of O verification results
 * with white-labeling support for different stakeholders
 */
export class VerificationReportGenerator {
  private static readonly DEFAULT_TEMPLATE: ReportTemplate = {
    id: "default",
    name: "Standard Report",
    companyName: "Nigerian Real Estate Platform",
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    footerText: "Confidential - For authorized use only",
    includeWatermark: false,
  };

  /**
   * Generate a PDF verification report
   */
  public static async generateReport(
    verificationData: VerificationData,
    template: Partial<ReportTemplate> = {}
  ): Promise<{ url: string; buffer: Buffer }> {
    const finalTemplate = { ...this.DEFAULT_TEMPLATE, ...template };

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });

    // Create buffer to store PDF
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Generate PDF content
    await this.addHeader(doc, finalTemplate, verificationData);
    this.addSummarySection(doc, verificationData);
    this.addGovernmentVerificationSection(doc, verificationData);
    this.addFraudDetectionSection(doc, verificationData);
    this.addGeospatialValidationSection(doc, verificationData);
    this.addFooter(doc, finalTemplate);

    // Add watermark if enabled
    if (finalTemplate.includeWatermark && finalTemplate.watermarkText) {
      this.addWatermark(doc, finalTemplate.watermarkText);
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Upload to S3
    const fileName = `verification-reports/${verificationData.cofONumber}-${Date.now()}.pdf`;
    const { url } = await storagePut(fileName, buffer, "application/pdf");

    return { url, buffer };
  }

  /**
   * Add header section with logo and company branding
   */
  private static async addHeader(
    doc: PDFKit.PDFDocument,
    template: ReportTemplate,
    data: VerificationData
  ): Promise<void> {
    // Company name/logo
    doc
      .fontSize(24)
      .fillColor(template.primaryColor || "#000000")
      .text(template.companyName || "Verification Report", 50, 50);

    // Report title
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Certificate of Occupancy Verification Report", 50, 90);

    // Horizontal line
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .strokeColor(template.primaryColor || "#000000")
      .stroke();

    doc.moveDown(2);
  }

  /**
   * Add summary section
   */
  private static addSummarySection(
    doc: PDFKit.PDFDocument,
    data: VerificationData
  ): void {
    const startY = 140;

    doc.fontSize(14).fillColor("#000000").text("Verification Summary", 50, startY, {
      underline: true,
    });

    doc.moveDown(0.5);

    const summaryData = [
      { label: "C of O Number:", value: data.cofONumber },
      { label: "Property Address:", value: data.propertyAddress },
      { label: "Owner Name:", value: data.ownerName },
      { label: "State:", value: data.state },
      { label: "LGA:", value: data.lga },
      {
        label: "Verification Date:",
        value: data.verificationDate.toLocaleDateString(),
      },
      { label: "Overall Status:", value: data.overallStatus.toUpperCase() },
    ];

    let yPos = doc.y;
    summaryData.forEach((item) => {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(item.label, 50, yPos, { continued: true, width: 150 })
        .fillColor("#000000")
        .text(item.value, { width: 350 });
      yPos += 20;
    });

    // Status badge
    const statusColor = this.getStatusColor(data.overallStatus);
    doc
      .rect(50, yPos + 10, 100, 30)
      .fillAndStroke(statusColor, statusColor);

    doc
      .fontSize(12)
      .fillColor("#FFFFFF")
      .text(data.overallStatus.toUpperCase(), 50, yPos + 18, {
        width: 100,
        align: "center",
      });

    doc.moveDown(3);
  }

  /**
   * Add government verification section
   */
  private static addGovernmentVerificationSection(
    doc: PDFKit.PDFDocument,
    data: VerificationData
  ): void {
    doc.fontSize(14).fillColor("#000000").text("Government Registry Verification", {
      underline: true,
    });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text("Status:", { continued: true })
      .fillColor("#000000")
      .text(` ${data.governmentApiStatus.toUpperCase()}`);

    doc.moveDown(0.5);

    if (data.governmentApiDetails) {
      doc.fontSize(10).fillColor("#666666").text("Details:");
      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(JSON.stringify(data.governmentApiDetails, null, 2), {
          width: 495,
        });
    }

    doc.moveDown(2);
  }

  /**
   * Add fraud detection section
   */
  private static addFraudDetectionSection(
    doc: PDFKit.PDFDocument,
    data: VerificationData
  ): void {
    doc.fontSize(14).fillColor("#000000").text("Fraud Detection Analysis", {
      underline: true,
    });

    doc.moveDown(0.5);

    if (data.fraudDetectionScore !== null) {
      const riskLevel = this.getRiskLevel(data.fraudDetectionScore);
      const riskColor = this.getRiskColor(data.fraudDetectionScore);

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Risk Score:", { continued: true })
        .fillColor(riskColor)
        .text(` ${data.fraudDetectionScore}/100 (${riskLevel})`);

      doc.moveDown(0.5);

      if (data.fraudDetectionDetails) {
        doc.fontSize(10).fillColor("#666666").text("Analysis:");
        doc
          .fontSize(9)
          .fillColor("#000000")
          .text(JSON.stringify(data.fraudDetectionDetails, null, 2), {
            width: 495,
          });
      }
    } else {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Fraud detection analysis not available");
    }

    doc.moveDown(2);
  }

  /**
   * Add geospatial validation section
   */
  private static addGeospatialValidationSection(
    doc: PDFKit.PDFDocument,
    data: VerificationData
  ): void {
    doc.fontSize(14).fillColor("#000000").text("Geospatial Validation", {
      underline: true,
    });

    doc.moveDown(0.5);

    if (data.geospatialValidationScore !== null) {
      const validationLevel = this.getValidationLevel(
        data.geospatialValidationScore
      );
      const validationColor = this.getValidationColor(
        data.geospatialValidationScore
      );

      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Validation Score:", { continued: true })
        .fillColor(validationColor)
        .text(` ${data.geospatialValidationScore}/100 (${validationLevel})`);

      doc.moveDown(0.5);

      if (data.geospatialValidationDetails) {
        doc.fontSize(10).fillColor("#666666").text("Details:");
        doc
          .fontSize(9)
          .fillColor("#000000")
          .text(JSON.stringify(data.geospatialValidationDetails, null, 2), {
            width: 495,
          });
      }
    } else {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Geospatial validation not available");
    }

    doc.moveDown(2);
  }

  /**
   * Add footer
   */
  private static addFooter(
    doc: PDFKit.PDFDocument,
    template: ReportTemplate
  ): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;

    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        template.footerText || "Confidential - For authorized use only",
        50,
        footerY,
        {
          align: "center",
          width: 495,
        }
      );

    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 15, {
        align: "center",
        width: 495,
      });
  }

  /**
   * Add watermark
   */
  private static addWatermark(
    doc: PDFKit.PDFDocument,
    watermarkText: string
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    doc.save();
    doc
      .fontSize(60)
      .fillColor("#CCCCCC", 0.3)
      .rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] })
      .text(watermarkText, 0, pageHeight / 2, {
        align: "center",
        width: pageWidth,
      });
    doc.restore();
  }

  /**
   * Get status color
   */
  private static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      verified: "#10b981",
      pending: "#f59e0b",
      failed: "#ef4444",
      suspicious: "#f59e0b",
    };
    return colors[status.toLowerCase()] || "#6b7280";
  }

  /**
   * Get risk level
   */
  private static getRiskLevel(score: number): string {
    if (score < 30) return "Low Risk";
    if (score < 50) return "Medium Risk";
    if (score < 70) return "High Risk";
    return "Critical Risk";
  }

  /**
   * Get risk color
   */
  private static getRiskColor(score: number): string {
    if (score < 30) return "#10b981";
    if (score < 50) return "#f59e0b";
    if (score < 70) return "#f97316";
    return "#ef4444";
  }

  /**
   * Get validation level
   */
  private static getValidationLevel(score: number): string {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  }

  /**
   * Get validation color
   */
  private static getValidationColor(score: number): string {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  }
}
