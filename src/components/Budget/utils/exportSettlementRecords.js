// FILE: utils/exportSettlementLogs.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportSettlementLogs = async (logs, contextTitle) => {
  try {
    if (!logs || logs.length === 0) {
      alert("No data to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Settlement Logs");

    // 1. 🧠 Title Row
    const titleRow = sheet.addRow([contextTitle]);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells("A1:G1"); // Merging across 7 columns

    // 2. 🧱 Header Row
    const headers = [
      "Date",
      "Employee Name",
      "Employee ID",
      "Action Type",
      "Context / Component",
      "Processed By (Admin)",
      "Amount (₹)",
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD97706" }, // Amber-600 color match
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 3. 🧮 Data Rows
    let totalAmount = 0;

    logs.forEach((log) => {
      const date = log.timestamp?.toDate
        ? log.timestamp.toDate().toLocaleDateString("en-IN")
        : "-";

      const modeLabel =
        log.mode === "return" ? "Refund (Returned)" : "Carry Forward";
      const amount = Number(log.amount) || 0;
      totalAmount += amount;

      const row = sheet.addRow([
        date,
        log.employeeName || "Unknown",
        log.employeeId || "-",
        modeLabel,
        log.component || "-",
        log.performedByName || "System",
        amount,
      ]);

      // Apply borders to data cells
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };

        // Right align amount column
        if (colNumber === 7) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.numFmt = "₹#,##0";
        }
      });
    });

    // 4. 💰 Total Row
    const totalRow = sheet.addRow([
      "TOTAL VOLUME",
      "",
      "",
      "",
      "",
      "",
      totalAmount,
    ]);

    totalRow.font = { bold: true };
    totalRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2CC" }, // Light yellow
      };
      cell.border = { top: { style: "double" } };

      if (colNumber === 7) {
        cell.numFmt = "₹#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });

    // 5. 📏 Auto-fit Columns
    sheet.columns.forEach((col) => {
      let maxLength = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLength) maxLength = len;
      });
      col.width = maxLength + 5;
    });

    // 6. 💾 Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const cleanTitle = contextTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${cleanTitle}.xlsx`,
    );
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to generate Excel file.");
  }
};
