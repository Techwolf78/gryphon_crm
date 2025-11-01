import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportPurchaseOrderToPDF = (order, vendorData, items = []) => {
  const doc = new jsPDF("p", "mm", "a4");
  const vendor = vendorData || {};

  const capitalizeFirst = (str) => {
    if (!str) return "_______________________";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const logoUrl = "/gryphon_logo.png"; // Put gryphon_logo.png inside public/

  try {
    doc.addImage(logoUrl, "PNG", 14, 10, 45, 25);
  } catch (e) {
    console.warn(
      "Logo could not be loaded. Ensure it's a valid PNG and accessible from /public."
    );
  }

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);
  doc.text("GRYPHON ACADEMY PRIVATE LIMITED", 120, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("www.gryphonacademy.co.in", 120, 24, { align: "center" });
  doc.text(
    "9th Floor, Olympia Business House (Achalare) next to Supreme HQ,",
    120,
    29,
    { align: "center" }
  );
  doc.text(
    "Mumbai Bangalore Highway Baner - 411045, Pune Maharashtra",
    120,
    34,
    { align: "center" }
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text("--- Purchase Order ---", 120, 42, { align: "center" });

  // --- DATE & PO No. ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const approvedDate =
    order.approvedAt?.toDate?.().toLocaleDateString("en-IN") ||
    new Date().toLocaleDateString("en-IN");

  doc.text(`Date : ${approvedDate}`, 15, 52);
  doc.text(`PO No. : ${order.poNumber || `PO-${order.id?.slice(-6)}`}`, 15, 58);

  // --- VENDOR INFO BOX ---
  const vendorY = 70;

  const vendorTableData = [
    ["Vendor Name:", vendor.name || "_______________________"],
    ["Business Name:", vendor.contact || "_______________________"],
    ["Address:", vendor.email || "_______________________"],
    ["Phone:", vendor.phone || "_______________________"],
  ];

  autoTable(doc, {
    startY: vendorY,
    body: vendorTableData,
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: [60, 60, 60],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 1, bottom: 1, left: 4, right: 4 },
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, textColor: [40, 40, 40] },
      1: { fontStyle: "normal", cellWidth: 145, textColor: [20, 20, 20] },
    },
  });
  // --- REQUESTED BY BOX ---
  const reqY = vendorY + 32;
  doc.setFont("helvetica", "normal");

  const reqTableData = [
    [
      "Requested By:",
      capitalizeFirst(order.ownerName) || "_______________________",
    ],
    [
      "Department:",
      capitalizeFirst(order.department) || "_______________________",
    ],
    [
      "Address:",
      "Gryphon Academy, 9th floor, Olympia Business House, Baner, Pune",
    ],
    ["Phone No.:", order.phone || "+91 9767019581"],
  ];

  autoTable(doc, {
    startY: reqY, // continue from where previous section ended
    body: reqTableData,
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: [60, 60, 60],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 1, bottom: 1, left: 4, right: 4 },
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, textColor: [40, 40, 40] },
      1: { fontStyle: "normal", cellWidth: 145, textColor: [40, 40, 40] }, // blue for dynamic data
    },
  });

  // --- ITEMS TABLE ---
  const startTableY = doc.lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: startTableY,
    head: [
      [
        "S.N.",
        "Category",
        "Description",
        "Quantity",
        "Unit Price (INR)",
        "Total Price (INR)",
      ],
    ],
    body:
      order.items && order.items.length > 0
        ? order.items.map((item) => [
            item.sno || "",
            capitalizeFirst(order.budgetComponent) || "",
            item.description || "",
            item.quantity || "",
            item.estPricePerUnit || "",
            item.estTotal || "",
          ])
        : [["", "", "", "", "", ""]],
    theme: "grid",
    headStyles: {
      fillColor: [210, 210, 210],
      textColor: 0,
      halign: "center",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 }, // S.N.
      1: { halign: "center", cellWidth: 25 }, // Category
      2: { halign: "center", cellWidth: 45 }, // Description
      3: { halign: "center", cellWidth: 25 }, // Quantity
      4: { halign: "center", cellWidth: 35 }, // Unit Price
      5: { halign: "center", cellWidth: 35 }, // Total Price
    },
  });

  // --- SIGNATURE SECTION ---
  const sigY = doc.lastAutoTable.finalY + 10;
  const boxHeight = 20;

  const sigTitles = [
    "Dept. Head",
    "HR",
    "Delivery Head",
    "Co-Founder",
    "Founder & Director",
  ];

  const sigTableData = [
    // Empty signature boxes (row 1)
    sigTitles.map(() => " "),
    // Signature labels (row 2)
    sigTitles.map((title) => `Signature\n(${title})`),
  ];

  autoTable(doc, {
    startY: sigY,
    body: sigTableData,
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, // default smaller padding
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 20,
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 36 },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
    },
    didParseCell: function (data) {
      // Only apply large padding for the first row (the empty signature boxes)
      if (data.row.index === 0) {
        data.cell.styles.cellPadding = {
          top: 10,
          bottom: 10,
          left: 2,
          right: 2,
        };
      }
    },
  });

  // --- PAYMENT SECTION ---
  const payY = sigY + boxHeight + 30;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Payment Date: ___________________", 20, payY);
  doc.text("Payment Terms: ___________________", 120, payY);

  // --- FOOTER ---
  const footerY = 285;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Generated via Gryphon Purchase Order System", 105, footerY, {
    align: "center",
  });

  // --- SAVE FILE ---
  doc.save(`Purchase_Order_${order.poNumber || order.id}.pdf`);
};
