// FILE: /components/budget/csdd/utils/exportVoucherPDF.js
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
    dt.getMonth() + 1
  ).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
};

const dateRange = (s, e) => {
  const ds = parseDate(s);
  const de = parseDate(e);
  if (!ds && !de) return "-";
  if (!ds) return short(de);
  if (!de) return short(ds);
  if (
    ds.getDate() === de.getDate() &&
    ds.getMonth() === de.getMonth() &&
    ds.getFullYear() === de.getFullYear()
  )
    return short(ds);
  return `${short(ds)} - ${short(de)}`;
};

// Safe number parser
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

    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.4);
    pdf.line(14, lineY, pageWidth - 14, lineY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);

    const iconR = 1.5;
    drawGlobeIcon(pdf, 18, textY - 1, iconR);
    pdf.text("www.gryphonacademy.co.in", 22, textY);

    drawEmailIcon(pdf, 82, textY - 1, iconR);
    pdf.text("connect@gryphonacademy.co.in", 86, textY);

    drawPhoneIcon(pdf, 152, textY - 1, iconR);
    pdf.text("8956444509", 156, textY);

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
/*               MAIN EXPORT FUNCTION                 */
/* -------------------------------------------------- */

export default async function exportVoucherToPDF(voucher, budgetData = {}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const W = pdf.internal.pageSize.getWidth();
  const marginX = 15;
  let Y = 18;

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

  /* -------------------------------------------------- */
  /*                      HEADER                        */
  /* -------------------------------------------------- */

  try {
    pdf.addImage(`${import.meta.env.BASE_URL}gryphon_logo.png`, "PNG", 14, 10, 45, 25);
  } catch {
    // logo may be missing in some deployments
  }

  pdf.setTextColor(40, 40, 40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("GRYPHON ACADEMY PRIVATE LIMITED", 120, 18, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("www.gryphonacademy.co.in", 120, 24, { align: "center" });
  pdf.text("9th Floor, Olympia Business House, Baner, Pune - 411045", 120, 29, {
    align: "center",
  });
  pdf.text("Mumbai Bangalore Highway Baner 411045 Pune Maharashtra", 120, 34, {
    align: "center",
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("--- Advance Voucher ---", 120, 42, { align: "center" });

  Y += 30;

  /* -------------------------------------------------- */
  /*                   MAIN TABLE                       */
  /* -------------------------------------------------- */

  const mainRows = [
    [
      { content: "Name" },
      { content: safe(voucher.name) },
      { content: "Employee ID" },
      { content: safe(voucher.employeeId) },
    ],
    [
      { content: "Mode of Payment" },
      { content: safe(voucher.modeOfPayment) },
      { content: "Location" },
      { content: safe(voucher.location) },
    ],
    [
      { content: "Visit Purpose" },
      { content: safe(voucher.visitPurpose) },
      { content: "Department" },
      { content: safe(voucher.department) },
    ],
    [
      { content: "Date" },
      { content: short(voucher.createdAt || voucher.date), colSpan: 3 },
    ],
    [
      { content: "Client Name" },
      { content: safe(voucher.clientName), colSpan: 3 },
    ],
    [
      { content: "Start Date & End Date" },
      { content: dateRange(voucher.startDate, voucher.endDate), colSpan: 3 },
    ],
    [
      { content: "Description" },
      { content: safe(voucher.description), colSpan: 3 },
    ],
  ];

  autoTable(pdf, {
    startY: Y,
    head: [],
    body: mainRows,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  Y = pdf.lastAutoTable.finalY;

  /* -------------------------------------------------- */
  /*             EXPENSE BREAKDOWN TABLE               */
  /* -------------------------------------------------- */

  const expenseRows = [
    ["No. of people Travelling", safe(voucher.noOfPeople)],
    ["Food", safe(voucher.breakdown?.food ?? 0)],
    ["Stay", safe(voucher.breakdown?.stay ?? "NA")],
    ["Fuel", safe(voucher.breakdown?.fuel ?? 0)],
    ["Toll", safe(voucher.breakdown?.toll ?? "NA")],
    ["Miscellaneous", safe(voucher.breakdown?.misc ?? "NA")],
    ["Amount", safe(voucher.totalAmount ?? 0)],
    ["Amount in words", safe(voucher.amountInWords ?? "N/A")],
  ];

  autoTable(pdf, {
    startY: Y,
    head: [],
    body: expenseRows.map((r) => [{ content: r[0] }, { content: r[1] }]),
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: W - marginX * 2 - 50 },
    },
  });

  Y = pdf.lastAutoTable.finalY + 10;

  /* -------------------------------------------------- */
  /*                 SIGNATURE SECTION                  */
  /* -------------------------------------------------- */
  {
    const pgHeight = pdf.internal.pageSize.getHeight();
    const sigTableWidth = 180; // 5 × 36
    const sigMarginLeft = (W - sigTableWidth) / 2;
    const sigTableHeight = 42;
    const footerTopY = pgHeight - 18;
    const idealSigY = footerTopY - sigTableHeight - 3;
    const sigStartY = Math.max(pdf.lastAutoTable.finalY + 8, idealSigY);

    autoTable(pdf, {
      startY: sigStartY,
      tableWidth: sigTableWidth,
      margin: { left: sigMarginLeft },
      body: [
        ["", "", "", "", ""],
        [
          "Signature\n\n(Intender)",
          "Signature\n\n(HR)",
          "Signature\n\n(Delivery Head)",
          "Signature\n\n(Co-Founder)",
          "Signature\n\n(Founder)",
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 8,
        halign: "center",
        minCellHeight: 18,
        textColor: [40, 40, 40],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 36 },
        2: { cellWidth: 36 },
        3: { cellWidth: 36 },
        4: { cellWidth: 36 },
      },
    });
  }

  /* -------------------------------------------------- */
  /*                 PAGE 2 — BUDGET SUMMARY            */
  /* -------------------------------------------------- */

  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);

  pdf.text(
    `${voucher.department?.toUpperCase() || "DEPARTMENT"} BUDGET SUMMARY`,
    105,
    20,
    { align: "center" }
  );

  const rows = [];

  // Add Section Helper
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

  /* ===============================================
   APPLY VOUCHER IMPACT BEFORE BUILDING TABLE
   =============================================== */

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

  /* ===============================================
   BUILD SUMMARY TABLE AFTER APPLYING VOUCHER
   =============================================== */

  addSection("Fixed Costs", budgetData.fixedCosts || {});
  addSection("Department Expenses", budgetData.departmentExpenses || {});
  addSection("CSDD Expenses", budgetData.csddExpenses || {});

  // Totals
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
    styles: { fontSize: 9, textColor: [40, 40, 40], lineColor: [0, 0, 0], lineWidth: 0.2 },

    didParseCell: (data) => {
      const description = data.row.raw?.[1] || "";
      const isTotalRow = data.row.raw?.[0] === "TOTAL";

      // Highlight row
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

  /* ---------------- PAGE 2 — SIGNATURES ---------------- */
  {
    const pgHeight = pdf.internal.pageSize.getHeight();
    const pgWidth = pdf.internal.pageSize.getWidth();
    const sigTableWidth = 182;
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

  /* -------------------------------------------------- */
  /*                     SAVE PDF                       */
  /* -------------------------------------------------- */

  const clean = safe(voucher.name).replace(/\s+/g, "_");
  pdf.save(`Voucher_${clean}_${short(voucher.startDate || voucher.date)}.pdf`);
}
