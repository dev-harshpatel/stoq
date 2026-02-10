import { InventoryItem, formatPrice } from "@/data/inventory";
import { writeFile, utils } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (items: InventoryItem[], filename: string = "inventory") => {
  try {
    // Prepare data for Excel (excluding Price Change and Last Updated)
    const data = items.map((item) => ({
      "Device Name": item.deviceName,
      Brand: item.brand,
      Grade: item.grade,
      Storage: item.storage,
      Quantity: item.quantity,
      "Price (CAD)": item.sellingPrice,
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
      formatPrice(item.sellingPrice),
      item.lastUpdated,
    ]);

    // Add table
    autoTable(doc, {
      head: [["Device Name", "Brand", "Grade", "Storage", "Qty", "Price", "Last Updated"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 58, 96], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 30, left: 10, right: 10 },
    });

    // Check if we're on iOS/mobile device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isIOS || isMobile) {
      // For iOS and mobile devices, use blob URL approach
      try {
        const pdfBlob = doc.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Create a temporary anchor element
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${filename}.pdf`;
        link.target = "_blank"; // Open in new tab as fallback for iOS
        link.style.display = "none";
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        
        // Clean up after a delay
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(blobUrl);
        }, 200);
      } catch (error) {
        // Fallback: open PDF in new window if blob approach fails
        const pdfDataUri = doc.output("datauristring");
        window.open(pdfDataUri, "_blank");
      }
    } else {
      // For desktop browsers, use the standard save method
      doc.save(`${filename}.pdf`);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

