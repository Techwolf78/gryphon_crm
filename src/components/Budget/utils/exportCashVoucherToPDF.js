// FILE: /components/budget/csdd/utils/exportCashVoucherToPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* --------------------- HELPERS --------------------- */

const safe = (v, f = "-") =>
  v === undefined || v === null || v === "" ? f : String(v);

const parseDate = (d) => {
  if (!d) return null;
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000);
  if (d.toDate) return d.toDate();
  return new Date(d);
};

const formatNum = (n) => {
  const num = Number(n);
  return isNaN(num) ? "-" : num.toLocaleString("en-IN");
};

const short = (d) => {
  const dt = parseDate(d);
  if (!dt) return "-";
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1,
  ).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
};

// Safe number parser
const parseValue = (val) => {
  if (val == null || val === "-" || val === "") return 0;
  const strVal = val.toString().replace(/,/g, "");
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

/* -------------------------------------------------- */
/* MAIN EXPORT FUNCTION                 */
/* -------------------------------------------------- */

export default async function exportCashVoucherToPDF(voucher, budgetData = {}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const marginX = 15;

  /* ---------------- GLOBAL BORDER STYLING ---------------- */
  // We set defaults but override them inside autoTable calls for specific sizing
  autoTable.defaults = {
    ...autoTable.defaults,
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.1, // Thinner lines to save space
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
  };

  /* ==================================================================
     INTERNAL HELPER: Draw one copy of the voucher at specific Y
     ================================================================== */
  const printVoucherCopy = (startY) => {
    let Y = startY;

    // --- LOGO & HEADER ---
    try {
      // Slightly smaller logo to save vertical space
      pdf.addImage("/gryphon_logo.png", "PNG", 14, Y, 35, 20);
    } catch {}

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14); // Reduced from 18
    pdf.text("GRYPHON ACADEMY PRIVATE LIMITED", 120, Y + 8, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9); // Reduced from 10
    pdf.text("www.gryphonacademy.co.in", 120, Y + 13, { align: "center" });
    pdf.text(
      "9th Floor, Olympia Business House, Baner, Pune - 411045",
      120,
      Y + 17,
      {
        align: "center",
      },
    );
    pdf.text(
      "Mumbai Bangalore Highway Baner 411045 Pune Maharashtra",
      120,
      Y + 21,
      {
        align: "center",
      },
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("--- Cash Voucher ---", 120, Y + 29, { align: "center" });

    Y += 33; // Move down for table

    // --- MAIN TABLE ---
    const mainRows = [
      [
        { content: "Name", styles: { fontStyle: "bold", cellWidth: 35 } },
        { content: safe(voucher.name) },
        { content: "Date", styles: { fontStyle: "bold", cellWidth: 30 } },
        { content: short(voucher.createdAt || voucher.date) },
      ],
      [
        { content: "Mode of Payment", styles: { fontStyle: "bold" } },
        { content: "Cash" },
        { content: "Location", styles: { fontStyle: "bold" } },
        { content: safe(voucher.location) },
      ],
      [
        { content: "Purpose", styles: { fontStyle: "bold" } },
        {
          content: safe(voucher.visitPurpose || voucher.description),
          colSpan: 3,
        },
      ],
      [
        { content: "Amount Given", styles: { fontStyle: "bold" } },
        {
          content: `Rs. ${formatNum(voucher.totalAmount || 0)}`,
          colSpan: 3,
          styles: { fontStyle: "bold" },
        },
      ],
      [
        { content: "Amount in Words", styles: { fontStyle: "bold" } },
        { content: safe(voucher.amountInWords || "N/A"), colSpan: 3 },
      ],
    ];

    autoTable(pdf, {
      startY: Y,
      head: [],
      body: mainRows,
      theme: "grid",
      margin: { left: marginX, right: marginX },
      // Compact styles to ensure fit
      styles: {
        fontSize: 9,
        cellPadding: 2, // Reduced padding
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
    });

    Y = pdf.lastAutoTable.finalY + 8; // Small gap before signatures

    // --- SIGNATURES ---
    const sigLabels = [
      "Sign\n(Intender)",
      "Sign\n(HR/Finance)",
      "Sign\n(Delivery Head)",
      "Sign\n(Co-Founder)",
      "Sign\n(Founder)",
    ];

    const sigWidth = (W - marginX * 2 - 10) / 5; // Slightly tighter calculation
    let sx = marginX;

    // Draw boxes
    sigLabels.forEach(() => {
      pdf.setLineWidth(0.1);
      pdf.rect(sx, Y, sigWidth, 18); // Reduced height from 25 to 18
      sx += sigWidth + 2.5; // Reduced gap
    });

    // Draw Labels
    sx = marginX;
    const labelY = Y + 24; // Text below box

    pdf.setFontSize(7); // Reduced font
    pdf.setFont("helvetica", "normal");

    sigLabels.forEach((txt) => {
      const [l1, l2] = txt.split("\n");
      const cx = sx + sigWidth / 2;

      pdf.text(l1, cx, labelY, { align: "center" });
      if (l2) pdf.text(l2, cx, labelY + 3, { align: "center" });

      sx += sigWidth + 2.5;
    });
  };

  /* -------------------------------------------------- */
  /* EXECUTE PAGE 1 (TWO COPIES)          */
  /* -------------------------------------------------- */

  // 1. Top Copy
  printVoucherCopy(10);

  // 2. Cut Line (Middle of page)
  const middleY = H / 2;
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(150);
  pdf.setLineDash([3, 3], 0);
  pdf.line(10, middleY, W - 10, middleY);

  // Reset line styles for next copy
  pdf.setLineDash([], 0);
  pdf.setDrawColor(0);

  // 3. Bottom Copy
  printVoucherCopy(middleY + 10);

  /* -------------------------------------------------- */
  /* PAGE 2 — BUDGET SUMMARY (Standard)       */
  /* -------------------------------------------------- */

  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);

  pdf.text(
    `${voucher.department?.toUpperCase() || "DEPARTMENT"} BUDGET SUMMARY`,
    105,
    20,
    { align: "center" },
  );

  const rows = [];
  const addSection = (title, data) => {
    if (!data || Object.keys(data).length === 0) return;
    let first = true;
    Object.entries(data).forEach(([key, val]) => {
      const approved = val?.allocated ?? 0;
      const spent = val?.spent ?? 0;
      const remaining = approved - spent;
      const percent = approved
        ? ((spent / approved) * 100).toFixed(1) + "%"
        : "-";

      rows.push([
        first ? title : "",
        key.replace(/_/g, " ").toUpperCase(),
        formatNum(approved),
        percent,
        formatNum(spent),
        formatNum(remaining),
      ]);
      first = false;
    });
  };

  if (
    voucher.status !== "approved" &&
    voucher.csddComponent &&
    budgetData.csddExpenses
  ) {
    const comp = voucher.csddComponent;
    const approvedComp = budgetData.csddExpenses[comp];
    if (approvedComp) {
      approvedComp.spent =
        Number(approvedComp.spent || 0) +
        Number(voucher.advanceUsed || voucher.totalAmount || 0);
    }
  }

  addSection("Fixed Costs", budgetData.fixedCosts || {});
  addSection("Department Expenses", budgetData.departmentExpenses || {});
  addSection("CSDD Expenses", budgetData.csddExpenses || {});

  const totalApproved = rows.reduce((sum, r) => sum + parseValue(r[2]), 0);
  const totalSpent = rows.reduce((sum, r) => sum + parseValue(r[4]), 0);
  const totalRemaining = totalApproved - totalSpent;
  const totalPercent =
    totalApproved > 0
      ? ((totalSpent / totalApproved) * 100).toFixed(1) + "%"
      : "-";

  rows.push([
    "TOTAL",
    "",
    formatNum(totalApproved),
    totalPercent,
    formatNum(totalSpent),
    formatNum(totalRemaining),
  ]);

  const highlightComponent =
    voucher.csddComponent?.replace(/_/g, " ").toUpperCase() || "";

  autoTable(pdf, {
    startY: 30,
    head: [
      [
        "Category",
        "Description",
        "Amount Approved",
        "Spent %",
        "Amount Spent",
        "Remaining",
      ],
    ],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40] },
    styles: { fontSize: 9, textColor: [40, 40, 40] },
    didParseCell: (data) => {
      const description = data.row.raw?.[1] || "";
      const isTotalRow = data.row.raw?.[0] === "TOTAL";
      if (description === highlightComponent && !isTotalRow) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = "bold";
      }
      if (isTotalRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  pdf.setFontSize(8);
  pdf.text("Generated via Gryphon Budget System", 105, 280, {
    align: "center",
  });

  /* -------------------------------------------------- */
  /* SAVE PDF                       */
  /* -------------------------------------------------- */

  const clean = safe(voucher.name).replace(/\s+/g, "_");
  pdf.save(
    `CashVoucher_${clean}_${short(voucher.startDate || voucher.date)}.pdf`,
  );
}
