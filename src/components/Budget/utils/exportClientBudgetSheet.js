import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Utilities ──

const formatNum = (val) =>
  typeof val === "number" ? val.toLocaleString("en-IN") : val || "-";

// ── Export: Client Budget Sheet to PDF ──

export const exportClientBudgetSheetToPDF = ({
  client,
  clientData,
  fiscalYear,
}) => {
  if (!client || !clientData) return;

  const pdf = new jsPDF("p", "mm", "a4");

  // ── Logo ──
  const logoUrl = "/gryphon_logo.png";
  try {
    pdf.addImage(logoUrl, "PNG", 14, 10, 45, 25);
  } catch {
    console.warn("Logo not found in /public.");
  }

  // ── Header ──
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

  // ── Title ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("--- Client Budget Sheet ---", 105, 42, { align: "center" });

  // ── Sub-header info ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Client : ${client.name || "Unknown"}`, 15, 55);
  pdf.text(`FY : ${fiscalYear || "-"}`, 15, 61);
  pdf.text(`Owner : ${clientData?.owner_name || "-"}`, 120, 55);

  // ── Compute totals ──
  const components = clientData?.client_components || {};
  const componentsArray = Object.entries(components).map(([key, data]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
    allocated: data.allocated || 0,
    spent: data.spent || 0,
    remaining: (data.allocated || 0) - (data.spent || 0),
  }));

  const totalPlanned = componentsArray.reduce(
    (s, c) => s + Number(c.allocated || 0),
    0,
  );
  const totalSpent = componentsArray.reduce(
    (s, c) => s + Number(c.spent || 0),
    0,
  );
  const totalRemaining = totalPlanned - totalSpent;

  // ── Components table ──
  const bodyRows = componentsArray.map((comp, i) => [
    i + 1,
    comp.name,
    formatNum(comp.allocated),
    formatNum(comp.spent),
    formatNum(comp.remaining),
  ]);

  // Total row
  bodyRows.push([
    "",
    "TOTAL",
    formatNum(totalPlanned),
    formatNum(totalSpent),
    formatNum(totalRemaining),
  ]);

  autoTable(pdf, {
    startY: 70,
    head: [["Sr.", "Component", "Forecast Amount", "Total Spend", "Remaining"]],
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40] },
    styles: {
      fontSize: 9,
      lineWidth: 0.2,
      textColor: [40, 40, 40],
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    didParseCell: (data) => {
      const isLastRow = data.row.index === bodyRows.length - 1;
      if (isLastRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // ── Signatures ──
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

  // ── Footer ──
  pdf.setFontSize(8);
  pdf.text("Generated via Gryphon Budget System", 105, 285, {
    align: "center",
  });

  const safeName = (client.name || "Client").replace(/[^a-zA-Z0-9]/g, "_");
  pdf.save(`ClientBudget_${safeName}_FY${fiscalYear}.pdf`);
};
