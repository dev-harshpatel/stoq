/**
 * Invoice PDF generation utility
 * Generates PDF invoices using @react-pdf/renderer
 */

import { pdf } from "@react-pdf/renderer";
import { InvoiceData, CompanyInfo } from "@/types/invoice";
import { InvoicePDFDocument } from "@/components/InvoicePDFDocument";
import { Order } from "@/types/order";
import { supabase } from "../supabase/client/browser";
import { downloadBlob } from "../export/download";
import { DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_ADDRESS } from "../constants";

/**
 * Get company information from settings or defaults
 */
async function getCompanyInfo(): Promise<
  CompanyInfo & { logoUrl?: string | null }
> {
  try {
    // Try to get company settings from database
    const { data, error } = await supabase
      .from("company_settings")
      .select("company_name, company_address, hst_number, logo_url")
      .single();

    if (!error && data) {
      const companyData = data as {
        company_name: string | null;
        company_address: string | null;
        hst_number: string | null;
        logo_url: string | null;
      };

      return {
        name:
          companyData.company_name ||
          process.env.NEXT_PUBLIC_COMPANY_NAME ||
          DEFAULT_COMPANY_NAME,
        address:
          companyData.company_address ||
          process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
          DEFAULT_COMPANY_ADDRESS,
        hstNumber:
          companyData.hst_number ||
          process.env.NEXT_PUBLIC_COMPANY_HST_NUMBER ||
          "",
        logoUrl: companyData.logo_url,
      };
    }
  } catch (error) {
    console.error("Error fetching company settings:", error);
  }

  // Fallback to environment variables
  return {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || DEFAULT_COMPANY_NAME,
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || DEFAULT_COMPANY_ADDRESS,
    hstNumber: process.env.NEXT_PUBLIC_COMPANY_HST_NUMBER || "",
    logoUrl: null,
  };
}

/**
 * Generate invoice PDF using @react-pdf/renderer
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
  }
): Promise<void> {
  try {
    // Get company information with logo
    const companyInfo = await getCompanyInfo();

    // Create PDF document
    const pdfDocument = (
      <InvoicePDFDocument
        companyInfo={companyInfo}
        customerInfo={customerInfo || {}}
        invoiceData={invoiceData}
        order={order}
      />
    );

    // Generate PDF blob
    const blob = await pdf(pdfDocument).toBlob();

    // Download PDF
    const filename = `invoice-${invoiceData.invoiceNumber.replace(
      "#",
      ""
    )}.pdf`;

    downloadBlob(blob, filename);
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);
    throw new Error("Failed to generate invoice PDF");
  }
}
