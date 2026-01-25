/**
 * Invoice utility functions for generating invoice numbers and PO numbers
 */

import { supabase } from './supabase/client';

/**
 * Generate invoice number in format #NN + DDMMYY
 * @param orderDate - Date of the order
 * @returns Invoice number string (e.g., #01212026)
 */
export async function generateInvoiceNumber(orderDate: Date): Promise<string> {
  try {
    // Format date as DDMMYY
    const day = String(orderDate.getDate()).padStart(2, '0');
    const month = String(orderDate.getMonth() + 1).padStart(2, '0');
    const year = String(orderDate.getFullYear()).slice(-2);
    const dateString = `${day}${month}${year}`;

    // Query existing invoices with same date (DDMMYY)
    // Extract date part from invoice_number (last 6 characters should match)
    // Format is #NN + DDMMYY, so we check if invoice_number ends with dateString
    const { data: existingInvoices, error } = await supabase
      .from('orders')
      .select('invoice_number')
      .not('invoice_number', 'is', null)
      .like('invoice_number', `%${dateString}`);

    if (error) {
      // If error, default to 01
      return `#01${dateString}`;
    }

    // Count how many invoices exist for this date
    const count = existingInvoices?.length || 0;
    
    // Next number = count + 1
    const nextNumber = count + 1;
    
    // Format as 2-digit with leading zero
    const numberString = String(nextNumber).padStart(2, '0');
    
    // Return #NN + DDMMYY
    return `#${numberString}${dateString}`;
  } catch (error) {
    // On error, default to 01
    const day = String(orderDate.getDate()).padStart(2, '0');
    const month = String(orderDate.getMonth() + 1).padStart(2, '0');
    const year = String(orderDate.getFullYear()).slice(-2);
    const dateString = `${day}${month}${year}`;
    return `#01${dateString}`;
  }
}

/**
 * Generate PO number in same format as invoice number
 * @param orderDate - Date of the order
 * @returns PO number string (e.g., #01212026)
 */
export async function generatePONumber(orderDate: Date): Promise<string> {
  // PO number uses same format as invoice number
  return generateInvoiceNumber(orderDate);
}

/**
 * Calculate due date based on payment terms
 * @param invoiceDate - Invoice date
 * @param paymentTerms - Payment terms (e.g., "CHQ", "NET 30", "Due on Receipt")
 * @returns Due date string (YYYY-MM-DD format)
 */
export function calculateDueDate(invoiceDate: string, paymentTerms: string): string {
  const date = new Date(invoiceDate);
  
  if (paymentTerms === 'CHQ' || paymentTerms === 'EMT' || paymentTerms === 'WIRE') {
    // Payment on receipt = same day
    return invoiceDate;
  }
  
  // Default: same day (for CHQ, EMT, WIRE)
  return invoiceDate;
}
