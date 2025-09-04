import React, { useState } from "react";
import jsPDF from "jspdf";
import { getDoc, doc } from "firebase/firestore";
import { FiDownload } from "react-icons/fi";
import { db } from "../../../firebase";

function TrainerCalendarPDF({ bookings, selectedTrainer, selectedCollege, disabled }) {
  const [loading, setLoading] = useState(false);

  const exportPDF = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      // Fetch additional data from trainingForms
      let venue = 'To be specified';
      let contactPerson = 'To be specified';
      let contactNumber = 'To be specified';
      if (bookings[0]?.sourceTrainingId) {
        try {
          const trainingDoc = await getDoc(doc(db, 'trainingForms', bookings[0].sourceTrainingId));
          if (trainingDoc.exists()) {
            const data = trainingDoc.data();
            venue = data.venue || venue;
            contactPerson = data.contactPerson || contactPerson;
            contactNumber = data.contactNumber || contactNumber;
          }
        } catch (err) {
          console.warn('Failed to fetch training data for PDF:', err);
        }
      }
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Training Assignment Invoice', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // College Information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('College Details:', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      // Get college name(s) from selected college or all bookings
      let collegeName;
      if (selectedCollege) {
        collegeName = selectedCollege;
      } else {
        const uniqueColleges = [...new Set(bookings.map(b => b.collegeName).filter(Boolean))];
        collegeName = uniqueColleges.length > 0 ? uniqueColleges.join(', ') : 'Not Specified';
      }
      pdf.text(`1. College Name: ${collegeName}`, 25, yPosition);
      yPosition += 6;

      pdf.text(`2. Venue: ${venue}`, 25, yPosition);
      yPosition += 6;

      pdf.text(`3. Contact Person: ${contactPerson}`, 25, yPosition);
      yPosition += 6;

      pdf.text(`4. Contact Number: ${contactNumber}`, 25, yPosition);
      yPosition += 10;

      // Schedule Details Header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('5. Details of Schedule', 20, yPosition);
      yPosition += 10;

      // Table Headers
      const headers = [
        'Domain', 'Year', 'Trainer Name', 'Date', 'Batch',
        'Hrs.', 'Cost/hrs', 'Cost/day',
        'Food+Lodging/Day', 'Travel To & Fro', 'Total Amount'
      ];

      const colWidths = [20, 12, 24, 20, 16, 10, 14, 14, 20, 16, 16];
      let xPosition = 20;

      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');

      // Draw header row with borders
      let headerY = yPosition;
      headers.forEach((header, index) => {
        const lines = pdf.splitTextToSize(header, colWidths[index] - 2);
        pdf.text(lines, xPosition + 1, yPosition + 4); // Slight padding
        // Draw cell border
        pdf.rect(xPosition, headerY, colWidths[index], 6);
        xPosition += colWidths[index];
      });

      yPosition += 6;

      // Draw table lines
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.3);
      let tableStartY = headerY;

      // Horizontal lines
      pdf.line(20, tableStartY, pageWidth - 20, tableStartY); // Top line
      pdf.line(20, yPosition, pageWidth - 20, yPosition); // Bottom of header

      // Vertical lines for columns
      xPosition = 20;
      headers.forEach((_, index) => {
        pdf.line(xPosition, tableStartY, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      pdf.line(xPosition, tableStartY, xPosition, yPosition); // Rightmost line

      // Process bookings data
      let totalHours = 0;
      let totalDays = new Set();
      let totalCost = 0;
      // Default rate - could be made configurable
      const defaultHourlyRate = bookings[0]?.perHourCost || 1500;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);

      bookings.forEach((booking) => {
        if (yPosition > pageHeight - 40) {
          // Add new page
          pdf.addPage();
          yPosition = 20;
          tableStartY = yPosition - 6;

          // Redraw headers on new page
          xPosition = 20;
          pdf.setFont('helvetica', 'bold');
          headers.forEach((header, colIndex) => {
            const lines = pdf.splitTextToSize(header, colWidths[colIndex] - 2);
            pdf.text(lines, xPosition + 1, yPosition + 4);
            pdf.rect(xPosition, yPosition, colWidths[colIndex], 6);
            xPosition += colWidths[colIndex];
          });
          pdf.line(20, yPosition, pageWidth - 20, yPosition);
          pdf.line(20, yPosition + 6, pageWidth - 20, yPosition + 6);
          xPosition = 20;
          headers.forEach((_, colIndex) => {
            pdf.line(xPosition, yPosition, xPosition, yPosition + 6);
            xPosition += colWidths[colIndex];
          });
          pdf.line(xPosition, yPosition, xPosition, yPosition + 6);
          yPosition += 6;
        }

        const date = new Date(booking.dateISO).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const hours = booking.dayDuration?.includes('AM') && booking.dayDuration?.includes('PM') ? 8 : 4;
        const costPerDay = hours * (booking.perHourCost || defaultHourlyRate);
        const foodLodging = (booking.food || 0) + (booking.lodging || 0);
        const travel = booking.conveyance || 0;
        const totalAmount = costPerDay + foodLodging + travel;

        totalHours += hours;
        totalDays.add(booking.dateISO);
        totalCost += totalAmount;

        const rowData = [
          booking.domain || 'Technical',
          booking.year || '2nd Year',
          booking.trainerName || booking.trainerId || 'Unknown',
          date,
          booking.batchCode || booking.domain || 'General',
          hours.toString(),
          (booking.perHourCost || defaultHourlyRate).toString(),
          costPerDay.toString(),
          foodLodging.toString(),
          travel.toString(),
          totalAmount.toString()
        ];

        let rowY = yPosition;
        xPosition = 20;
        rowData.forEach((data, colIndex) => {
          const lines = pdf.splitTextToSize(data.toString(), colWidths[colIndex] - 2);
          pdf.text(lines, xPosition + 1, yPosition + 4);
          pdf.rect(xPosition, rowY, colWidths[colIndex], 6);
          xPosition += colWidths[colIndex];
        });

        yPosition += 6;

        // Draw horizontal line after each row
        pdf.line(20, yPosition, pageWidth - 20, yPosition);

        // Vertical lines for this row
        xPosition = 20;
        rowData.forEach((_, colIndex) => {
          pdf.line(xPosition, rowY, xPosition, yPosition);
          xPosition += colWidths[colIndex];
        });
        pdf.line(xPosition, rowY, xPosition, yPosition);
      });

      // Summary Section
      yPosition += 10;

      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      // Totals
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');

      const tdsAmount = totalCost * 0.1; // 10% TDS
      const payableAmount = totalCost - tdsAmount;

      pdf.text(`Total Assignment Days = ${totalDays.size} Days`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Hours of assignment = ${totalHours} Hrs.`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Start Date: ${Array.from(totalDays).sort()[0] ? new Date(Array.from(totalDays).sort()[0]).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Professional Fee: Rs ${defaultHourlyRate}/Hrs.`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Assignment Cost: Rs ${totalCost.toLocaleString()}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Payable Cost: Rs ${payableAmount.toLocaleString()}`, 20, yPosition);

      // Footer
      yPosition += 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, pageHeight - 10);
      pdf.text(`Total Bookings: ${bookings.length}`, pageWidth - 60, pageHeight - 10);

      // Save the PDF
      const filename = `training-assignment-${selectedTrainer || 'all'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`Failed to generate PDF: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={disabled || loading}
      onClick={exportPDF}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
        disabled || loading
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      <FiDownload className="w-4 h-4" />
      <span className="hidden sm:inline">{loading ? 'Generating...' : 'Export PDF'}</span>
      <span className="sm:hidden">{loading ? 'PDF...' : 'PDF'}</span>
    </button>
  );
}

export default TrainerCalendarPDF;
