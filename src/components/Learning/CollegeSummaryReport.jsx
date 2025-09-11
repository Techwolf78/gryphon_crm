import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FiDownload, FiEye, FiX } from "react-icons/fi";

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
  const [showPreview, setShowPreview] = useState(false);
  const [customization, setCustomization] = useState({
    includeSummary: true,
    includeDomainDetails: true,
    includeTrainerDetails: true,
    includeScheduleTables: true,
    includeFooter: true,
    excludeEmptyBatches: true,
  });
  const [pdfBlob, setPdfBlob] = useState(null);
  const generatePDF = (options = customization, download = true) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("College Summary Report", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${trainingData?.collegeName} (${trainingData?.collegeCode})`,
      105,
      35,
      { align: "center" }
    );

    doc.setFontSize(12);
    doc.text(`Course: ${trainingData?.course} - ${trainingData?.year}`, 20, 50);
    doc.text(
      `Phase: ${
        PHASE_LABELS[training.selectedPhase] || training.selectedPhase
      }`,
      20,
      60
    );
    doc.text(
      `Training Period: ${formatDate(
        phaseData?.trainingStartDate
      )} to ${formatDate(phaseData?.trainingEndDate)}`,
      20,
      70
    );
    doc.text(
      `College Timing: ${phaseData?.collegeStartTime} - ${phaseData?.collegeEndTime}`,
      20,
      80
    );

    let yPosition = 100;

    // Summary
    if (options.includeSummary) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Total Students: ${trainingData?.studentCount || 0}`,
        20,
        yPosition
      );
      yPosition += 10;
      doc.text(`Total Hours: ${trainingData?.totalHours || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Domains: ${domainsData.length}`, 20, yPosition);
      yPosition += 25;
    }

    // Domain-wise details
    if (options.includeDomainDetails) {
      domainsData.forEach((domainInfo) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Domain: ${domainInfo.domain}`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Domain Hours: ${domainInfo.domainHours || 0} | Assigned Hours: ${
            domainInfo.assignedHours || 0
          }`,
          20,
          yPosition
        );
        yPosition += 15;

        if (
          Array.isArray(domainInfo.table1Data) &&
          domainInfo.table1Data.length > 0
        ) {
          domainInfo.table1Data.forEach((row) => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }

            if (row.batches && row.batches.length > 0) {
              // Filter out empty batches if option is enabled
              const filteredBatches = options.excludeEmptyBatches
                ? row.batches.filter(batch =>
                    batch.trainers && batch.trainers.length > 0
                  )
                : row.batches;

              // Only show batch if it has filtered batches or if we're not excluding empty ones
              if (filteredBatches.length > 0 || !options.excludeEmptyBatches) {
                // Print batch header with better formatting
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(41, 128, 185); // Blue color
                doc.text(`Batch: ${row.batch}`, 20, yPosition);
                yPosition += 8;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100); // Gray color
                doc.text(`${row.stdCount} students • ${row.assignedHours} hours assigned`, 20, yPosition);
                yPosition += 15;

                filteredBatches.forEach((batch) => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }

                // Batch header with background
                doc.setFillColor(248, 249, 250); // Light gray background
                doc.rect(15, yPosition - 5, 180, 12, 'F');

                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(52, 73, 94); // Dark blue
                doc.text(`Batch: ${batch.batchCode}`, 20, yPosition + 2);
                yPosition += 8;

                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                doc.text(`${batch.batchPerStdCount || 0} students • ${batch.assignedHours || 0} hours`, 20, yPosition);
                yPosition += 12;

                if (
                  options.includeTrainerDetails &&
                  batch.trainers &&
                  batch.trainers.length > 0
                ) {
                  batch.trainers.forEach((trainer) => {
                    if (yPosition > 240) {
                      doc.addPage();
                      yPosition = 20;
                    }

                    // Trainer card background
                    doc.setFillColor(255, 255, 255); // White background
                    doc.setDrawColor(200, 200, 200); // Light gray border
                    doc.setLineWidth(0.5);
                    doc.rect(18, yPosition - 3, 170, 35, 'FD'); // Filled rectangle with border

                    // Trainer name and ID
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(46, 49, 49); // Dark gray
                    doc.text(`${trainer.trainerName || "Unassigned"}`, 25, yPosition + 2);

                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(100, 100, 100);
                    doc.text(`ID: ${trainer.trainerId}`, 25, yPosition + 7);

                    // Trainer details in two columns
                    const leftX = 25;
                    const rightX = 100;
                    let detailY = yPosition + 12;

                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(52, 73, 94);

                    // Left column
                    doc.text(`Duration: ${trainer.dayDuration || "-"}`, leftX, detailY);
                    doc.text(`Hours: ${trainer.assignedHours || 0}`, leftX, detailY + 4);
                    doc.text(`Period: ${formatDate(trainer.startDate)} - ${formatDate(trainer.endDate)}`, leftX, detailY + 8);

                    // Right column
                    if (trainer.topics && trainer.topics.length > 0) {
                      const topicsText = `Topics: ${Array.isArray(trainer.topics) ? trainer.topics.join(", ") : trainer.topics}`;
                      // Handle long topics text by wrapping
                      const maxWidth = 80;
                      const wrappedTopics = doc.splitTextToSize(topicsText, maxWidth);
                      doc.text(wrappedTopics, rightX, detailY);
                    }

                    yPosition += 40;

                    // Schedule table
                    if (
                      options.includeScheduleTables &&
                      trainer.startDate &&
                      trainer.endDate
                    ) {
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
                        } else if (
                          excludeDays === "Sunday" &&
                          dayOfWeek === 0
                        ) {
                          shouldInclude = false;
                        } else if (
                          excludeDays === "Both" &&
                          (dayOfWeek === 0 || dayOfWeek === 6)
                        ) {
                          shouldInclude = false;
                        }

                        if (shouldInclude) {
                          dates.push(new Date(current));
                        }
                        current.setDate(current.getDate() + 1);
                      }

                      let hoursArray = [];
                      if (
                        trainer.dailyHours &&
                        Array.isArray(trainer.dailyHours) &&
                        trainer.dailyHours.length === dates.length
                      ) {
                        hoursArray = trainer.dailyHours;
                      } else {
                        const totalDays = dates.length;
                        const hoursPerDay =
                          totalDays > 0
                            ? (trainer.assignedHours || 0) / totalDays
                            : 0;
                        hoursArray = new Array(totalDays).fill(hoursPerDay);
                      }

                      const scheduleData = dates.map((date, index) => [
                        formatDate(date),
                        hoursArray[index]?.toFixed(2) || "0.00",
                        trainer.dayDuration || "-",
                        getTimingForSlot(trainer.dayDuration, phaseData),
                        domainInfo.domain,
                      ]);

                      if (scheduleData.length > 0) {
                        autoTable(doc, {
                          startY: yPosition + 5,
                          head: [
                            [
                              "Date",
                              "Hours",
                              "Slot",
                              "Timing",
                              "Domain",
                            ],
                          ],
                          body: scheduleData,
                          styles: { fontSize: 8 },
                          headStyles: { fillColor: [41, 128, 185] },
                        });
                        yPosition = doc.lastAutoTable.finalY + 10;
                      }
                    }

                    yPosition += 10;
                  });
                } else if (options.includeTrainerDetails) {
                  // No trainers message with styled background
                  doc.setFillColor(255, 248, 248); // Light red background
                  doc.setDrawColor(220, 53, 69); // Red border
                  doc.setLineWidth(0.3);
                  doc.rect(18, yPosition - 2, 170, 8, 'FD');

                  doc.setFontSize(9);
                  doc.setFont("helvetica", "italic");
                  doc.setTextColor(220, 53, 69);
                  doc.text("No trainers assigned", 25, yPosition + 3);
                  yPosition += 12;
                }

                yPosition += 8;
              });
              } // Close batch display condition
            }

            yPosition += 15;
          });
        } else {
          doc.setFontSize(10);
          doc.text("No batch data available for this domain.", 20, yPosition);
          yPosition += 10;
        }

        yPosition += 15;
      });
    }

    // Footer
    if (options.includeFooter) {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("Generated by Gryphon Academy CRM", 105, 295, {
          align: "center",
        });
      }
    }

    if (download) {
      // Download the PDF
      doc.save(
        `College_Summary_Report_${trainingData?.collegeCode}_${training.selectedPhase}.pdf`
      );
    } else {
      // Return blob for preview
      const blob = doc.output("blob");
      setPdfBlob(blob);
      return blob;
    }
  };

  const handlePreview = () => {
    generatePDF(customization, false);
    setShowPreview(true);
  };

  const handleDownload = () => {
    generatePDF(customization, true);
  };

  const handleCustomizationChange = (key, value) => {
    setCustomization((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
        >
          <FiEye className="w-4 h-4" />
          Preview Report
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm"
        >
          <FiDownload className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-54">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Report Preview & Customization
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex h-[70vh]">
              {/* Customization Panel */}
              <div className="w-80 p-4 border-r bg-gray-50 overflow-y-auto">
                <h3 className="font-medium text-gray-800 mb-4">
                  Customize Report
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.includeSummary}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "includeSummary",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Include Summary Section</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.includeDomainDetails}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "includeDomainDetails",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Include Domain Details</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.includeTrainerDetails}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "includeTrainerDetails",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Include Trainer Details</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.includeScheduleTables}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "includeScheduleTables",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Include Schedule Tables</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.excludeEmptyBatches}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "excludeEmptyBatches",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Exclude Empty Batches (no trainers)</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.includeFooter}
                      onChange={(e) =>
                        handleCustomizationChange(
                          "includeFooter",
                          e.target.checked
                        )
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Include Footer</span>
                  </label>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      generatePDF(customization, false);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Refresh Preview
                  </button>
                </div>
              </div>

              {/* PDF Preview */}
              <div className="flex-1 p-4">
                {pdfBlob ? (
                  <iframe
                    src={URL.createObjectURL(pdfBlob)}
                    className="w-full h-full border rounded-lg"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <FiEye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Click "Refresh Preview" to generate the PDF preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Customize the report by selecting/deselecting sections above
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDownload();
                    setShowPreview(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CollegeSummaryReport;
