/**
 * Invoice PDF Document Component using @react-pdf/renderer
 * Beautiful, professional invoice design with logo support
 */

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { InvoiceData } from "@/types/invoice";
import { Order } from "@/types/order";

interface InvoicePDFDocumentProps {
  companyInfo: {
    name: string;
    address: string;
    hstNumber: string;
    logoUrl?: string | null;
  };
  customerInfo: {
    businessName?: string | null;
    businessAddress?: string | null;
  };
  invoiceData: InvoiceData;
  order: Order;
}

// Register fonts (optional - using default Helvetica)
// You can add custom fonts here if needed

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
  },
  // Header Section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: "column",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 10,
  },
  invoiceDetails: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 3,
  },
  invoiceDetailsBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 3,
  },
  // Bill To / Ship To Section
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 20,
  },
  addressBox: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    border: "1 solid #e5e7eb",
  },
  addressTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 8,
  },
  addressName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 5,
  },
  addressText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  // Table Section
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    padding: 10,
    minHeight: 35,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    backgroundColor: "#fafafa",
    padding: 10,
    minHeight: 35,
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  // Column widths
  colItem: {
    width: "45%",
    paddingRight: 10,
  },
  colQuantity: {
    width: "15%",
    textAlign: "center",
  },
  colRate: {
    width: "20%",
    textAlign: "right",
    paddingRight: 10,
  },
  colAmount: {
    width: "20%",
    textAlign: "right",
  },
  // Summary Section
  summarySection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  summaryBox: {
    width: 250,
    border: "1 solid #e5e7eb",
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottom: "1 solid #e5e7eb",
  },
  summaryRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 10,
    color: "#1f2937",
  },
  summaryLabelBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  summaryValueBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#2563eb",
    padding: 12,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  // Balance Due Box
  balanceDueBox: {
    width: 250,
    backgroundColor: "#fef3c7",
    border: "2 solid #fbbf24",
    borderRadius: 4,
    padding: 15,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceDueLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#78350f",
  },
  balanceDueValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#78350f",
  },
  // Footer Section
  footer: {
    marginTop: 40,
  },
  footerSection: {
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 6,
  },
  footerText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  hstText: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 10,
  },
});

/**
 * Format price for display
 */
const formatPrice = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Format date for display
 */
const formatDate = (dateString: string | null | undefined): string => {
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
};

/**
 * Invoice PDF Document Component
 */
export const InvoicePDFDocument = ({
  companyInfo,
  customerInfo,
  invoiceData,
  order,
}: InvoicePDFDocumentProps) => {
  // Prepare table data
  const tableRows = Array.isArray(order.items)
    ? order.items.map((orderItem) => {
        if (orderItem?.item) {
          const itemName = `${orderItem.item.deviceName} ${orderItem.item.storage}`;
          const quantity = orderItem.quantity;
          const itemPrice =
            orderItem.item.sellingPrice ?? orderItem.item.pricePerUnit;
          const rate = itemPrice;
          const amount = itemPrice * orderItem.quantity;
          return { itemName, quantity, rate, amount };
        }
        return null;
      })
    : [];

  // Filter out null values
  const validRows = tableRows.filter((row) => row !== null) as Array<{
    itemName: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;

  // Calculate financial summary
  const discount = order.discountAmount || 0;
  const shipping = order.shippingAmount || 0;
  const result = order.subtotal - discount + shipping;
  const finalTotal = order.totalPrice;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companyInfo.logoUrl && (
              <Image style={styles.logo} src={companyInfo.logoUrl} />
            )}
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyAddress}>{companyInfo.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceDetailsBold}>
              # {invoiceData.invoiceNumber}
            </Text>
            <Text style={styles.invoiceDetails}>
              Date: {formatDate(invoiceData.invoiceDate)}
            </Text>
            <Text style={styles.invoiceDetails}>
              Payment Terms: {invoiceData.paymentTerms}
            </Text>
            <Text style={styles.invoiceDetails}>
              Due Date: {formatDate(invoiceData.dueDate)}
            </Text>
            <Text style={styles.invoiceDetails}>
              PO Number: {invoiceData.poNumber}
            </Text>
          </View>
        </View>

        {/* Bill To / Ship To Section */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Bill To:</Text>
            <Text style={styles.addressName}>
              {customerInfo.businessName || "Customer"}
            </Text>
            {customerInfo.businessAddress && (
              <Text style={styles.addressText}>
                {customerInfo.businessAddress}
              </Text>
            )}
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Ship To:</Text>
            <Text style={styles.addressName}>
              {customerInfo.businessName || "Customer"}
            </Text>
            {customerInfo.businessAddress && (
              <Text style={styles.addressText}>
                {customerInfo.businessAddress}
              </Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>
              Quantity
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
              Amount
            </Text>
          </View>

          {/* Table Rows */}
          {validRows.map((row, index) => (
            <View
              key={index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCellBold, styles.colItem]}>
                {row.itemName}
              </Text>
              <Text style={[styles.tableCell, styles.colQuantity]}>
                {row.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.colRate]}>
                {formatPrice(row.rate)}
              </Text>
              <Text style={[styles.tableCellBold, styles.colAmount]}>
                {formatPrice(row.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            {/* Subtotal */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.subtotal)}
              </Text>
            </View>

            {/* Discount */}
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={styles.summaryValue}>
                  -{formatPrice(discount)}
                </Text>
              </View>
            )}

            {/* Shipping */}
            {shipping > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping:</Text>
                <Text style={styles.summaryValue}>{formatPrice(shipping)}</Text>
              </View>
            )}

            {/* Result */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Result:</Text>
              <Text style={styles.summaryValueBold}>{formatPrice(result)}</Text>
            </View>

            {/* Tax */}
            {order.taxAmount && order.taxRate && (
              <View style={styles.summaryRowLast}>
                <Text style={styles.summaryLabel}>
                  Tax ({(order.taxRate * 100).toFixed(2)}%):
                </Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(order.taxAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Total */}
          <View style={styles.summaryBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatPrice(finalTotal)}</Text>
            </View>
          </View>

          {/* Balance Due */}
          <View style={styles.balanceDueBox}>
            <Text style={styles.balanceDueLabel}>Balance Due:</Text>
            <Text style={styles.balanceDueValue}>
              {formatPrice(finalTotal)}
            </Text>
          </View>
        </View>

        {/* Footer: Notes and Terms */}
        <View style={styles.footer}>
          {/* Notes Section */}
          {invoiceData.invoiceNotes &&
            invoiceData.invoiceNotes.trim().length > 0 && (
              <View style={styles.footerSection}>
                <Text style={styles.footerTitle}>Notes:</Text>
                <Text style={styles.footerText}>
                  {invoiceData.invoiceNotes.trim()}
                </Text>
              </View>
            )}

          {/* Terms Section */}
          {invoiceData.invoiceTerms && (
            <View style={styles.footerSection}>
              <Text style={styles.footerTitle}>Terms:</Text>
              <Text style={styles.footerText}>{invoiceData.invoiceTerms}</Text>
            </View>
          )}

          {/* HST Number */}
          {invoiceData.hstNumber &&
            (!invoiceData.invoiceNotes || !invoiceData.invoiceNotes.trim()) && (
              <Text style={styles.hstText}>HST: {invoiceData.hstNumber}</Text>
            )}
        </View>
      </Page>
    </Document>
  );
};
