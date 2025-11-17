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
    pdf.addImage("/gryphon_logo.png", "PNG", 14, 10, 45, 25);
  } catch {}

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

  const sigLabels = [
    "Signature\nIntender",
    "Signature\nHR",
    "Signature\nDelivery Head",
    "Signature\nCo-Founder",
    "Signature\nFounder & Director",
  ];

  const sigWidth = (W - marginX * 2 - 20) / 5;
  let sx = marginX;

  sigLabels.forEach(() => {
    pdf.rect(sx, Y, sigWidth, 22);
    sx += sigWidth + 5;
  });

  sx = marginX;
  const labelY = Y + 30;

  pdf.setFontSize(8);
  sigLabels.forEach((txt) => {
    const [l1, l2] = txt.split("\n");
    const cx = sx + sigWidth / 2;

    pdf.text(l1, cx, labelY, { align: "center" });
    if (l2) pdf.text(l2, cx, labelY + 5, { align: "center" });

    sx += sigWidth + 5;
  });

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
    styles: { fontSize: 9, textColor: [40, 40, 40] },

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

  pdf.setFontSize(8);
  pdf.text("Generated via Gryphon Budget System", 105, 280, {
    align: "center",
  });

  /* -------------------------------------------------- */
  /*                     SAVE PDF                       */
  /* -------------------------------------------------- */

  const clean = safe(voucher.name).replace(/\s+/g, "_");
  pdf.save(`Voucher_${clean}_${short(voucher.startDate || voucher.date)}.pdf`);
}
