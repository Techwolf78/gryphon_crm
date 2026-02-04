import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// 🔹 Utility to format numbers safely
const formatNum = (val) =>
  typeof val === "number" ? val.toLocaleString("en-IN") : val || "-";

// 🔹 Capitalize helper
const capitalizeFirst = (str) =>
  !str ? "_______________________" : str.charAt(0).toUpperCase() + str.slice(1);

// 🔹 Main Export Function
export const exportPurchaseOrderToPDF = async (order, vendorData) => {
  const db = getFirestore();
  const docId = `${order.department}_FY-20${order.fiscalYear}`;
  const docRef = doc(db, "department_budgets", docId);
  let budgetData = {};

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      budgetData = snap.data();
      console.log("✅ Budget data loaded for:", order.department);
    } else {
      console.warn("⚠️ No budget data found for:", order.department);
    }
  } catch (err) {
    console.error("Error fetching budget data:", err);
  }

  const docPDF = new jsPDF("p", "mm", "a4");

  // ---------------------------
  // PAGE 1 (Purchase Order)
  // ---------------------------

  const logoUrl = "/gryphon_logo.png";
  try {
    docPDF.addImage(logoUrl, "PNG", 14, 10, 45, 25);
  } catch {
    console.warn("Logo not found in /public.");
  }

  // 🏢 Header
  docPDF.setTextColor(40, 40, 40);
  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(18);
  docPDF.text("GRYPHON ACADEMY PRIVATE LIMITED", 120, 18, { align: "center" });

  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(10);
  docPDF.text("www.gryphonacademy.co.in", 120, 24, { align: "center" });
  docPDF.text(
    "9th Floor, Olympia Business House, Baner, Pune - 411045",
    120,
    29,
    { align: "center" },
  );
  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(12);
  docPDF.text("--- Purchase Order ---", 120, 42, { align: "center" });

  // 📅 Dates & PO No
  const approvedDate =
    order.approvedAt?.toDate?.().toLocaleDateString("en-IN") ||
    new Date().toLocaleDateString("en-IN");

  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(10);
  docPDF.text(`Date : ${approvedDate}`, 15, 52);
  docPDF.text(
    `PO No. : ${order.poNumber || `PO-${order.id?.slice(-6)}`}`,
    15,
    58,
  );

  // 🧾 Vendor Table
  autoTable(docPDF, {
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

  // 🧍 Requested By
  autoTable(docPDF, {
    startY: docPDF.lastAutoTable.finalY + 4,
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

  // 📦 Items Table
  let itemRows = [];
  if (order.items?.length > 0) {
    order.items.forEach((item, i) => {
      itemRows.push([
        i + 1,
        capitalizeFirst(order.budgetComponent),
        item.description,
        item.quantity,
        formatNum(item.estPricePerUnit),
        formatNum(item.estTotal),
      ]);
    });
  } else {
    itemRows.push(["", "", "", "", "", ""]);
  }

  // 🟢 ENHANCED GST LOGIC (Read-Time Calculation)
  if (order.gstDetails) {
    const gst = order.gstDetails;

    // 1. Get the address string safely
    const addressStr =
      typeof order.vendorDetails.address === "string"
        ? order.vendorDetails.address
        : "";

    // 2. Check if address contains "Maharashtra" (Case Insensitive)
    const isIntrastate = addressStr.toLowerCase().includes("maharashtra");

    if (isIntrastate) {
      // 📍 Local Vendor: Show CGST + SGST (Split the total GST amount by 2)
      const halfGst = (gst.gstAmount || 0) / 2;
      itemRows.push(
        ["", "", "SGST ", "9%", formatNum(halfGst), formatNum(halfGst)],
        ["", "", "CGST ", "9%", formatNum(halfGst), formatNum(halfGst)],
      );
    } else {
      // 🚛 Out-of-State Vendor: Show IGST (Full Amount)
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

  autoTable(docPDF, {
    startY: docPDF.lastAutoTable.finalY + 10,
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

      // 🟢 Update Highlighting to include IGST
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

  // ✍️ Signatures
  autoTable(docPDF, {
    startY: docPDF.lastAutoTable.finalY + 10,
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

  // 💳 Payment Info
  const payY = docPDF.lastAutoTable.finalY + 20;
  docPDF.text("Payment Date: ___________________", 20, payY);
  docPDF.text("Payment Terms: ___________________", 120, payY);

  docPDF.setFontSize(8);
  docPDF.text("Generated via Gryphon Purchase Order System", 105, 285, {
    align: "center",
  });

  // ---------------------------
  // PAGE 2 (Budget Summary)
  // ---------------------------
  docPDF.addPage();
  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(14);
  docPDF.setTextColor(40, 40, 40);
  docPDF.text(
    `${order.department?.toUpperCase() || "DEPARTMENT"} BUDGET SUMMARY`,
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

  addSection("Fixed Costs", budgetData.fixedCosts);
  addSection("Department Expenses", budgetData.departmentExpenses);
  addSection("CSDD Expenses", budgetData.csddExpenses);

  const parseValue = (val) => {
    if (val == null || val === "-" || val === "") return 0;
    const strVal = val.toString().replace(/,/g, "");
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
  };

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

  autoTable(docPDF, {
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
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    didParseCell: (data) => {
      const spent = parseFloat(
        (data.row.raw?.[4] || "0").toString().replace(/,/g, ""),
      );
      const description = data.row.raw?.[1] || "";
      const isTotalRow = data.row.raw?.[0] === "TOTAL";

      const currentComponent =
        order.budgetComponent?.replace(/_/g, " ").toUpperCase() || "";

      if (
        description === currentComponent &&
        data.row.raw[0] !== "TOTAL" &&
        spent > 0
      ) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = "bold";
      }

      if (data.column.index === 4) {
        data.cell.styles.textColor = [40, 40, 40];
      }

      if (isTotalRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [40, 40, 40];
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // ✍️ Signatures
  autoTable(docPDF, {
    startY: docPDF.lastAutoTable.finalY + 10,
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
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 36 },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
    },
  });

  docPDF.save(`Purchase_Order_${order.poNumber || order.id}.pdf`);
};
