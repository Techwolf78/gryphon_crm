import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportBudget = async (department, fiscalYear, budgetData) => {
  try {
    if (!budgetData) {
      alert(`No budget data provided for ${department}`);
      return;
    }

    const rows = [];

    // Helper to add a section (used for each of the 3 categories)
    const addSection = (title, data) => {
      if (!data || Object.keys(data).length === 0) return;
      let firstRow = true;
      Object.entries(data).forEach(([key, val]) => {
        const allocated = val?.allocated || 0;
        const spent = val?.spent || 0;
        const remaining = allocated - spent;
        const percent = allocated
          ? ((spent / allocated) * 100).toFixed(2) + "%"
          : "0%";

        rows.push([
          firstRow ? title : "",
          key.replace(/_/g, " ").toUpperCase(),
          allocated,
          percent,
          spent,
          remaining,
        ]);
        firstRow = false;
      });
    };

    // 🧾 1️⃣ Fixed Costs
    addSection("Fixed Costs", budgetData.fixedCosts);

    // 🧾 2️⃣ Department Expenses
    addSection("Department Expenses", budgetData.departmentExpenses);

    // 🧾 3️⃣ CSDD Expenses
    addSection("CSDD Expenses", budgetData.csddExpenses);

    // 🧮 4️⃣ Total Row
    const totalAllocated = rows.reduce(
      (sum, r) => sum + (typeof r[2] === "number" ? r[2] : 0),
      0
    );
    const totalSpent = rows.reduce(
      (sum, r) => sum + (typeof r[4] === "number" ? r[4] : 0),
      0
    );
    const totalRemaining = totalAllocated - totalSpent;
    const spentPercent =
      totalAllocated > 0
        ? ((totalSpent / totalAllocated) * 100).toFixed(2) + "%"
        : "0%";

    rows.push([
      "TOTAL",
      "",
      totalAllocated,
      spentPercent,
      totalSpent,
      totalRemaining,
    ]);

    // 🧾 Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Budget Summary");

    // 🧠 Title row
    const title = `${department.toUpperCase()} Budget ${fiscalYear}`;
    const titleRow = sheet.addRow([title]);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells("A1:F1");

    // 🧱 Header row
    const header = [
      "Category",
      "Description",
      "Amount Approved",
      "Spent %",
      "Amount Spent",
      "Amount Remaining",
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🧮 Data rows
    rows.forEach((r) => {
      const row = sheet.addRow(r);
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

    // 📊 Merge section headers for category grouping
    const mergeSection = (categoryName) => {
      const startRow =
        sheet._rows.findIndex((r) => r?.getCell(1)?.value === categoryName) + 1;
      if (startRow <= 0) return;

      let endRow = startRow;
      for (let i = startRow + 1; i <= sheet.rowCount; i++) {
        const cellValue = sheet.getCell(`A${i}`).value;
        if (cellValue === "") endRow = i;
        else break;
      }

      if (endRow > startRow) {
        sheet.mergeCells(`A${startRow}:A${endRow}`);
        const mergedCell = sheet.getCell(`A${startRow}`);
        mergedCell.alignment = { vertical: "middle", horizontal: "center" };
        mergedCell.font = { bold: true };
      }
    };

    mergeSection("Fixed Costs");
    mergeSection("Department Expenses");
    mergeSection("CSDD Expenses");

    // 💛 Style total row
    const totalRow = sheet.lastRow;
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2CC" },
      };
    });

    // 📏 Auto-fit column widths
    sheet.columns.forEach((col) => {
      let maxLength = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLength) maxLength = len;
      });
      col.width = maxLength + 5;
    });

    // 💾 Save Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${department.toUpperCase()} Budget ${fiscalYear}.xlsx`
    );
  } catch (error) {
    console.error("Error exporting budget:", error);
    alert("Failed to export budget. Check console for details.");
  }
};
