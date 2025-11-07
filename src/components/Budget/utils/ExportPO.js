import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPurchaseOrders = async (
  department,
  fiscalYear,
  orders = []
) => {
  try {
    if (!orders || orders.length === 0) {
      alert("No purchase orders available to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Orders");

    // 🧠 Title
    const title = `${department.toUpperCase()} Purchase Orders FY${fiscalYear}`;
    const titleRow = sheet.addRow([title]);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells("A1:I1");

    // 🧾 Header row (split Title & Description)
    const headers = [
      "PO Number",
      "Title",
      "Description",
      "Vendor",
      "Total Cost (₹)",
      "Status",
      "Component",
      "Approved By",
      "Approved Date",
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🧩 Data rows
    orders.forEach((order) => {
      const approvedDate = order.approvedAt?.seconds
        ? new Date(order.approvedAt.seconds * 1000).toLocaleDateString("en-IN")
        : "-";

      const row = sheet.addRow([
        order.poNumber || "-",
        order.title || "-",
        order.description || "-",
        order.vendorDetails.name || "-",
        order.finalAmount || order.totalCost || 0,
        order.status || "pending",
        order.budgetComponent || "-",
        order.approvedByName || "Purchase Dept",
        approvedDate,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });
    });

    // 🧱 Compact column widths
    const widths = [16, 25, 40, 20, 16, 14, 18, 20, 16];
    sheet.columns.forEach((col, i) => {
      col.width = widths[i] || 18;
    });

    // 💾 Export Excel
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${department.toUpperCase()}_PurchaseOrders_FY${fiscalYear}.xlsx`
    );
  } catch (err) {
    console.error("Error exporting purchase orders:", err);
    alert("Failed to export purchase orders.");
  }
};
