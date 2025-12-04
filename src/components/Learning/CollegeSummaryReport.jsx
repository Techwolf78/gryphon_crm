import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import * as XLSX from "xlsx-js-style";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
  "JD": "JD",
};

const DOMAIN_COLORS = {
  Technical: "bg-blue-100 border-blue-300 text-blue-800",
  "Soft skills": "bg-green-100 border-green-300 text-green-800",
  Aptitude: "bg-purple-100 border-purple-300 text-purple-800",
  Tools: "bg-yellow-100 border-yellow-300 text-yellow-800",
  JD: "border-blue-400 bg-blue-50",
};

function formatDate(input) {
  if (!input && input !== 0) return "";

  let date;

  // Handle Firestore Timestamp
  if (typeof input === "object" && input !== null && typeof input.toDate === "function") {
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

  if (s.includes("AM & PM") || (s.includes("AM") && s.includes("PM"))) {
    if (collegeStartTime && collegeEndTime)
      return `${collegeStartTime} - ${collegeEndTime}`;
    return "AM & PM";
  }
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
    doc.text(`${trainingData?.collegeName} (${trainingData?.projectCode})`, pageWidth / 2, yPosition, { align: "center" });
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
      ["Total Hours", (() => {
        // Calculate total assigned hours from all trainers across all domains
        let totalAssignedHours = 0;
        domainsData.forEach(domain => {
          if (Array.isArray(domain.table1Data)) {
            domain.table1Data.forEach(row => {
              if (row.batches && Array.isArray(row.batches)) {
                row.batches.forEach(batch => {
                  if (batch.trainers && Array.isArray(batch.trainers)) {
                    batch.trainers.forEach(trainer => {
                      totalAssignedHours += Number(trainer.assignedHours || 0);
                    });
                  }
                });
              }
            });
          }
        });
        return totalAssignedHours;
      })()],
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

    // Daily Schedule Details Table
    const dailyScheduleData = [];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
                    const excludeDays = phaseData?.excludeDays || "None";
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
                      const dailyCost = Math.round(hoursForDay * (trainer.perHourCost || 0));

                      dailyScheduleData.push({
                        date: date,
                        formattedDate: formatDate(date),
                        day: dayNames[date.getDay()],
                        domain: domainInfo.domain,
                        batch: row.batch,
                        batchCode: batch.batchCode,
                        trainerName: trainer.trainerName || "Unassigned",
                        trainerId: trainer.trainerId,
                        hours: hoursForDay.toFixed(2),
                        slot: trainer.dayDuration || "-",
                        timing: getTimingForSlot(trainer.dayDuration, phaseData),
                        rate: trainer.perHourCost ? `₹${trainer.perHourCost}` : "-",
                        dailyCost: dailyCost ? `₹${dailyCost.toFixed(2)}` : "-"
                      });
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Batch Table - Hours by Domain
    const batchCodes = new Set();
    const batchHoursByDomain = {};
    const allDomains = new Set();

    // Collect hours from daily schedule data
    dailyScheduleData.forEach(item => {
      allDomains.add(item.domain);
      batchCodes.add(item.batchCode);
      if (!batchHoursByDomain[item.batchCode]) {
        batchHoursByDomain[item.batchCode] = {};
      }
      if (!batchHoursByDomain[item.batchCode][item.domain]) {
        batchHoursByDomain[item.batchCode][item.domain] = 0;
      }
      batchHoursByDomain[item.batchCode][item.domain] += Number(item.hours);
    });

    // Create batch table data with dynamic columns
    const domainArray = Array.from(allDomains);
    const batchTableData = Array.from(batchCodes).map(batchCode => {
      const row = [batchCode];
      domainArray.forEach(domain => {
        const hours = batchHoursByDomain[batchCode][domain] || 0;
        row.push(hours > 0 ? hours.toString() : "-");
      });
      return row;
    });

    // Add total row
    const totalRow = ["Total"];
    domainArray.forEach(domain => {
      const totalForDomain = Array.from(batchCodes).reduce((sum, batchCode) => {
        return sum + (batchHoursByDomain[batchCode][domain] || 0);
      }, 0);
      totalRow.push(totalForDomain > 0 ? totalForDomain.toString() : "-");
    });
    batchTableData.push(totalRow);

    // Create table headers
    const tableHeaders = ["Batch Code", ...domainArray];

    if (batchTableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [tableHeaders],
        body: batchTableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [173, 216, 230], fontSize: 9, textColor: [0, 0, 0] }, // Light blue
        margin: { left: marginLeft, right: marginRight },
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // Sort by date
    dailyScheduleData.sort((a, b) => a.date - b.date);

    // Group by date: set date and day to empty for subsequent rows on same date
    let lastDate = null;
    const groupedData = dailyScheduleData.map(item => {
      const currentDate = item.formattedDate;
      const isSameDate = currentDate === lastDate;
      lastDate = currentDate;
      return {
        ...item,
        formattedDate: isSameDate ? "" : item.formattedDate,
        day: isSameDate ? "" : item.day
      };
    });

    // Convert to array format for autoTable: merge Trainer and ID, Timing
    const tableData = groupedData.map(item => [
      item.formattedDate,
      item.day,
      item.timing,
      item.batchCode,
      item.trainerName || "Unassigned",
      item.hours,
      item.domain
    ]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [["Date", "Day", "Timing", "Batch Code", "Trainer", "Hours", "Domain"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fillColor: [173, 216, 230], fontSize: 9, textColor: [0, 0, 0] }, // Light blue
        margin: { left: marginLeft, right: marginRight },
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // Calculate total labor cost
    const totalCost = dailyScheduleData.reduce((sum, item) => {
      const costStr = item.dailyCost;
      if (costStr && costStr !== "-") {
        const cost = parseFloat(costStr.replace('₹', ''));
        return sum + (isNaN(cost) ? 0 : cost);
      }
      return sum;
    }, 0);

    // Calculate total hours
    const totalHours = dailyScheduleData.reduce((sum, item) => {
      return sum + parseFloat(item.hours || 0);
    }, 0);

    // Add gap (1 row equivalent)
    yPosition += 10;

    // Add total hours and cost in same row
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Hours: ${totalHours.toFixed(2)}    Total Cost: ₹${totalCost.toFixed(2)}`, marginLeft, yPosition);
    yPosition += 8;

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
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

    // Add Header
    allData.push([{ v: "College Summary Report - Daily Schedule", s: headerStyle }]);
    allData.push([{ v: `${trainingData?.collegeName} (${trainingData?.projectCode})`, s: subHeaderStyle }]);
    allData.push([{ v: `Course: ${trainingData?.course} - ${trainingData?.year}`, s: dataStyle }]);
    allData.push([{ v: `Phase: ${PHASE_LABELS[training.selectedPhase] || training.selectedPhase}`, s: dataStyle }]);
    allData.push([{ v: `Training Period: ${formatDate(phaseData?.trainingStartDate)} to ${formatDate(phaseData?.trainingEndDate)}`, s: dataStyle }]);
    allData.push([{ v: `College Timing: ${phaseData?.collegeStartTime} - ${phaseData?.collegeEndTime}`, s: dataStyle }]);
    allData.push([""]);

    // Batch Table - Hours by Domain
    allData.push([{ v: "Batch Table - Hours by Domain", s: tableHeaderStyle }]);
    
    const batchCodesExcel = new Set();
    const batchHoursByDomainExcel = {};
    const allDomainsExcel = new Set();

    // Collect all unique batch codes and domains, and calculate hours by domain
    // First, build daily schedule data
    const dailyScheduleDataExcel = [];
    const dayNamesExcel = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    domainsData.forEach((domainInfo) => {
      allDomainsExcel.add(domainInfo.domain);
      
      if (Array.isArray(domainInfo.table1Data) && domainInfo.table1Data.length > 0) {
        domainInfo.table1Data.forEach((row) => {
          if (row.batches && row.batches.length > 0) {
            const filteredBatches = row.batches.filter(batch =>
              batch.trainers && batch.trainers.length > 0
            );

            filteredBatches.forEach((batch) => {
              batchCodesExcel.add(batch.batchCode);
              
              if (batch.trainers && batch.trainers.length > 0) {
                batch.trainers.forEach((trainer) => {
                  if (trainer.startDate && trainer.endDate) {
                    const dates = [];
                    const startDate = new Date(trainer.startDate);
                    const endDate = new Date(trainer.endDate);
                    const excludeDays = phaseData?.excludeDays || "None";
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
                      const dailyCost = Math.round(hoursForDay * (trainer.perHourCost || 0));

                      dailyScheduleDataExcel.push({
                        domain: domainInfo.domain,
                        batch: row.batch,
                        batchCode: batch.batchCode,
                        trainerName: trainer.trainerName || "Unassigned",
                        trainerId: trainer.trainerId,
                        date: formatDate(date),
                        day: dayNamesExcel[date.getDay()],
                        hours: hoursForDay.toFixed(2),
                        slot: trainer.dayDuration || "-",
                        timing: getTimingForSlot(trainer.dayDuration, phaseData),
                        rate: trainer.perHourCost ? `₹${trainer.perHourCost}` : "-",
                        dailyCost: dailyCost ? `₹${dailyCost.toFixed(2)}` : "-"
                      });
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Now collect hours from daily schedule data for batch table
    dailyScheduleDataExcel.forEach(item => {
      if (!batchHoursByDomainExcel[item.batchCode]) {
        batchHoursByDomainExcel[item.batchCode] = {};
        allDomainsExcel.forEach(domain => {
          batchHoursByDomainExcel[item.batchCode][domain] = 0;
        });
      }
      batchHoursByDomainExcel[item.batchCode][item.domain] += Number(item.hours);
    });

    // Create Excel headers for batch table
    const domainArrayExcel = Array.from(allDomainsExcel);
    const batchTableHeaders = [{ v: "Batch Code", s: tableHeaderStyle }];
    domainArrayExcel.forEach(domain => {
      batchTableHeaders.push({ v: domain, s: tableHeaderStyle });
    });
    allData.push(batchTableHeaders);

    // Add batch table data to Excel
    Array.from(batchCodesExcel).forEach(batchCode => {
      const row = [{ v: batchCode, s: dataStyle }];
      domainArrayExcel.forEach(domain => {
        const hours = batchHoursByDomainExcel[batchCode][domain];
        row.push({ v: hours > 0 ? hours.toString() : "-", s: dataStyle });
      });
      allData.push(row);
    });

    // Add total row for batch table
    const totalRowExcel = [{ v: "Total", s: tableHeaderStyle }];
    domainArrayExcel.forEach(domain => {
      const totalForDomain = Array.from(batchCodesExcel).reduce((sum, batchCode) => {
        return sum + (batchHoursByDomainExcel[batchCode][domain] || 0);
      }, 0);
      totalRowExcel.push({ v: totalForDomain > 0 ? totalForDomain.toString() : "-", s: dataStyle });
    });
    allData.push(totalRowExcel);

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

    // Add Daily Schedule Data
    dailyScheduleDataExcel.forEach(item => {
      allData.push([
        { v: item.domain, s: dataStyle },
        { v: item.batch, s: dataStyle },
        { v: item.batchCode, s: dataStyle },
        { v: item.trainerName, s: dataStyle },
        { v: item.trainerId, s: dataStyle },
        { v: item.date, s: dataStyle },
        { v: item.day, s: dataStyle },
        { v: item.hours, s: dataStyle },
        { v: item.slot, s: dataStyle },
        { v: item.timing, s: dataStyle },
        { v: item.rate, s: costStyle },
        { v: item.dailyCost, s: costStyle }
      ]);
    });

    // Calculate total labor cost
    const totalCostExcel = dailyScheduleDataExcel.reduce((sum, item) => {
      const costStr = item.dailyCost;
      if (costStr && costStr !== "-") {
        const cost = parseFloat(costStr.replace('₹', ''));
        return sum + (isNaN(cost) ? 0 : cost);
      }
      return sum;
    }, 0);

    // Calculate total hours
    const totalHoursExcel = dailyScheduleDataExcel.reduce((sum, item) => {
      return sum + parseFloat(item.hours || 0);
    }, 0);

    // Add blank row for gap
    allData.push([""]);

    // Add total row with both totals
    allData.push([
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "Total Hours", s: tableHeaderStyle },
      { v: totalHoursExcel.toFixed(2), s: dataStyle },
      { v: "", s: dataStyle },
      { v: "", s: dataStyle },
      { v: "Total Cost", s: tableHeaderStyle },
      { v: `₹${totalCostExcel.toFixed(2)}`, s: costStyle }
    ]);

    // Create the single sheet
    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    
    // Calculate column widths dynamically based on content
    const colWidths = [];
    // Batch table columns (Batch Code + domains)
    const batchTableCols = 1 + Array.from(allDomainsExcel).length; // Batch Code + number of domains
    colWidths.push({ width: 50 }); // Wider for header
    for (let i = 1; i < batchTableCols; i++) {
      colWidths.push({ width: 15 }); // Fixed width for batch table columns
    }
    // Daily schedule columns
    colWidths.push(
      { width: 25 }, { width: 20 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 15 }, 
      { width: 15 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 15 }, { width: 15 }
    );
    
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Complete Report");

    // Generate and download the file
    XLSX.writeFile(workbook, `College_Summary_Report_${trainingData?.projectCode}_${training.selectedPhase}.xlsx`);
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
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-54 p-4">
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
                  a.download = `College_Summary_Report_${trainingData?.projectCode}_${training.selectedPhase}.pdf`;
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
