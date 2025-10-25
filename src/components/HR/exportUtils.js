import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

export const exportBillsToExcel = (bills, filename = 'trainer_bills.xlsx') => {
  try {
    // Prepare data for Excel export
    const exportData = bills.map((bill, index) => ({
      'S.No': index + 1,
      'Invoice Number': bill.billNumber || 'N/A',
      'Trainer Name': bill.trainerName || '',
      'Trainer ID': bill.trainerId || '',
      'College Name': bill.collegeName || '',
      'Phase': bill.phase || '',
      'Domain': bill.domain || '',
      'Total Hours': bill.hours || bill.totalHours || 0,
      'Rate (₹)': bill.rate || bill.trainingRate || 0,
      'Total Amount (₹)': bill.amount || bill.totalAmount || 0,
      'Status': bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : '',
      'Submitted Date': bill.submittedDate ? new Date(bill.submittedDate).toLocaleDateString() : '',
      'Trainer Email': bill.trainerEmail || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 6 },  // S.No
      { wch: 20 }, // Invoice Number (increased width)
      { wch: 20 }, // Trainer Name
      { wch: 12 }, // Trainer ID
      { wch: 25 }, // College Name
      { wch: 8 },  // Phase
      { wch: 15 }, // Domain
      { wch: 12 }, // Total Hours
      { wch: 12 }, // Rate
      { wch: 18 }, // Total Amount
      { wch: 12 }, // Status
      { wch: 15 }, // Submitted Date
      { wch: 25 }, // Trainer Email
    ];
    ws['!cols'] = colWidths;

    // Get the range of the data
    const range = XLSX.utils.decode_range(ws['!ref']);
    const totalRows = range.e.r + 1;
    const totalCols = range.e.c + 1;

    // No title row - just use the data as is with headers
    // Update the range
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: totalCols - 1 } });

    // Freeze the header row (row 1, which is index 0)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Apply comprehensive styling with xlsx-js-style
    for (let R = 0; R <= totalRows; ++R) {
      for (let C = 0; C < totalCols; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;

        // Header row styling (row 0)
        if (R === 0) {
          ws[cellAddress].s = {
            font: { 
              bold: true, 
              sz: 12, 
              color: { rgb: "FFFFFF" },
              name: "Calibri"
            },
            alignment: { 
              horizontal: "center", 
              vertical: "center",
              wrapText: true
            },
            fill: { 
              fgColor: { rgb: "1E40AF" },
              patternType: "solid"
            },
            border: {
              top: { style: "medium", color: { rgb: "1E40AF" } },
              bottom: { style: "medium", color: { rgb: "1E40AF" } },
              left: { style: "thin", color: { rgb: "1E40AF" } },
              right: { style: "thin", color: { rgb: "1E40AF" } }
            }
          };
        }
        // Data rows styling
        else if (R >= 1) {
          const isEvenRow = (R - 1) % 2 === 0;
          
          // Base styling
          ws[cellAddress].s = {
            font: { 
              sz: 11, 
              color: { rgb: "374151" },
              name: "Calibri"
            },
            alignment: { vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };

          // Alternating row colors with solid pattern
          if (isEvenRow) {
            ws[cellAddress].s.fill = { 
              fgColor: { rgb: "F9FAFB" },
              patternType: "solid"
            };
          } else {
            ws[cellAddress].s.fill = { 
              fgColor: { rgb: "FFFFFF" },
              patternType: "solid"
            };
          }

          // Column-specific styling
          if (C === 0) { // S.No column - center align
            ws[cellAddress].s.alignment = { 
              horizontal: "center", 
              vertical: "center" 
            };
          } else if (C === 7 || C === 8 || C === 9) { // Numeric columns - right align with number format
            ws[cellAddress].s.alignment = { 
              horizontal: "right", 
              vertical: "center" 
            };
            // Add number formatting for currency columns
            if (C === 8 || C === 9) {
              ws[cellAddress].t = 'n'; // number type
              ws[cellAddress].z = '₹#,##0'; // Indian rupee format
            }
          } else if (C === 10) { // Status column - center align with enhanced color coding
            ws[cellAddress].s.alignment = { 
              horizontal: "center", 
              vertical: "center" 
            };
            const statusValue = ws[cellAddress].v?.toString().toLowerCase();
            if (statusValue === 'approved') {
              ws[cellAddress].s.fill = { 
                fgColor: { rgb: "DCFCE7" },
                patternType: "solid"
              };
              ws[cellAddress].s.font = { 
                sz: 11,
                color: { rgb: "166534" },
                bold: true,
                name: "Calibri"
              };
            } else if (statusValue === 'rejected') {
              ws[cellAddress].s.fill = { 
                fgColor: { rgb: "FEE2E2" },
                patternType: "solid"
              };
              ws[cellAddress].s.font = { 
                sz: 11,
                color: { rgb: "991B1B" },
                bold: true,
                name: "Calibri"
              };
            } else if (statusValue === 'pending' || statusValue === 'generated') {
              ws[cellAddress].s.fill = { 
                fgColor: { rgb: "FEF3C7" },
                patternType: "solid"
              };
              ws[cellAddress].s.font = { 
                sz: 11,
                color: { rgb: "92400E" },
                bold: true,
                name: "Calibri"
              };
            }
          } else { // Text columns - left align
            ws[cellAddress].s.alignment = { 
              horizontal: "left", 
              vertical: "center",
              wrapText: true
            };
          }
        }
      }
    }

    // Update final range
    ws['!ref'] = XLSX.utils.encode_range({ 
      s: { r: 0, c: 0 }, 
      e: { r: totalRows, c: totalCols - 1 } 
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Trainer Bills');

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, filename);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export bills to Excel');
  }
};