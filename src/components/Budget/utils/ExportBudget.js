import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportBudget = async (department, fiscalYear, budgetData) => {
  try {
    if (!budgetData) {
      alert(`No budget data provided for ${department}`);
      return;
    }

    const rows = [];

    // Helper to add sections
    const addSection = (title, data, isComponent = false) => {
      if (!data || Object.keys(data).length === 0) return;
      let firstRow = true;
      Object.entries(data).forEach(([key, val]) => {
        let approved, spent, remaining, percent;

        if (isComponent) {
          approved = val.allocated || 0;
          spent = val.spent || 0;
          remaining = approved - spent;
          percent = approved
            ? ((spent / approved) * 100).toFixed(2) + "%"
            : "0%";
        } else {
          approved = val || 0;
          spent = "-";
          remaining = "-";
          percent = "-";
        }

        rows.push([
          firstRow ? title : "",
          key.replace(/_/g, " ").toUpperCase(),
          approved,
          percent,
          spent,
          remaining,
        ]);
        firstRow = false;
      });
    };

    // 🧾 1️⃣ Fixed Costs
    addSection("Fixed Cost", budgetData.fixedCosts);

    // 🧾 2️⃣ Department Expense
    addSection(
      "Department Expense",
      budgetData.departmentExpenses || {},
      false
    );
    addSection("", budgetData.components || {}, true);

    // 🧾 3️⃣ CSDD Section (skip 0-value defaults)
    const mergedCsddData = {
      ...(budgetData.csddExpenses || {}),
      ...(budgetData.csddComponents
        ? Object.fromEntries(
            Object.entries(budgetData.csddComponents).map(([k, v]) => [
              k,
              { allocated: v.allocated || 0, spent: v.spent || 0 },
            ])
          )
        : {}),
    };

    // 🧹 Filter out default CSDD items that are 0
    const filteredCsddData = Object.fromEntries(
      Object.entries(mergedCsddData).filter(([key, val]) => {
        const value =
          typeof val === "object" ? val.allocated || val.spent || 0 : val;
        return value > 0; // ✅ Keep only if non-zero
      })
    );

    addSection("CSDD Component", filteredCsddData, true);

    // 🧮 4️⃣ Total Row
    const totalApproved = rows.reduce(
      (sum, r) => sum + (typeof r[2] === "number" ? r[2] : 0),
      0
    );
    const totalSpent = rows.reduce(
      (sum, r) => sum + (typeof r[4] === "number" ? r[4] : 0),
      0
    );
    const totalRemaining = totalApproved - totalSpent;
    const spentPercent =
      totalApproved > 0
        ? ((totalSpent / totalApproved) * 100).toFixed(2) + "%"
        : "0%";

    rows.push([
      "TOTAL",
      "",
      totalApproved,
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

    // Header row
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

    // Data rows
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

    // Merge category cells for sections
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

    mergeSection("Fixed Cost");
    mergeSection("Department Expense");
    mergeSection("CSDD Component");

    // 🟨 Total row style
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
