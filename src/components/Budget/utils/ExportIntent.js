import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPurchaseIntents = async (
  department,
  fiscalYear,
  intents = []
) => {
  try {
    if (!intents || intents.length === 0) {
      alert("No purchase intents available to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Intents");

    // 🧠 Title
    const title = `${department.toUpperCase()} Purchase Intents FY${fiscalYear}`;
    const titleRow = sheet.addRow([title]);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells("A1:H1");

    // 🧾 Headers (added separate Title & Description)
    const headers = [
      "Title",
      "Description",
      "Component",
      "Total Estimate (₹)",
      "Status",
      "Urgency",
      "Created By",
      "Created Date",
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
    intents.forEach((intent) => {
      const createdDate = intent.createdAt?.seconds
        ? new Date(intent.createdAt.seconds * 1000).toLocaleDateString("en-IN")
        : "-";

      const row = sheet.addRow([
        intent.title || "-", // Title
        intent.description || "-", // Description
        intent.selectedBudgetComponent || "-", // Component
        intent.estimatedTotal || 0, // Total Estimate
        intent.status || "submitted", // Status
        intent.urgency || "-", // Urgency
        intent.ownerName || "-", // Created By
        createdDate, // Created Date
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

    // 🧱 Adjusted column widths (compact view)
    const widths = [25, 40, 18, 16, 14, 14, 20, 16];
    sheet.columns.forEach((col, i) => {
      col.width = widths[i] || 18;
    });

    // 💾 Export
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${department.toUpperCase()}_PurchaseIntents_FY${fiscalYear}.xlsx`
    );
  } catch (err) {
    console.error("Error exporting purchase intents:", err);
    alert("Failed to export purchase intents.");
  }
};
