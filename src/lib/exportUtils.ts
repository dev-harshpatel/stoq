import { InventoryItem, formatPrice } from "@/data/inventory";
import { writeFile, utils } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (items: InventoryItem[], filename: string = "inventory") => {
  try {
    // Prepare data for Excel
    const data = items.map((item) => ({
      "Device Name": item.deviceName,
      Brand: item.brand,
      Grade: item.grade,
      Storage: item.storage,
      Quantity: item.quantity,
      "Price/Unit (CAD)": item.pricePerUnit,
      "Last Updated": item.lastUpdated,
      "Price Change": item.priceChange || "stable",
    }));

    // Create workbook and worksheet
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Inventory");

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Device Name
      { wch: 12 }, // Brand
      { wch: 8 }, // Grade
      { wch: 12 }, // Storage
      { wch: 10 }, // Quantity
      { wch: 15 }, // Price/Unit
      { wch: 15 }, // Last Updated
      { wch: 12 }, // Price Change
    ];
    worksheet["!cols"] = columnWidths;

    // Generate Excel file
    writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    return false;
  }
};

export const exportToPDF = (items: InventoryItem[], filename: string = "inventory") => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add title
    doc.setFontSize(18);
    doc.text("Inventory Report", pageWidth / 2, 15, { align: "center" });

    // Add date
    doc.setFontSize(10);
    const date = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Generated on: ${date}`, pageWidth / 2, 22, { align: "center" });

    // Prepare table data
    const tableData = items.map((item) => [
      item.deviceName,
      item.brand,
      item.grade,
      item.storage,
      item.quantity.toString(),
      formatPrice(item.pricePerUnit),
      item.lastUpdated,
    ]);

    // Add table
    autoTable(doc, {
      head: [["Device Name", "Brand", "Grade", "Storage", "Qty", "Price/Unit", "Last Updated"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 58, 96], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 30, left: 10, right: 10 },
    });

    // Save PDF
    doc.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    return false;
  }
};

