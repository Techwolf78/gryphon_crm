// FILE: /components/budget/csdd/utils/exportReimbursementPDF.js
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

const short = (d) => {
  const dt = parseDate(d);
  if (!dt || isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatNum = (n) => {
  const num = Number(n);
  return isNaN(num) ? "-" : num.toLocaleString("en-IN");
};

const formatOrNA = (n) => {
  const num = Number(n);
  return isNaN(num) || num <= 0 ? "NA" : num.toLocaleString("en-IN");
};

// -------- SAFE NUMBER PARSER ---------
const parseValue = (val) => {
  if (val == null || val === "-" || val === "") return 0;
  const strVal = val.toString().replace(/,/g, "");
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

// ── Vector Icon Drawers (for footer) ──

const drawGlobeIcon = (pdf, cx, cy, r) => {
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.circle(cx, cy, r, "S");
  pdf.line(cx - r, cy, cx + r, cy);
  pdf.line(cx, cy - r, cx, cy + r);
  pdf.ellipse(cx, cy, r * 0.5, r, "S");
};

const drawEmailIcon = (pdf, cx, cy, r) => {
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  const w = r * 2.4;
  const h = r * 1.6;
  const left = cx - w / 2;
  const top = cy - h / 2;
  pdf.rect(left, top, w, h, "S");
  pdf.line(left, top, cx, cy + 0.3);
  pdf.line(left + w, top, cx, cy + 0.3);
};

const drawPhoneIcon = (pdf, cx, cy, r) => {
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  const w = r * 1.2;
  const h = r * 2;
  pdf.rect(cx - w / 2, cy - h / 2, w, h, "S");
  pdf.line(cx - w / 2 + 0.3, cy - h / 2 + 0.4, cx + w / 2 - 0.3, cy - h / 2 + 0.4);
  pdf.line(cx - w / 2 + 0.3, cy + h / 2 - 0.4, cx + w / 2 - 0.3, cy + h / 2 - 0.4);
};

const addFooterToAllPages = (pdf) => {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineY = pageHeight - 18;
  const textY = lineY + 5;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Horizontal divider
    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.4);
    pdf.line(14, lineY, pageWidth - 14, lineY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);

    // Globe + website
    const iconR = 1.5;
    drawGlobeIcon(pdf, 18, textY - 1, iconR);
    pdf.text("www.gryphonacademy.co.in", 22, textY);

    // Email + address
    drawEmailIcon(pdf, 82, textY - 1, iconR);
    pdf.text("connect@gryphonacademy.co.in", 86, textY);

    // Phone + number
    drawPhoneIcon(pdf, 152, textY - 1, iconR);
    pdf.text("8956444509", 156, textY);

    // Page number
    pdf.setFontSize(7);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: "right" },
    );
  }
};

/* -------------------------------------------------- */
/*               EXPORT REIMBURSEMENT PDF            */
/* -------------------------------------------------- */

export default async function exportReimbursementPDF(
  voucher = {},
  budgetData = {}
) {
  const pdf = new jsPDF("l", "mm", "a4"); // landscape
  const W = pdf.internal.pageSize.getWidth();
  const marginX = 15;
  let Y = 10;

  /* ---------------- GLOBAL BORDER STYLING ---------------- */
  autoTable.defaults = {
    ...autoTable.defaults,
    styles: {
      ...(autoTable.defaults?.styles || {}),
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      ...(autoTable.defaults?.headStyles || {}),
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      ...(autoTable.defaults?.bodyStyles || {}),
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    footStyles: {
      ...(autoTable.defaults?.footStyles || {}),
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
  };

  /* ---------------- LOGO + HEADER ---------------- */
  try {
    pdf.addImage(`${import.meta.env.BASE_URL}gryphon_logo.png`, "PNG", marginX, 8, 40, 22);
  } catch {
    // logo may be missing in some deployments
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("GRYPHON ACADEMY PRIVATE LIMITED", W / 2 + 20, 14, {
    align: "center",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("www.gryphonacademy.co.in", W / 2 + 20, 20, { align: "center" });
  pdf.text(
    "9th Floor, Olympia Business House, Baner, Pune - 411045",
    W / 2 + 20,
    25,
    { align: "center" }
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("--- Reimbursement Form ---", W / 2 + 20, 34, {
    align: "center",
  });

  Y = 40;

  /* ---------------- TOP INFO TABLE ---------------- */

  const fullTopWidth = W - marginX * 2;

  const topRows = [
    [
      { content: "Name of Employee", styles: { fontStyle: "bold" } },
      { content: safe(voucher.name || voucher.name) },

      { content: "Employee ID", styles: { fontStyle: "bold" } },
      { content: safe(voucher.employeeId) },

      { content: "Department", styles: { fontStyle: "bold" } },
      { content: safe(voucher.department) },
    ],

    [
      { content: "Date", styles: { fontStyle: "bold" } },
      { content: short(voucher.date || voucher.createdAt) },

      { content: "Purpose", styles: { fontStyle: "bold" } },
      { content: safe(voucher.purpose), colSpan: 3 },
    ],
  ];

  autoTable(pdf, {
    startY: Y,
    head: [],
    body: topRows,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 3 },
    tableWidth: fullTopWidth,
  });

  Y = pdf.lastAutoTable.finalY;

  /* ---------------- MAIN EXPENSE TABLE ---------------- */

  const full7 = W - marginX * 2;

  const snW = full7 * 0.06;
  const dateW = full7 * 0.106;
  const descW = full7 * 0.274;
  const toW = full7 * 0.17;
  const modeW = full7 * 0.13;
  const distW = full7 * 0.12;
  const amountW = full7 * 0.14;

  const txHead = [
    [
      "SN",
      "Date",
      "Description",
      "Travelled To",
      "Travel Mode",
      "Distance (Km)",
      "Amount",
    ],
  ];

  const txBody = (voucher.rows || []).map((r, i) => [
    String(i + 1),
    short(r.date),
    safe(r.description),
    safe(r.travelledTo),
    safe(r.travelMode),
    safe(r.distanceKm),
    formatNum(r.amount),
  ]);

  // total distance
  const totalDistance = (voucher.rows || []).reduce(
    (s, r) => s + (Number(r.distanceKm) || 0),
    0
  );

  txBody.push(["", "", "", "", "Total", String(totalDistance), ""]);

  autoTable(pdf, {
    startY: Y,
    head: txHead,
    body: txBody,
    theme: "grid",
    margin: { left: marginX, right: marginX },

    styles: { fontSize: 9, cellPadding: 3 },

    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "normal",
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
    },

    columnStyles: {
      0: { cellWidth: snW },
      1: { cellWidth: dateW },
      2: { cellWidth: descW },
      3: { cellWidth: toW },
      4: { cellWidth: modeW },
      5: { cellWidth: distW },
      6: { cellWidth: amountW },
    },

    didParseCell: (data) => {
      const isTotalDistRow = data.row.index === txBody.length - 1;

      if (isTotalDistRow) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = "bold";
      }
    },

    tableWidth: full7,
  });

  Y = pdf.lastAutoTable.finalY;

  /* ---------------- SUMMARY TABLE ---------------- */

  const summaryRows = [
    ["Total Expenditure", formatNum(voucher.totalAmount)],
    ["Advance Received", formatOrNA(voucher.advanceReceived)],
    ["Amount to be Received", formatOrNA(voucher.amountToBeReceived)],
    ["Amount to be Settled", formatOrNA(voucher.amountToBeSettled)],
  ];

  autoTable(pdf, {
    startY: Y,
    head: [],
    body: summaryRows,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: full7 - amountW, halign: "right" },
      1: { cellWidth: amountW, halign: "left" },
    },
    tableWidth: full7,
  });

  /* ---------------- PAGE 1 — SIGNATURES ---------------- */
  {
    const pgHeight = pdf.internal.pageSize.getHeight();
    const pgWidth = pdf.internal.pageSize.getWidth();
    const sigTableWidth = 250; // 5 × 50
    const sigMarginLeft = (pgWidth - sigTableWidth) / 2;
    const sigTableHeight = 42;
    const footerTopY = pgHeight - 18;
    const idealSigY = footerTopY - sigTableHeight - 3;
    const sigStartY = Math.max(pdf.lastAutoTable.finalY + 5, idealSigY);

    autoTable(pdf, {
      startY: sigStartY,
      tableWidth: sigTableWidth,
      margin: { left: sigMarginLeft },
      body: [
        ["", "", "", "", ""],
        [
          "Signature\n\n(Dept. Head)",
          "Signature\n\n(HR)",
          "Signature\n\n(Delivery Head)",
          "Signature\n\n(Co-Founder)",
          "Signature\n\n(Founder )",
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
        halign: "center",
        minCellHeight: 20,
        textColor: [40, 40, 40],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
        4: { cellWidth: 50 },
      },
    });
  }

  /* ---------------- PAGE 2 — BUDGET SUMMARY ---------------- */

  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);

  pdf.text(
    `${voucher.department?.toUpperCase() || "DEPARTMENT"} BUDGET SUMMARY`,
    150,
    20,
    { align: "center" }
  );

  const rows = [];

  // Reusable helper
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
  /* =======================================================
   APPLY REIMBURSEMENT IMPACT BEFORE BUILDING SUMMARY
   ======================================================= */
  if (voucher.csddComponent && budgetData.csddExpenses) {
    const comp = voucher.csddComponent;
    const compObj = budgetData.csddExpenses[comp];

    if (compObj) {
      compObj.spent =
        Number(compObj.spent || 0) + Number(voucher.totalAmount || 0); // reimbursement adds to spent
    }
  }

  /* ---------------- ADD ALL BUDGET SECTIONS ---------------- */
  addSection("Fixed Costs", budgetData.fixedCosts || {});
  addSection("Department Expenses", budgetData.departmentExpenses || {});
  addSection("CSDD Expenses", budgetData.csddExpenses || {});

  /* ---------------- TOTAL ROW ---------------- */
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

  /* ---------------- HIGHLIGHT LOGIC ---------------- */
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
    styles: {
      fontSize: 9,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },

    didParseCell: (data) => {
      const description = data.row.raw?.[1] || "";
      const isTotalRow = data.row.raw?.[0] === "TOTAL";

      // Highlight the matching CSDD component row
      if (description === highlightComponent && !isTotalRow) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = "bold";
      }

      // Total row styling
      if (isTotalRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  /* ---------------- PAGE 2 — SIGNATURES ---------------- */
  {
    const pgHeight = pdf.internal.pageSize.getHeight();
    const sigTableHeight = 42;
    const footerTopY = pgHeight - 18;
    const idealSigY = footerTopY - sigTableHeight - 3;
    const sigStartY = Math.max(pdf.lastAutoTable.finalY + 5, idealSigY);

    const pgWidth = pdf.internal.pageSize.getWidth();
    const sigTableWidth = 182;
    const sigMarginLeft = (pgWidth - sigTableWidth) / 2;

    autoTable(pdf, {
      startY: sigStartY,
      tableWidth: sigTableWidth,
      margin: { left: sigMarginLeft },
      body: [
        ["", ""],
        ["Signature\n\n(Founder )", "Signature\n\n(Co-Founder)"],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
        halign: "center",
        minCellHeight: 20,
        textColor: [40, 40, 40],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } },
    });
  }

  /* ---------------- FOOTER ON ALL PAGES ---------------- */
  addFooterToAllPages(pdf);

  /* ---------------- SAVE ---------------- */

  const clean = safe(voucher.name || voucher.name || "reimbursement").replace(
    /\s+/g,
    "_"
  );

  const fileDate = short(voucher.date || voucher.createdAt);

  pdf.save(`Reimbursement_${clean}_${fileDate}.pdf`);
}
