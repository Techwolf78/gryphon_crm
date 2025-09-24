import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import * as XLSX from "xlsx-js-style";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};

const DOMAIN_COLORS = {
  Technical: "bg-blue-100 border-blue-300 text-blue-800",
  "Soft skills": "bg-green-100 border-green-300 text-green-800",
  Aptitude: "bg-purple-100 border-purple-300 text-purple-800",
  Tools: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

function formatDate(input) {
  if (!input && input !== 0) return "";

  let date;

  // Handle Firestore Timestamp
  if (
    typeof input === "object" &&
    input !== null &&
    typeof input.toDate === "function"
  ) {
    date = input.toDate();
  }
  // Handle timestamp (number)
  else if (typeof input === "number") {
    date = new Date(input);
  }
  // Handle string date
  else if (typeof input === "string") {
    date = new Date(input);
    if (isNaN(date.getTime())) return input; // Return original if invalid
  }
  // Handle Date object
  else if (input instanceof Date) {
    date = input;
  } else {
    return String(input);
  }

  // Validate date
  if (isNaN(date.getTime())) return String(input);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function getTimingForSlot(slot, training) {
  if (!slot) return "-";
  const s = String(slot).toUpperCase();
  const { collegeStartTime, lunchStartTime, lunchEndTime, collegeEndTime } =
    training || {};

  if (s.includes("AM")) {
    if (collegeStartTime && lunchStartTime)
      return `${collegeStartTime} - ${lunchStartTime}`;
    return "AM";
  }
  if (s.includes("PM")) {
    if (lunchEndTime && collegeEndTime)
      return `${lunchEndTime} - ${collegeEndTime}`;
    return "PM";
  }
  return slot;
}

function CollegeSummaryReport({
  training,
  trainingData,
  phaseData,
  domainsData,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const generatePDF = () => {
    const doc = new jsPDF();

    // Set compact margins
    const marginLeft = 15;
    const marginRight = 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let yPosition = 20;

    // Header - Simple and compact
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("College Summary Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${trainingData?.collegeName} (${trainingData?.collegeCode})`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Course: ${trainingData?.course} - ${trainingData?.year}`, marginLeft, yPosition);
    yPosition += 6;
    doc.text(`Phase: ${PHASE_LABELS[training.selectedPhase] || training.selectedPhase}`, marginLeft, yPosition);
    yPosition += 6;
    doc.text(`Training Period: ${formatDate(phaseData?.trainingStartDate)} to ${formatDate(phaseData?.trainingEndDate)}`, marginLeft, yPosition);
    yPosition += 6;
    doc.text(`College Timing: ${phaseData?.collegeStartTime} - ${phaseData?.collegeEndTime}`, marginLeft, yPosition);
    yPosition += 10;

    // Summary Table
    const summaryData = [
      ["Total Students", trainingData?.studentCount || 0],
      ["Total Hours", trainingData?.totalHours || 0],
      ["Domains", domainsData.length]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [["Summary", ""]],
      body: summaryData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [173, 216, 230], fontSize: 10, textColor: [0, 0, 0] }, // Light blue
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: marginLeft, right: marginRight },
    });
    yPosition = doc.lastAutoTable.finalY + 8;

    // Trainer Assignment Summary Table
    const trainerData = [];

    domainsData.forEach((domainInfo) => {
      if (Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0) {
        domainInfo.table1Data.forEach((row) => {
          if (row.batches && row.batches.length > 0) {
            const filteredBatches = row.batches.filter(batch => batch.trainers && batch.trainers.length > 0);

            filteredBatches.forEach((batch) => {
              if (batch.trainers && batch.trainers.length > 0) {
                batch.trainers.forEach((trainer) => {
                  trainerData.push([
                    domainInfo.domain,
                    row.batch,
                    batch.batchCode,
                    trainer.trainerName || "Unassigned",
                    trainer.trainerId,
                    trainer.dayDuration || "-",
                    formatDate(trainer.startDate),
                    formatDate(trainer.endDate)
                  ]);
                });
              }
            });
          }
        });
      }
    });

    if (trainerData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [["Domain", "Batch", "Batch Code", "Trainer", "ID", "Slot", "Start Date", "End Date"]],
        body: trainerData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [173, 216, 230], fontSize: 9, textColor: [0, 0, 0] }, // Light blue
        margin: { left: marginLeft, right: marginRight },
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text("Generated by Gryphon Academy CRM", pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    return doc.output('blob');
  };

  const handlePreview = () => {
    const blob = generatePDF();
    setPdfBlob(blob);
    setShowPreview(true);
    setShowDropdown(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Define styles
    const headerStyle = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const subHeaderStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const sectionHeaderStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const tableHeaderStyle = {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const dataStyle = {
      font: { sz: 10 },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const summaryStyle = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "E6F3FF" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const costStyle = {
      font: { sz: 10, color: { rgb: "228B22" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    // Create single comprehensive sheet
    const allData = [];

    // Add Summary Section
    allData.push([{ v: "College Summary Report", s: headerStyle }]);
    allData.push([{ v: `${trainingData?.collegeName} (${trainingData?.collegeCode})`, s: subHeaderStyle }]);
    allData.push([{ v: `Course: ${trainingData?.course} - ${trainingData?.year}`, s: dataStyle }]);
    allData.push([{ v: `Phase: ${PHASE_LABELS[training.selectedPhase] || training.selectedPhase}`, s: dataStyle }]);
    allData.push([{ v: `Training Period: ${formatDate(phaseData?.trainingStartDate)} to ${formatDate(phaseData?.trainingEndDate)}`, s: dataStyle }]);
    allData.push([{ v: `College Timing: ${phaseData?.collegeStartTime} - ${phaseData?.collegeEndTime}`, s: dataStyle }]);
    allData.push([""]);
    allData.push([{ v: "SUMMARY", s: subHeaderStyle }]);
    allData.push([{ v: "Total Students", s: summaryStyle }, { v: trainingData?.studentCount || 0, s: dataStyle }]);
    allData.push([{ v: "Total Hours", s: summaryStyle }, { v: trainingData?.totalHours || 0, s: dataStyle }]);
    allData.push([{ v: "Domains", s: summaryStyle }, { v: domainsData.length, s: dataStyle }]);
    
    // Add vertical gap
    allData.push([""]);
    allData.push([""]);
    allData.push([""]);

    // Add Trainer Details Section
    allData.push([{ v: "Trainer Details", s: sectionHeaderStyle }]);
    allData.push([""]);
    
    // Trainer Details Headers
    allData.push([
      { v: "Domain", s: tableHeaderStyle },
      { v: "Batch", s: tableHeaderStyle },
      { v: "Batch Code", s: tableHeaderStyle },
      { v: "Trainer Name", s: tableHeaderStyle },
      { v: "Trainer ID", s: tableHeaderStyle },
      { v: "Duration", s: tableHeaderStyle },
      { v: "Hours", s: tableHeaderStyle },
      { v: "Rate/Hour", s: tableHeaderStyle },
      { v: "Total Cost", s: tableHeaderStyle },
      { v: "Start Date", s: tableHeaderStyle },
      { v: "End Date", s: tableHeaderStyle },
      { v: "Topics", s: tableHeaderStyle }
    ]);

    // Add Trainer Details Data
    domainsData.forEach((domainInfo) => {
      if (Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0) {
        domainInfo.table1Data.forEach((row) => {
          if (row.batches && row.batches.length > 0) {
            const filteredBatches = row.batches.filter(batch =>
              batch.trainers && batch.trainers.length > 0
            );

            filteredBatches.forEach((batch) => {
              if (batch.trainers && batch.trainers.length > 0) {
                batch.trainers.forEach((trainer) => {
                  const topics = trainer.topics && trainer.topics.length > 0 
                    ? (Array.isArray(trainer.topics) ? trainer.topics.join("; ") : trainer.topics)
                    : "";
                  
                  const totalCost = (trainer.assignedHours || 0) * (trainer.perHourCost || 0);

                  allData.push([
                    { v: domainInfo.domain, s: dataStyle },
                    { v: row.batch, s: dataStyle },
                    { v: batch.batchCode, s: dataStyle },
                    { v: trainer.trainerName || "Unassigned", s: dataStyle },
                    { v: trainer.trainerId, s: dataStyle },
                    { v: trainer.dayDuration || "-", s: dataStyle },
                    { v: trainer.assignedHours || 0, s: dataStyle },
                    { v: trainer.perHourCost ? `₹${trainer.perHourCost}` : "-", s: costStyle },
                    { v: totalCost ? `₹${totalCost.toFixed(2)}` : "-", s: costStyle },
                    { v: formatDate(trainer.startDate), s: dataStyle },
                    { v: formatDate(trainer.endDate), s: dataStyle },
                    { v: topics, s: dataStyle }
                  ]);
                });
              }
            });
          }
        });
      }
    });

    // Add vertical gap
    allData.push([""]);
    allData.push([""]);
    allData.push([""]);

    // Add Daily Schedule Section
    allData.push([{ v: "Daily Schedule Details", s: sectionHeaderStyle }]);
    allData.push([""]);
    
    // Daily Schedule Headers
    allData.push([
      { v: "Domain", s: tableHeaderStyle },
      { v: "Batch", s: tableHeaderStyle },
      { v: "Batch Code", s: tableHeaderStyle },
      { v: "Trainer Name", s: tableHeaderStyle },
      { v: "Trainer ID", s: tableHeaderStyle },
      { v: "Date", s: tableHeaderStyle },
      { v: "Day", s: tableHeaderStyle },
      { v: "Hours", s: tableHeaderStyle },
      { v: "Slot", s: tableHeaderStyle },
      { v: "Timing", s: tableHeaderStyle },
      { v: "Rate/Hour", s: tableHeaderStyle },
      { v: "Daily Cost", s: tableHeaderStyle }
    ]);

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Add Daily Schedule Data
    domainsData.forEach((domainInfo) => {
      if (Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0) {
        domainInfo.table1Data.forEach((row) => {
          if (row.batches && row.batches.length > 0) {
            const filteredBatches = row.batches.filter(batch =>
              batch.trainers && batch.trainers.length > 0
            );

            filteredBatches.forEach((batch) => {
              if (batch.trainers && batch.trainers.length > 0) {
                batch.trainers.forEach((trainer) => {
                  if (trainer.startDate && trainer.endDate) {
                    const dates = [];
                    const startDate = new Date(trainer.startDate);
                    const endDate = new Date(trainer.endDate);
                    const excludeDays = trainingData?.excludeDays || "None";
                    let current = new Date(startDate);

                    while (current <= endDate) {
                      const dayOfWeek = current.getDay();
                      let shouldInclude = true;

                      if (excludeDays === "Saturday" && dayOfWeek === 6) {
                        shouldInclude = false;
                      } else if (excludeDays === "Sunday" && dayOfWeek === 0) {
                        shouldInclude = false;
                      } else if (excludeDays === "Both" && (dayOfWeek === 0 || dayOfWeek === 6)) {
                        shouldInclude = false;
                      }

                      if (shouldInclude) {
                        const dateStr = current.toISOString().slice(0, 10);
                        if (!(trainer.excludedDates || []).includes(dateStr)) {
                          dates.push(new Date(current));
                        }
                      }
                      current.setDate(current.getDate() + 1);
                    }

                    let hoursArray = [];
                    if (trainer.dailyHours && Array.isArray(trainer.dailyHours) && trainer.dailyHours.length === dates.length) {
                      hoursArray = trainer.dailyHours;
                    } else {
                      const totalDays = dates.length;
                      const hoursPerDay = totalDays > 0 ? (trainer.assignedHours || 0) / totalDays : 0;
                      hoursArray = new Array(totalDays).fill(hoursPerDay);
                    }

                    dates.forEach((date, index) => {
                      const hoursForDay = hoursArray[index] || 0;
                      const dailyCost = hoursForDay * (trainer.perHourCost || 0);

                      allData.push([
                        { v: domainInfo.domain, s: dataStyle },
                        { v: row.batch, s: dataStyle },
                        { v: batch.batchCode, s: dataStyle },
                        { v: trainer.trainerName || "Unassigned", s: dataStyle },
                        { v: trainer.trainerId, s: dataStyle },
                        { v: formatDate(date), s: dataStyle },
                        { v: dayNames[date.getDay()], s: dataStyle },
                        { v: hoursForDay.toFixed(2), s: dataStyle },
                        { v: trainer.dayDuration || "-", s: dataStyle },
                        { v: getTimingForSlot(trainer.dayDuration, phaseData), s: dataStyle },
                        { v: trainer.perHourCost ? `₹${trainer.perHourCost}` : "-", s: costStyle },
                        { v: dailyCost ? `₹${dailyCost.toFixed(2)}` : "-", s: costStyle }
                      ]);
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Add vertical gap
    allData.push([""]);
    allData.push([""]);
    allData.push([""]);

    // Add Cost Summary Section
    allData.push([{ v: "Cost Summary", s: sectionHeaderStyle }]);
    allData.push([""]);
    
    // Cost Summary Headers
    allData.push([
      { v: "Domain", s: tableHeaderStyle },
      { v: "Trainer Name", s: tableHeaderStyle },
      { v: "Trainer ID", s: tableHeaderStyle },
      { v: "Total Hours", s: tableHeaderStyle },
      { v: "Rate/Hour", s: tableHeaderStyle },
      { v: "Total Cost", s: tableHeaderStyle }
    ]);

    let totalOverallCost = 0;

    // Add Cost Summary Data
    domainsData.forEach((domainInfo) => {
      if (Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0) {
        domainInfo.table1Data.forEach((row) => {
          if (row.batches && row.batches.length > 0) {
            const filteredBatches = row.batches.filter(batch =>
              batch.trainers && batch.trainers.length > 0
            );

            filteredBatches.forEach((batch) => {
              if (batch.trainers && batch.trainers.length > 0) {
                batch.trainers.forEach((trainer) => {
                  const totalCost = (trainer.assignedHours || 0) * (trainer.perHourCost || 0);
                  totalOverallCost += totalCost;

                  allData.push([
                    { v: domainInfo.domain, s: dataStyle },
                    { v: trainer.trainerName || "Unassigned", s: dataStyle },
                    { v: trainer.trainerId, s: dataStyle },
                    { v: trainer.assignedHours || 0, s: dataStyle },
                    { v: trainer.perHourCost ? `₹${trainer.perHourCost}` : "-", s: costStyle },
                    { v: totalCost ? `₹${totalCost.toFixed(2)}` : "-", s: costStyle }
                  ]);
                });
              }
            });
          }
        });
      }
    });

    // Add total row
    allData.push([""]);
    allData.push([
      { v: "TOTAL COST", s: summaryStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: `₹${totalOverallCost.toFixed(2)}`, s: costStyle }
    ]);

    // Create the single sheet
    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    worksheet['!cols'] = [
      { width: 25 }, { width: 20 }, { width: 18 }, { width: 22 }, { width: 18 }, 
      { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 18 }, 
      { width: 15 }, { width: 15 }
    ];

    // Add merges for headings
    const merges = [];
    let currentRow = 0;

    // Summary section heading merge
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 11 } });
    currentRow += 15; // Skip to trainer details section

    // Trainer Details section heading merge
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 11 } });
    currentRow += 20; // Skip to daily schedule section

    // Daily Schedule section heading merge
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 11 } });
    currentRow += 25; // Skip to cost summary section

    // Cost Summary section heading merge
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 11 } });

    worksheet['!merges'] = merges;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Complete Report");

    // Generate and download the file
    XLSX.writeFile(workbook, `College_Summary_Report_${trainingData?.collegeCode}_${training.selectedPhase}.xlsx`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm"
      >
        <FiDownload className="w-4 h-4" />
        Export
        <FiChevronDown className="w-4 h-4" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <button
            onClick={() => {
              handlePreview();
              setShowDropdown(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Preview PDF
          </button>
          <button
            onClick={() => {
              exportToExcel();
              setShowDropdown(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      )}

      {showPreview && pdfBlob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">PDF Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                width="100%"
                height="600px"
                className="border rounded"
                title="PDF Preview"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const url = URL.createObjectURL(pdfBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `College_Summary_Report_${trainingData?.collegeCode}_${training.selectedPhase}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollegeSummaryReport;
