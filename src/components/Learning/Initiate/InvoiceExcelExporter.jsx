import React from "react";
import * as XLSX from "xlsx";
import { FiFile } from "react-icons/fi";
import { collection, getDocs } from "firebase/firestore";

// Helper function to format training dates
const formatTrainingDates = (dates) => {
  if (!dates || !Array.isArray(dates) || dates.length === 0)
    return "No training dates";

  const sortedDates = dates
    .map((date) => (date.toDate ? date.toDate() : new Date(date))) // convert Firestore timestamp if needed
    .filter((date) => !isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (sortedDates.length === 0) return "No valid training dates";

  return sortedDates
    .map((date) => {
      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "long" });

      let suffix = "th";
      if ([1, 21, 31].includes(day)) suffix = "st";
      else if ([2, 22].includes(day)) suffix = "nd";
      else if ([3, 23].includes(day)) suffix = "rd";

      return `${day}${suffix} ${month}`;
    })
    .join(", "); // comma-separated for Excel
};

const InvoiceExcelExporter = ({ db, exporting, setExporting }) => {
  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      // Get all invoices from Firestore
      const invoicesSnapshot = await getDocs(collection(db, "invoices"));
      const invoicesData = invoicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Prepare data for export
      const exportData = [];

      // Add header row
      exportData.push([
        "Training Month (15th-31st July)",
        "",
        "",
        "",
        "",
        "Invoice Months (14th-30th September)",
      ]);

      // Add column headers
      exportData.push([
        "SR No",
        "Project Code",
        "Invoice No",
        "Trainer Name",
        "Description",
        "Domain",
        "Amount",
      ]);

      let totalAmount = 0;

      // Process each invoice
      invoicesData.forEach((invoice, index) => {
        const trainingDates = (invoice.trainingDates || []).map((d) =>
          d?.toDate ? d.toDate() : new Date(d)
        );

       // ✅ DEBUG: Print raw training dates
  console.log(`Invoice ${invoice.billNumber} raw trainingDates:`, invoice.trainingDates);

  const formattedTrainingDates = formatTrainingDates(trainingDates);

  // ✅ DEBUG: Print formatted training dates
  console.log(`Invoice ${invoice.billNumber} formatted trainingDates:`, formattedTrainingDates);


        const amount = invoice.payableAmount || invoice.totalAmount || 0;
        totalAmount += amount;

        exportData.push([
          index + 1,
          invoice.projectCode || "N/A",
          invoice.billNumber || "N/A",
          invoice.trainerName || "N/A",
          formattedTrainingDates, // ✅ human-readable description
          invoice.domain || "N/A",
          amount,
        ]);
      });

      // Add empty row
      exportData.push([]);

      // Add total row
      exportData.push(["", "", "", "", "TOTAL AMOUNT", "", totalAmount]);

      // Add payable amount row
      exportData.push([
        "",
        "",
        "",
        "",
        "TOTAL PAYABLE AMOUNT",
        "",
        totalAmount,
      ]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 6 }, // SR No
        { wch: 25 }, // Project Code
        { wch: 20 }, // Invoice No
        { wch: 25 }, // Trainer Name
        { wch: 40 }, // Description
        { wch: 15 }, // Domain
        { wch: 12 }, // Amount
      ];
      ws["!cols"] = colWidths;

      // Merge header cells
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
      ws["!merges"].push({ s: { r: 0, c: 5 }, e: { r: 0, c: 6 } });

      // Merge total rows
      const dataLength = invoicesData.length;
      ws["!merges"].push({
        s: { r: dataLength + 2, c: 4 },
        e: { r: dataLength + 2, c: 5 },
      });
      ws["!merges"].push({
        s: { r: dataLength + 3, c: 4 },
        e: { r: dataLength + 3, c: 5 },
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trainer Invoices");

      // Generate file name with current date
      const date = new Date();
      const fileName = `trainer_invoices_${date.getFullYear()}-${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.xlsx`;

      // Export to file
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
      className="inline-flex items-center px-3 py-2.5 bg-green-600 text-white border border-green-700 rounded-lg text-sm font-medium hover:bg-green-700 hover:border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50"
    >
      <FiFile className="w-4 h-4 mr-1" />
      {exporting ? "Exporting..." : "Export to Excel"}
    </button>
  );
};

export default InvoiceExcelExporter;
