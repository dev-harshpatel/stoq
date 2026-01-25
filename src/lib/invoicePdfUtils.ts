/**
 * Invoice PDF generation utility
 * Generates PDF invoices matching the provided invoice format
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/types/order";
import { InvoiceData, CompanyInfo } from "@/types/invoice";
import { formatPrice } from "@/data/inventory";
import { getUserProfile } from "./supabase/utils";

/**
 * Get company information from environment variables or defaults
 */
function getCompanyInfo(): CompanyInfo {
  return {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "HARI OM TRADERS LTD.",
    address:
      process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
      "48 Pickard Lane, Brampton, ON, L6Y 2M5",
    hstNumber: process.env.NEXT_PUBLIC_COMPANY_HST_NUMBER || "",
  };
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Generate invoice PDF
 * @param order - Order data
 * @param invoiceData - Invoice metadata
 * @param customerInfo - Customer business information
 */
export async function generateInvoicePDF(
  order: Order,
  invoiceData: InvoiceData,
  customerInfo?: {
    businessName?: string | null;
    businessAddress?: string | null;
  },
): Promise<void> {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    const companyInfo = getCompanyInfo();

    // Header Section
    // Left side: Company logo placeholder and info
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name, margin, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyInfo.address, margin, yPos);

    // Right side: Invoice details
    yPos = margin;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - margin, yPos, { align: "right" });

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`# ${invoiceData.invoiceNumber}`, pageWidth - margin, yPos, {
      align: "right",
    });

    yPos += 5;
    doc.text(
      `Date: ${formatDate(invoiceData.invoiceDate)}`,
      pageWidth - margin,
      yPos,
      { align: "right" },
    );

    yPos += 5;
    doc.text(
      `Payment Terms: ${invoiceData.paymentTerms}`,
      pageWidth - margin,
      yPos,
      { align: "right" },
    );

    yPos += 5;
    doc.text(
      `Due Date: ${formatDate(invoiceData.dueDate)}`,
      pageWidth - margin,
      yPos,
      { align: "right" },
    );

    yPos += 5;
    doc.text(`PO Number: ${invoiceData.poNumber}`, pageWidth - margin, yPos, {
      align: "right",
    });

    // Bill To / Ship To Section
    yPos = margin + 35; // Position below company info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", margin, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const billToName = customerInfo?.businessName || "Customer";
    doc.text(billToName, margin, yPos);

    yPos += 5;
    const billToAddress = customerInfo?.businessAddress || "";
    if (billToAddress) {
      // Split long addresses into multiple lines if needed
      const addressLines = billToAddress.split(",").map((line) => line.trim());
      addressLines.forEach((line, index) => {
        if (line) {
          doc.text(line, margin, yPos + index * 5);
        }
      });
      yPos += addressLines.length * 5;
    }

    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Ship To:", margin, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(billToName, margin, yPos);

    yPos += 5;
    if (billToAddress) {
      const addressLines = billToAddress.split(",").map((line) => line.trim());
      addressLines.forEach((line, index) => {
        if (line) {
          doc.text(line, margin, yPos + index * 5);
        }
      });
      yPos += addressLines.length * 5;
    }

    // Balance Due box - positioned to align with Bill To section (right side)
    const balanceBoxWidth = 80;
    const balanceBoxHeight = 15;
    const balanceBoxX = pageWidth - margin - balanceBoxWidth;
    const balanceBoxY = margin + 35; // Same Y position as Bill To

    doc.setFillColor(240, 240, 240);
    doc.rect(balanceBoxX, balanceBoxY, balanceBoxWidth, balanceBoxHeight, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Balance Due:", balanceBoxX + 5, balanceBoxY + 7);
    // Calculate final total (includes discount if applicable)
    const balanceTotal = order.totalPrice; // Already includes discount
    doc.text(
      formatPrice(balanceTotal),
      balanceBoxX + balanceBoxWidth - 5,
      balanceBoxY + 7,
      { align: "right" },
    );

    // Items Table - ensure proper spacing from Bill To/Ship To
    yPos = Math.max(yPos, margin + 80) + 10; // Ensure minimum spacing
    const tableData: string[][] = [];

    if (Array.isArray(order.items)) {
      order.items.forEach((orderItem) => {
        if (orderItem?.item) {
          const itemName = `${orderItem.item.deviceName} ${orderItem.item.storage}`;
          const quantity = orderItem.quantity.toString();
          const rate = formatPrice(orderItem.item.pricePerUnit);
          const amount = formatPrice(
            orderItem.item.pricePerUnit * orderItem.quantity,
          );

          tableData.push([itemName, quantity, rate, amount]);
        }
      });
    }

    autoTable(doc, {
      head: [["Item", "Quantity", "Rate", "Amount"]],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80 }, // Item
        1: { cellWidth: 30, halign: "center" }, // Quantity
        2: { cellWidth: 35, halign: "right" }, // Rate
        3: { cellWidth: 35, halign: "right" }, // Amount
      },
    });

    // Get final Y position after table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || yPos + 50;

    // Financial Summary
    let summaryY = finalY + 10;
    const summaryX = pageWidth - margin - 60;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Subtotal
    doc.text("Subtotal:", summaryX, summaryY, { align: "right" });
    doc.text(formatPrice(order.subtotal), pageWidth - margin, summaryY, {
      align: "right",
    });

    summaryY += 5;
    // Tax
    if (order.taxAmount && order.taxRate) {
      const taxPercent = (order.taxRate * 100).toFixed(2);
      doc.text(`Tax (${taxPercent}%):`, summaryX, summaryY, { align: "right" });
      doc.text(formatPrice(order.taxAmount), pageWidth - margin, summaryY, {
        align: "right",
      });
      summaryY += 5;
    }

    // Discount (if applicable)
    const discount = order.discountAmount || 0;
    if (discount > 0) {
      doc.text("Discount:", summaryX, summaryY, { align: "right" });
      doc.text(`-${formatPrice(discount)}`, pageWidth - margin, summaryY, {
        align: "right",
      });
      summaryY += 5;
    }

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total:", summaryX, summaryY, { align: "right" });
    const finalTotal = order.totalPrice; // Already includes discount in calculation
    doc.text(formatPrice(finalTotal), pageWidth - margin, summaryY, {
      align: "right",
    });

    // Footer: Notes and Terms
    // Calculate footer position with more padding from bottom
    const bottomPadding = 25; // Increased padding from bottom to prevent cutoff
    // Track current Y position for terms
    let currentFooterY = pageHeight - bottomPadding;

    // Only show Notes section if there's actual user content (not just HST number)
    // Check if invoiceNotes exists and has meaningful content
    const hasUserNotes = invoiceData.invoiceNotes && 
                         typeof invoiceData.invoiceNotes === 'string' && 
                         invoiceData.invoiceNotes.trim().length > 0;
    
    if (hasUserNotes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, currentFooterY);

      doc.setFont("helvetica", "normal");
      const notesY = currentFooterY + 5;
      // Split notes into multiple lines if needed
      const notesLines = doc.splitTextToSize(invoiceData.invoiceNotes.trim(), pageWidth - (margin * 2));
      doc.text(notesLines, margin, notesY);
      currentFooterY = notesY + (notesLines.length * 4.5) + 8; // Move down after notes with spacing
    }

    // Terms section - always show if present
    if (invoiceData.invoiceTerms) {
      // Check if we have enough space, if not, add a new page
      if (currentFooterY > pageHeight - 50) {
        doc.addPage();
        currentFooterY = margin + 10;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Terms:", margin, currentFooterY);
      currentFooterY += 5;

      doc.setFont("helvetica", "normal");
      // Split terms into multiple lines to prevent cutoff
      const termsLines = doc.splitTextToSize(invoiceData.invoiceTerms, pageWidth - (margin * 2));
      
      // Check if terms will fit on current page
      const termsHeight = termsLines.length * 4.5; // Slightly more spacing between lines
      if (currentFooterY + termsHeight > pageHeight - bottomPadding) {
        // Add new page if needed
        doc.addPage();
        currentFooterY = margin + 10;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Terms:", margin, currentFooterY);
        currentFooterY += 5;
        doc.setFont("helvetica", "normal");
      }
      
      // Write terms with proper line spacing to prevent cutoff
      termsLines.forEach((line: string, index: number) => {
        doc.text(line, margin, currentFooterY + (index * 4.5));
      });
    }

    // HST Number - show at the very bottom if not in notes
    // Only show if there's no user notes (HST is shown separately)
    if (invoiceData.hstNumber && (!invoiceData.invoiceNotes || !invoiceData.invoiceNotes.trim())) {
      const hstY = pageHeight - bottomPadding + 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`HST: ${invoiceData.hstNumber}`, margin, hstY);
    }

    // Download PDF
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const filename = `invoice-${invoiceData.invoiceNumber.replace("#", "")}.pdf`;

    if (isIOS || isMobile) {
      try {
        const pdfBlob = doc.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.target = "_blank";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(blobUrl);
        }, 200);
      } catch (error) {
        const pdfDataUri = doc.output("datauristring");
        window.open(pdfDataUri, "_blank");
      }
    } else {
      doc.save(filename);
    }
  } catch (error) {
    throw new Error("Failed to generate invoice PDF");
  }
}
