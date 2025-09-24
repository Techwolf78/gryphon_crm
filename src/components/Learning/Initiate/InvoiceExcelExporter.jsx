import React from "react";
import * as XLSX from "xlsx-js-style";
import { FiFile } from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";

// Helper function to format training dates
const formatTrainingDates = (dates) => {
  if (!dates || !Array.isArray(dates) || dates.length === 0)
    return "No training dates";

  const sortedDates = dates
    .map((dateStr) => new Date(dateStr))
    .filter((date) => !isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (sortedDates.length === 0) return "No valid training dates";

  const formattedDates = sortedDates.map((date) => {
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });

    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    return `${day}${suffix} ${month}`;
  });

  return formattedDates.join(", ");
};

const InvoiceExcelExporter = ({ db, filteredData, exporting, setExporting }) => {
  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      const exportInvoices = [];

      Object.keys(filteredData).forEach((phase) => {
        filteredData[phase].forEach((trainer) => {
          if (trainer.hasExistingInvoice) {
            exportInvoices.push({
              trainerId: trainer.trainerId,
              collegeName: trainer.collegeName,
              phase: trainer.phase,
              trainerName: trainer.trainerName,
              projectCode: trainer.projectCode,
              domain: trainer.domain,
              hasExistingInvoice: trainer.hasExistingInvoice,
            });
          }
        });
      });

      if (exportInvoices.length === 0) {
        alert("⚠️ No invoices found in the current view.");
        setExporting(false);
        return;
      }

      const exportData = [];
      exportData.push(["", "", "", "", ""]); // blank top row

      // Column headers
      exportData.push([
        "SR No",
        "Project Code",
        "Invoice No",
        "Trainer Name",
        "Description (Training Dates)",
        "Domain",
        "Amount",
      ]);

      let totalAmount = 0;
      let processedCount = 0;

      for (let i = 0; i < exportInvoices.length; i++) {
        const invoiceInfo = exportInvoices[i];
        try {
          const q = query(
            collection(db, "invoices"),
            where("trainerId", "==", invoiceInfo.trainerId),
            where("collegeName", "==", invoiceInfo.collegeName),
            where("phase", "==", invoiceInfo.phase)
          );

          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) continue;

          const invoiceDoc = querySnapshot.docs[0];
          const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };

          const assignmentsQuery = query(
            collection(db, "trainerAssignments"),
            where("trainerName", "==", invoice.trainerName || "")
          );
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const assignmentDates = assignmentsSnapshot.docs.map(
            (doc) => doc.data().date
          );

          const formattedTrainingDates = formatTrainingDates(assignmentDates);

          const amount = invoice.payableAmount || invoice.totalAmount || 0;
          totalAmount += amount;
          processedCount++;

          exportData.push([
            processedCount,
            invoice.projectCode || "N/A",
            invoice.billNumber || "N/A",
            invoice.trainerName || "N/A",
            formattedTrainingDates || "N/A",
            invoice.domain || "N/A",
            amount,
          ]);
        } catch (error) {
          console.error("Error processing invoice:", error);
        }
      }

      if (processedCount === 0) {
        alert("⚠️ No invoices found in the current view.");
        setExporting(false);
        return;
      }

      // Empty row
      exportData.push([]);

      // ✅ Only TOTAL AMOUNT row (TOTAL PAYABLE AMOUNT removed)
      exportData.push(["", "", "", "", "TOTAL AMOUNT", "", totalAmount]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      // Column widths
      ws["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 20 },
        { wch: 25 },
        { wch: 40 },
        { wch: 15 },
        { wch: 12 },
      ];

      // Header styling (row index 1)
      const headerRow = 1;
      for (let c = 0; c <= 6; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "4CAF50" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };
        }
      }

      // Zebra rows (data rows start from row 2)
      for (let r = 2; r < 2 + processedCount; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c <= 6; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell) {
              // If cell already has a style (rare), merge fill only
              cell.s = {
                ...(cell.s || {}),
                fill: { fgColor: { rgb: "F9F9F9" } },
              };
            }
          }
        }
      }

      // Total amount row styling
      const totalRow = exportData.length - 1; // last row
      for (let c = 0; c <= 6; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: totalRow, c })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "FFF3CD" } },
            font: { bold: true, color: { rgb: "000000" }, sz: 12 },
            alignment: { horizontal: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };
        }
      }

      // Merge header top blank cells and merge total row cells (4 -> 5)
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
      ws["!merges"].push({ s: { r: 0, c: 5 }, e: { r: 0, c: 6 } });
      ws["!merges"].push({
        s: { r: totalRow, c: 4 },
        e: { r: totalRow, c: 5 },
      });

      // Export workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trainer Invoices");

      const date = new Date();
      const fileName = `trainer_invoices_${date.getFullYear()}-${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportToExcel}
      disabled={exporting}
      className="inline-flex items-center px-2 py-1.5 bg-green-600 text-white border border-green-700 rounded-lg text-sm font-medium hover:bg-green-700 hover:border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50"
    >
      <FiFile className="w-4 h-4 mr-1" />
      {exporting ? "Exporting..." : "Export to Excel"}
    </button>
  );
};

export default InvoiceExcelExporter;
