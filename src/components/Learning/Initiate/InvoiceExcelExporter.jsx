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
      // Validate input data
      if (!filteredData || typeof filteredData !== 'object' || Object.keys(filteredData).length === 0) {
        console.warn('⚠️ No data available for export');
        alert("⚠️ No data available for export. Please ensure you have trainer data loaded.");
        setExporting(false);
        return;
      }

      console.log('📊 Starting Excel export with data structure:', {
        collegesCount: Object.keys(filteredData).length,
        totalData: JSON.stringify(filteredData).length
      });

      const exportInvoices = [];

      // Handle nested structure: {college: {phase: [trainers]}}
      Object.keys(filteredData).forEach((college) => {
        console.log(`🏫 Processing college: ${college}`);
        Object.keys(filteredData[college]).forEach((phase) => {
          console.log(`📝 Processing phase: ${phase} (${filteredData[college][phase].length} trainers)`);
          filteredData[college][phase].forEach((trainer) => {
            exportInvoices.push({
              trainerId: trainer.trainerId,
              collegeName: trainer.collegeName,
              phase: trainer.phase,
              trainerName: trainer.trainerName,
              projectCode: trainer.projectCode,
              domain: trainer.domain,
              hasExistingInvoice: trainer.hasExistingInvoice,
              earliestStartDate: trainer.earliestStartDate,
              latestEndDate: trainer.latestEndDate,
              totalCollegeHours: trainer.totalCollegeHours,
              perHourCost: trainer.perHourCost,
              totalConveyance: trainer.totalConveyance,
              totalFood: trainer.totalFood,
              totalLodging: trainer.totalLodging,
              activeDates: trainer.activeDates,
            });
          });
        });
      });

      console.log(`📋 Found ${exportInvoices.length} trainers to export`);

      if (exportInvoices.length === 0) {
        alert("⚠️ No trainers found in the current view.");
        setExporting(false);
        return;
      }

      const exportData = [];
      exportData.push(["", "", "", "", ""]); // blank top row

      // Column headers - Enhanced with more details
      exportData.push([
        "SR No",
        "Invoice No",
        "Trainer Name",
        "Trainer ID",
        "College Name",
        "Phase",
        "Project Code",
        "Domain",
        "Start Date",
        "End Date",
        "Total Hours",
        "Training Rate (₹)",
        "Training Fees (₹)",
        "TDS (%)",
        "TDS Amount (₹)",
        "Adhoc Adjustment (₹)",
        "Conveyance (₹)",
        "Food (₹)",
        "Lodging (₹)",
        "Total Amount (₹)",
        "Net Payment (₹)",
        "Description (Training Dates)",
      ]);

      let totalAmount = 0;
      let processedCount = 0;

      for (let i = 0; i < exportInvoices.length; i++) {
        const invoiceInfo = exportInvoices[i];
        try {
          // For merged trainings, try to find invoice by trainerId and phase first
          let q;
          if (invoiceInfo.collegeName && invoiceInfo.collegeName.includes(',')) {
            // Merged training - try to find by trainerId and phase
            q = query(
              collection(db, "invoices"),
              where("trainerId", "==", invoiceInfo.trainerId),
              where("phase", "==", invoiceInfo.phase)
            );
          } else {
            // Single college training
            q = query(
              collection(db, "invoices"),
              where("trainerId", "==", invoiceInfo.trainerId),
              where("collegeName", "==", invoiceInfo.collegeName),
              where("phase", "==", invoiceInfo.phase)
            );
          }

          const querySnapshot = await getDocs(q);
          let invoice;
          if (querySnapshot.empty) {
            console.warn(`No invoice found for trainer ${invoiceInfo.trainerId} at ${invoiceInfo.collegeName} (${invoiceInfo.phase}), using trainer data`);
            // Use trainer data for invoice fields
            invoice = {
              billNumber: "Not Generated",
              trainerName: invoiceInfo.trainerName,
              trainerId: invoiceInfo.trainerId,
              collegeName: invoiceInfo.collegeName,
              phase: invoiceInfo.phase,
              projectCode: invoiceInfo.projectCode,
              domain: invoiceInfo.domain,
              startDate: invoiceInfo.earliestStartDate,
              endDate: invoiceInfo.latestEndDate,
              totalHours: invoiceInfo.totalCollegeHours,
              trainingRate: invoiceInfo.perHourCost,
              trainingFees: invoiceInfo.totalCollegeHours * invoiceInfo.perHourCost,
              tds: 0,
              adhocAdjustment: 0,
              conveyance: invoiceInfo.totalConveyance,
              food: invoiceInfo.totalFood,
              lodging: invoiceInfo.totalLodging,
              totalAmount: invoiceInfo.totalCollegeHours * invoiceInfo.perHourCost + invoiceInfo.totalConveyance + invoiceInfo.totalFood + invoiceInfo.totalLodging,
              netPayment: invoiceInfo.totalCollegeHours * invoiceInfo.perHourCost + invoiceInfo.totalConveyance + invoiceInfo.totalFood + invoiceInfo.totalLodging,
            };
          } else {
            const invoiceDoc = querySnapshot.docs[0];
            invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };
          }

          console.log(`Found invoice for ${invoiceInfo.trainerName}:`, {
            billNumber: invoice.billNumber,
            totalAmount: invoice.totalAmount,
            netPayment: invoice.netPayment,
            tdsAmount: invoice.tdsAmount
          });

          // For training dates, try multiple approaches
          let assignmentDates = [];
          if (invoiceInfo.activeDates && Array.isArray(invoiceInfo.activeDates)) {
            assignmentDates = invoiceInfo.activeDates;
          } else {
            try {
              const assignmentsQuery = query(
                collection(db, "trainerAssignments"),
                where("trainerName", "==", invoice.trainerName || "")
              );
              const assignmentsSnapshot = await getDocs(assignmentsQuery);
              assignmentDates = assignmentsSnapshot.docs.map((doc) => doc.data().date);
            } catch (assignmentError) {
              console.warn("Could not fetch assignment dates:", assignmentError);
            }
          }

          // If no assignment dates, use invoice dates
          if (assignmentDates.length === 0 && invoice.startDate && invoice.endDate) {
            assignmentDates = [invoice.startDate];
            if (invoice.startDate !== invoice.endDate) {
              assignmentDates.push(invoice.endDate);
            }
          }

          const formattedTrainingDates = formatTrainingDates(assignmentDates);

          // Calculate TDS Amount like in InvoiceModal
          const trainingFees = invoice.trainingRate * invoice.totalHours;
          const tdsAmount = Math.round((trainingFees * (invoice.tds || 0)) / 100);

          // Use net payment amount for individual rows
          const netPayment = invoice.netPayment || (invoice.totalAmount ? invoice.totalAmount - tdsAmount : 0);
          totalAmount += netPayment;
          processedCount++;

          exportData.push([
            processedCount,
            invoice.billNumber || "N/A",
            invoice.trainerName || "N/A",
            invoice.trainerId || "N/A",
            invoice.collegeName || "N/A",
            invoice.phase || "N/A",
            invoice.projectCode || "N/A",
            invoice.domain || "N/A",
            invoice.startDate ? new Date(invoice.startDate).toLocaleDateString() : "N/A",
            invoice.endDate ? new Date(invoice.endDate).toLocaleDateString() : "N/A",
            invoice.totalHours || 0,
            invoice.trainingRate || 0,
            invoice.trainingFees || invoice.totalAmount || 0,
            invoice.tds || 0,  // Fixed: use 'tds' instead of 'tdsPercentage'
            tdsAmount,  // Calculate TDS Amount instead of using stored value
            invoice.adhocAdjustment || 0,  // Add Adhoc Adjustment column
            invoice.conveyance || 0,
            invoice.food || 0,
            invoice.lodging || 0,
            invoice.totalAmount || 0,
            invoice.netPayment || (invoice.totalAmount ? invoice.totalAmount - tdsAmount : 0),
            formattedTrainingDates || "N/A",
          ]);
        } catch (error) {
          console.error("Error processing invoice:", error);
        }
      }

      if (processedCount === 0) {
        alert("⚠️ No trainers processed in the current view.");
        setExporting(false);
        return;
      }

      // Empty row
      exportData.push([]);

      // ✅ TOTAL NET PAYMENT row (positioned at the Net Payment column)
      const totalRowData = new Array(22).fill(""); // 22 columns
      totalRowData[19] = "TOTAL NET PAYMENT"; // Column 19 (0-indexed) = Net Payment column
      totalRowData[21] = totalAmount; // Column 21 (0-indexed) = last column for total
      exportData.push(totalRowData);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);

      // Column widths - Updated for enhanced columns
      ws["!cols"] = [
        { wch: 6 },   // SR No
        { wch: 20 },  // Invoice No
        { wch: 20 },  // Trainer Name
        { wch: 12 },  // Trainer ID
        { wch: 25 },  // College Name
        { wch: 8 },   // Phase
        { wch: 30 },  // Project Code
        { wch: 12 },  // Domain
        { wch: 12 },  // Start Date
        { wch: 12 },  // End Date
        { wch: 10 },  // Total Hours
        { wch: 15 },  // Training Rate
        { wch: 15 },  // Training Fees
        { wch: 8 },   // TDS %
        { wch: 12 },  // TDS Amount
        { wch: 15 },  // Adhoc Adjustment
        { wch: 12 },  // Conveyance
        { wch: 8 },   // Food
        { wch: 10 },  // Lodging
        { wch: 15 },  // Total Amount
        { wch: 15 },  // Net Payment
        { wch: 40 },  // Training Dates
      ];

      // Header styling (row index 1) - Updated for 22 columns
      const headerRow = 1;
      for (let c = 0; c <= 21; c++) {
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

      // Zebra rows (data rows start from row 2) - Updated for 22 columns
      for (let r = 2; r < 2 + processedCount; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c <= 21; c++) {
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

      // Total amount row styling - Updated for 22 columns
      const totalRow = exportData.length - 1; // last row
      for (let c = 0; c <= 21; c++) {
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

      // Merge header top blank cells and merge total row cells (19 -> 20 for "TOTAL NET PAYMENT")
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } }); // Merge first 19 columns for header
      ws["!merges"].push({ s: { r: 0, c: 19 }, e: { r: 0, c: 21 } }); // Merge last 3 columns for header
      ws["!merges"].push({
        s: { r: totalRow, c: 19 }, // "TOTAL NET PAYMENT" starts at column 19
        e: { r: totalRow, c: 20 }, // Merge with next column
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
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatDateForExport = (rawDate) => {
    if (!rawDate) return "";
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatInvoiceMonth = (rawDate) => {
    if (!rawDate) return "";
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleExportLimitedExcel = async () => {
    setExporting(true);
    try {
      if (!filteredData || typeof filteredData !== "object" || Object.keys(filteredData).length === 0) {
        alert("⚠️ No data available for export. Please ensure you have trainer data loaded.");
        setExporting(false);
        return;
      }

      const limitedExportRows = [];
      limitedExportRows.push([
        "Training Month:",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      limitedExportRows.push([
        "Invoice Month:",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      limitedExportRows.push([]);
      limitedExportRows.push([
        "S. N.",
        "Project Code",
        "Bill No.",
        "Trainer Name",
        "Description",
        "Domain",
        "Amount",
        "Status",
        "Date of payment",
        "Payment Status",
        "Remark*",
      ]);

      let rowIndex = 0;
      let totalCount = 0;
      let totalAmount = 0;
      let firstTrainer = null;

      Object.keys(filteredData).forEach((college) => {
        Object.keys(filteredData[college]).forEach((phase) => {
          filteredData[college][phase].forEach((trainer) => {
            const invoice = trainer.invoiceData || {};
            if (!firstTrainer) firstTrainer = trainer;

            const trainingDateRange = trainer.earliestStartDate && trainer.latestEndDate
              ? `${formatDateForExport(trainer.earliestStartDate)} - ${formatDateForExport(trainer.latestEndDate)}`
              : invoice.startDate && invoice.endDate
              ? `${formatDateForExport(invoice.startDate)} - ${formatDateForExport(invoice.endDate)}`
              : invoice.topics || invoice.domain || trainer.domain || "";

            const paymentDate =
              invoice.paymentDate || invoice.billingDate || trainer.latestEndDate || "";
            const paymentStatus =
              invoice.paymentStatus || invoice.status || "Not available";
            const remark =
              invoice.remarks?.text || invoice.remarks || "";
            const amountValue = invoice.netPayment || invoice.totalAmount || 0;

            limitedExportRows.push([
              rowIndex + 1,
              trainer.projectCode || invoice.projectCode || "",
              invoice.billNumber || "",
              invoice.trainerName || trainer.trainerName || "",
              trainingDateRange,
              invoice.domain || trainer.domain || "",
              amountValue,
              invoice.status || trainer.status || "",
              formatDateForExport(paymentDate),
              paymentStatus,
              remark,
            ]);
            rowIndex += 1;
            totalCount += 1;
            totalAmount += Number(amountValue) || 0;
          });
        });
      });

      if (totalCount === 0) {
        alert("⚠️ No trainers found in the current view.");
        setExporting(false);
        return;
      }

      limitedExportRows.push([]);
      limitedExportRows.push([
        "",
        "",
        "",
        "",
        "",
        "Total",
        totalAmount,
        "",
        "",
        "",
        "",
      ]);

      const trainingMonthHeader = firstTrainer
        ? `${formatDateForExport(firstTrainer.earliestStartDate)} - ${formatDateForExport(
            firstTrainer.latestEndDate
          )}`
        : "";
      const invoiceMonthHeader = firstTrainer
        ? formatInvoiceMonth(firstTrainer.invoiceData?.billingDate || firstTrainer.invoiceData?.paymentDate)
        : "";

      limitedExportRows[0][1] = trainingMonthHeader;
      limitedExportRows[1][1] = invoiceMonthHeader;

      const ws = XLSX.utils.aoa_to_sheet(limitedExportRows);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 30 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 32 },
      ];

      const headerRow = 3;
      for (let c = 0; c <= 10; c++) {
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

      const dataStartRow = 4;
      for (let r = dataStartRow; r < dataStartRow + rowIndex; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c <= 10; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell) {
              cell.s = {
                ...(cell.s || {}),
                fill: { fgColor: { rgb: "F9F9F9" } },
              };
            }
          }
        }
      }

      const totalRowIndex = limitedExportRows.length - 1;
      for (let c = 0; c <= 10; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: totalRowIndex, c })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "FFF3CD" } },
            font: { bold: true, color: { rgb: "000000" }, sz: 12 },
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

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trainer Invoice Summary");

      const date = new Date();
      const fileName = `trainer_invoices_limited_${date.getFullYear()}-${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Limited export failed:", error);
      alert("Failed to export limited columns. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <button
        onClick={handleExportToExcel}
        disabled={exporting}
        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white border border-green-700 rounded-lg text-xs font-medium hover:bg-green-700 hover:border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50"
      >
        <FiFile className="w-4 h-4 mr-1" />
        {exporting ? "Exporting..." : "Export to Excel"}
      </button>
      <button
        onClick={handleExportLimitedExcel}
        disabled={exporting}
        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white border border-blue-700 rounded-lg text-xs font-medium hover:bg-blue-700 hover:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
      >
        <FiFile className="w-4 h-4 mr-1" />
        {exporting ? "Exporting..." : "Export limited columns"}
      </button>
    </div>
  );
};

export default InvoiceExcelExporter;
