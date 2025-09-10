// Utility for generating trainer invoice PDF
export const generateInvoicePDF = async (invoiceData) => {
  try {
    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;
    const logo = await import('../../assets/gryphon_logo.png');

    const doc = new jsPDF();

    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 195, 280);
    // add logo
    try {
      doc.addImage(logo.default || logo, 'PNG', 15, 9, 30, 15);
    } catch {
      // ignore logo errors
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date)) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Header
    doc.setFontSize(17);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Trainer Invoice', 105, 21, { align: 'center' });

    doc.setFontSize(9.8);
    doc.setFont(undefined, 'normal');
    let yPosition = 40;
    let xPosition = 15;
    doc.text('To', xPosition, yPosition);
    yPosition += 6;
    doc.text('Gryphon Academy', xPosition, yPosition);
    yPosition += 4.5;
    doc.text('9th Floor, Olympia Business House (Achnalare)', xPosition, yPosition);
    yPosition += 4.5;
    doc.text('Next to Supreme HQ, Mum - Pune Highway, Baner', xPosition, yPosition);
    yPosition += 4.5;
    doc.text('Pune, MH - 411045', xPosition, yPosition);
    yPosition += 10;
    doc.text('From', xPosition, yPosition);
    yPosition += 6;
    doc.text(`${invoiceData.trainerName}`, xPosition, yPosition);
    yPosition += 4.5;

    // Bill & Account details
    autoTable(doc, {
      startY: yPosition,
      body: [
        ['Bill Details', 'Account Details of Trainer'],
        [`Bill Number: ${invoiceData.billNumber}`, `Name in Bank: ${invoiceData.trainerName}`],
        [`Project Code: ${invoiceData.projectCode}`, `Bank Name: ${invoiceData.bankName}`],
        [`Domain: ${invoiceData.domain}`, `Bank Account No: ${invoiceData.accountNumber}`],
        [`Topic: ${invoiceData.topics}`, `IFSC Code: ${invoiceData.ifscCode}`],
        [`From: ${formatDate(invoiceData.startDate)}`, `PAN Card: ${invoiceData.panNumber}`],
        [`To: ${formatDate(invoiceData.endDate)}`, `Billing Date: ${formatDate(invoiceData.billingDate)}`],
      ],
      theme: 'grid',
      styles: { textColor: [0, 0, 0], fontSize: 9, cellPadding: 1.2, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.2 },
      tableWidth: '100%',
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto' } },
      didParseCell: function (data) {
        if (data.row.index === 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.cellPadding = 1.8;
          data.cell.styles.fontSize = 10.5;
        }
      }
    });

    const trainingAmount = invoiceData.totalHours * invoiceData.trainingRate;
    const conveyance = invoiceData.conveyance || 0;
    const food = invoiceData.food || 0;
    const lodging = invoiceData.lodging || 0;
    const subTotal = trainingAmount + conveyance + food + lodging;
    const tdsAmount = (subTotal * (invoiceData.tds || 0)) / 100;
    const adhocAdjustment = invoiceData.adhocAdjustment || 0;
    const netPayable = subTotal - tdsAmount + adhocAdjustment;

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: [
        ['Charges', 'Rate', 'Total Hrs/Days', 'Total Amount'],
        ['Training Charges per Hour', `Rs. ${invoiceData.trainingRate}`, `${invoiceData.totalHours}`, `Rs. ${trainingAmount}`],
        ['Conveyance', '-', '-', `Rs. ${conveyance}`],
        ['Food', '-', '-', `Rs. ${food}`],
        ['Lodging', '-', '-', `Rs. ${lodging}`],
        [{ content: 'Total Amount', colSpan: 3, styles: { halign: 'left' } }, `Rs. ${subTotal}`],
        ['Adhoc Addition/Deduction', '-', '-', `Rs. ${adhocAdjustment}`],
        ['Less (TDS)', '-', '-', `Rs. ${tdsAmount}`],
        [{ content: 'Net Payment', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold' } }, `Rs. ${netPayable}`],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
      didParseCell: function (data) {
        if (data.row.index === 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.cellPadding = 1.8;
          data.cell.styles.fontSize = 10.5;
        }
        if (data.row.index === 8 || data.row.index === 5 || data.row.index === 6 || data.row.index === 7) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: [
        [{ content: 'Summary of Training', colSpan: 2, styles: { halign: 'left', fontSize: 10.5, fonStyle: 'bold', cellPadding: 1.8 } }],
        ['No of Sessions', ''],
        ['No of Hours', `${invoiceData.totalHours}`],
        ['No of Attendees', ''],
        ['Average Students/ Batch', '-']
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 'auto' } },
      didParseCell: function (data) {
        if (data.row.index === 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10.5;
        }
      }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      body: [
        ['L & D Manager', 'Co-founder', 'Paid By', 'Date/Stamp', 'Ref. ID'],
        ['', '', '', '', ''],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center', textColor: [0, 0, 0] },
      didParseCell: function (data) {
        if (data.row.index === 1) {
          data.cell.styles.cellPadding = 6;
        }
      }
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120);

    doc.text(
      'This Invoice is issued in accordance with the provisions of the Information Technology Act, 2000 (21 of 2000),',
      doc.internal.pageSize.getWidth() / 2,
      pageHeight - 16,
      { align: 'center' }
    );

    doc.text('hence physical signature is not required.', doc.internal.pageSize.getWidth() / 2, pageHeight - 12, { align: 'center' });
    doc.setGState(new doc.GState({ opacity: 0.2 }));

    try {
      doc.addImage(logo.default || logo, 'PNG', pageWidth / 2 - 40, pageHeight / 2 - 40, 80, 45);
    } catch {
      // ignore
    }

    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.save(`Invoice_${invoiceData.billNumber || 'NA'}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
    return false;
  }
};
