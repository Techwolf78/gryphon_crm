import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// ── Utilities ──

const formatNum = (val) =>
  typeof val === "number" ? val.toLocaleString("en-IN") : val || "-";

const capitalizeFirst = (str) =>
  !str ? "_______________________" : str.charAt(0).toUpperCase() + str.slice(1);

const parseValue = (val) => {
  if (val == null || val === "-" || val === "") return 0;
  const num = parseFloat(val.toString().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

// ── Main Export (3-page PDF) ──
// Page 1: Purchase Order (identical to standard PO)
// Page 2: Main Department Budget Summary
// Page 3: Client Budget Component Sheet (NEW for CSDD)

export const exportCsddPurchaseOrderToPDF = async (order, vendorData) => {
  const db = getFirestore();
  const docId = `${order.department}_FY-20${order.fiscalYear}`;
  const budgetRef = doc(db, "department_budgets", docId);
  let budgetData = {};

  try {
    const snap = await getDoc(budgetRef);
    if (snap.exists()) budgetData = snap.data();
  } catch (err) {
    console.error("Error fetching budget data:", err);
  }

  // Fetch client subcollection doc
  const clientKey = order.clientKey;
  let clientData = {};
  if (clientKey) {
    try {
      const clientRef = doc(budgetRef, "csdd_clients", clientKey);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) clientData = clientSnap.data();
    } catch (err) {
      console.error("Error fetching client data:", err);
    }
  }

  const pdf = new jsPDF("p", "mm", "a4");

  // ═══════════════════════════════════════
  // PAGE 1 — Purchase Order
  // ═══════════════════════════════════════

  const logoUrl = "/gryphon_logo.png";
  try {
    pdf.addImage(logoUrl, "PNG", 14, 10, 45, 25);
  } catch {
    console.warn("Logo not found in /public.");
  }

  // Header
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

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("--- CSDD Purchase Order ---", 120, 42, { align: "center" });

  // Date & PO No
  const approvedDate =
    order.approvedAt?.toDate?.().toLocaleDateString("en-IN") ||
    new Date().toLocaleDateString("en-IN");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Date : ${approvedDate}`, 15, 52);
  pdf.text(`PO No. : ${order.poNumber || `PO-${order.id?.slice(-6)}`}`, 15, 58);

  if (clientKey) {
    pdf.text(
      `Client : ${order.clientName || clientKey.replace(/_/g, " ")}`,
      120,
      52,
    );
    pdf.text(
      `Component : ${(order.csddComponent || "").replace(/_/g, " ")}`,
      120,
      58,
    );
  }

  // Vendor Table
  autoTable(pdf, {
    startY: 70,
    body: [
      ["Vendor Name:", vendorData.contact || "_______________________"],
      ["Business Name:", vendorData.name || "_______________________"],
      ["Address:", vendorData.address || "_______________________"],
      ["Phone:", vendorData.phone || "_______________________"],
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
  });

  // Requested By
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 4,
    body: [
      ["Requested By:", capitalizeFirst(order.ownerName)],
      ["Business Name:", "Gryphon Academy Pvt Ltd"],
      ["Address:", "Baner, Pune"],
      ["City, State, Zip Code:", "Maharashtra"],
      ["Phone No.:", order.phone || "7400574438"],
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
  });

  // Items Table
  let itemRows = [];
  if (order.items?.length > 0) {
    order.items.forEach((item, i) => {
      itemRows.push([
        i + 1,
        capitalizeFirst(order.csddComponent || order.budgetComponent),
        item.description,
        item.quantity,
        formatNum(item.estPricePerUnit),
        formatNum(item.estTotal),
      ]);
    });
  } else {
    itemRows.push(["", "", "", "", "", ""]);
  }

  // GST Logic
  if (order.gstDetails) {
    const gst = order.gstDetails;
    const addressStr =
      typeof order.vendorDetails?.address === "string"
        ? order.vendorDetails.address
        : "";
    const isIntrastate = addressStr.toLowerCase().includes("maharashtra");

    if (isIntrastate) {
      const halfGst = (gst.gstAmount || 0) / 2;
      itemRows.push(
        ["", "", "SGST ", "9%", formatNum(halfGst), formatNum(halfGst)],
        ["", "", "CGST ", "9%", formatNum(halfGst), formatNum(halfGst)],
      );
    } else {
      itemRows.push([
        "",
        "",
        "IGST ",
        "18%",
        formatNum(gst.gstAmount),
        formatNum(gst.gstAmount),
      ]);
    }

    if (gst.totalWithGST) {
      itemRows.push([
        "",
        "",
        "Total (with GST)",
        "",
        "",
        formatNum(gst.totalWithGST),
      ]);
    }
  }

  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 10,
    head: [["S.N.", "Category", "Description", "Qty", "Unit Price", "Total"]],
    body: itemRows,
    theme: "grid",
    headStyles: { fillColor: [210, 210, 210], textColor: [40, 40, 40] },
    styles: {
      fontSize: 9,
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    didParseCell: (data) => {
      const desc = data.row.raw?.[2] || "";
      if (
        desc.includes("SGST") ||
        desc.includes("CGST") ||
        desc.includes("IGST")
      )
        data.cell.styles.fillColor = [245, 245, 245];
      if (desc.includes("Total (with GST)"))
        data.cell.styles.fillColor = [230, 230, 230];
    },
  });

  // Signatures
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 10,
    body: [
      ["", "", "", "", ""],
      [
        "Signature\n\n(Dept. Head)",
        "Signature\n\n(HR)",
        "Signature\n\n(Delivery Head)",
        "Signature\n\n(Co-Founder)",
        "Signature\n\n(Founder & Director)",
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      minCellHeight: 20,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 36 },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
    },
  });

  // Payment Info
  const payY = pdf.lastAutoTable.finalY + 20;
  pdf.text("Payment Date: ___________________", 20, payY);
  pdf.text("Payment Terms: ___________________", 120, payY);

  pdf.setFontSize(8);
  pdf.text("Generated via Gryphon Purchase Order System", 105, 285, {
    align: "center",
  });

  // ═══════════════════════════════════════
  // PAGE 2 — Main Department Budget Summary
  // ═══════════════════════════════════════
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);
  pdf.text("DM DEPARTMENT BUDGET SUMMARY", 105, 20, { align: "center" });

  const mainRows = [];

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
      mainRows.push([
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

  addSection("Fixed Costs", budgetData.fixedCosts);
  addSection("Department Expenses", budgetData.departmentExpenses);
  addSection("CSDD Expenses", budgetData.csddExpenses);

  const totalApproved = mainRows.reduce((sum, r) => sum + parseValue(r[2]), 0);
  const totalSpent = mainRows.reduce((sum, r) => sum + parseValue(r[4]), 0);
  const totalRemaining = totalApproved - totalSpent;
  const totalPercent =
    totalApproved > 0
      ? ((totalSpent / totalApproved) * 100).toFixed(1) + "%"
      : "-";

  mainRows.push([
    "TOTAL",
    "",
    formatNum(totalApproved),
    totalPercent,
    formatNum(totalSpent),
    formatNum(totalRemaining),
  ]);

  autoTable(pdf, {
    startY: 30,
    head: [
      ["Category", "Description", "Approved", "Spent %", "Spent", "Remaining"],
    ],
    body: mainRows,
    theme: "grid",
    headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40] },
    styles: {
      fontSize: 9,
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    didParseCell: (data) => {
      const description = data.row.raw?.[1] || "";
      const isTotalRow = data.row.raw?.[0] === "TOTAL";
      const currentClient = (order.clientKey || "")
        .replace(/_/g, " ")
        .toUpperCase();

      // Highlight the client row this PO belongs to
      if (description === currentClient && !isTotalRow) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = "bold";
      }
      if (isTotalRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // Signatures
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 10,
    body: [
      ["", ""],
      ["Signature\n\n(Founder & Director)", "Signature\n\n(Co-Founder)"],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      minCellHeight: 20,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 36 } },
  });

  // ═══════════════════════════════════════
  // PAGE 3 — Client Budget Component Sheet (CSDD-SPECIFIC)
  // ═══════════════════════════════════════
  if (clientKey && clientData.client_components) {
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(40, 40, 40);
    pdf.text(
      `CLIENT BUDGET SHEET — ${(order.clientName || clientKey).replace(/_/g, " ").toUpperCase()}`,
      105,
      20,
      { align: "center" },
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Component-level breakdown
    const componentRows = [];
    Object.entries(clientData.client_components).forEach(
      ([compKey, compVal]) => {
        const allocated = compVal?.allocated ?? 0;
        const spent = compVal?.spent ?? 0;
        const remaining = allocated - spent;
        const percent = allocated
          ? ((spent / allocated) * 100).toFixed(1) + "%"
          : "-";

        componentRows.push([
          compKey.replace(/_/g, " ").toUpperCase(),
          formatNum(allocated),
          percent,
          formatNum(spent),
          formatNum(remaining),
        ]);
      },
    );

    // Totals
    const compTotalAllocated = componentRows.reduce(
      (sum, r) => sum + parseValue(r[1]),
      0,
    );
    const compTotalSpent = componentRows.reduce(
      (sum, r) => sum + parseValue(r[3]),
      0,
    );
    const compTotalRemaining = compTotalAllocated - compTotalSpent;
    const compTotalPercent =
      compTotalAllocated > 0
        ? ((compTotalSpent / compTotalAllocated) * 100).toFixed(1) + "%"
        : "-";

    componentRows.push([
      "TOTAL",
      formatNum(compTotalAllocated),
      compTotalPercent,
      formatNum(compTotalSpent),
      formatNum(compTotalRemaining),
    ]);

    autoTable(pdf, {
      startY: 35,
      head: [["Component", "Allocated", "Spent %", "Spent", "Remaining"]],
      body: componentRows,
      theme: "grid",
      headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40] },
      styles: {
        fontSize: 9,
        lineWidth: 0.2,
        textColor: [40, 40, 40],
        lineColor: [0, 0, 0],
      },
      didParseCell: (data) => {
        const compName = data.row.raw?.[0] || "";
        const isTotalRow = compName === "TOTAL";
        const currentComp = (order.csddComponent || "")
          .replace(/_/g, " ")
          .toUpperCase();

        // Highlight the component this PO belongs to
        if (compName === currentComp && !isTotalRow) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = "bold";
        }
        if (isTotalRow) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
    });

 
    // Signatures
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 15,
      body: [
        ["", ""],
        ["Signature\n\n(DM Head)", "Signature\n\n(Delivery Head)"],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
        halign: "center",
        minCellHeight: 20,
        textColor: [40, 40, 40],
        lineColor: [0, 0, 0],
      },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 } },
    });
  }

  pdf.save(`CSDD_PO_${order.poNumber || order.id}.pdf`);
};
