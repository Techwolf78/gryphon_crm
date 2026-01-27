// Utility for generating trainer invoice PDF
import { saveAs } from 'file-saver';
import { logInvoiceAction, AUDIT_ACTIONS } from '../../utils/trainerInvoiceAuditLogger';

// Helper function to format payment cycle for display
const formatPaymentCycle = (cycleStr) => {
  if (!cycleStr || cycleStr === 'unknown') return 'Unknown';

  // Parse format like "2025-12-1-15" or "2025-12-16-31"
  const parts = cycleStr.split('-');
  if (parts.length !== 4) return cycleStr;

  const [year, month, startDay, endDay] = parts;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[parseInt(month) - 1] || month;

  return `${monthName} ${year} (Days ${startDay}-${endDay})`;
};

export const generateInvoicePDF = async (invoiceData) => {
  try {
    // console.log('🎯 Starting PDF generation for invoice:', invoiceData?.billNumber);
    // console.log('📊 Invoice data received:', invoiceData);

    // Validate required fields
    const requiredFields = [
      'trainerName', 'billNumber', 'projectCode', 'domain', 'startDate', 'endDate',
      'trainingRate', 'totalHours', 'bankName', 'accountNumber', 'ifscCode', 'panNumber'
    ];

    const missingFields = requiredFields.filter(field => !invoiceData || !invoiceData[field]);
    if (missingFields.length > 0) {
      // console.error('❌ Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    // Ensure all fields have default values
    const safeInvoiceData = {
      trainerName: invoiceData.trainerName || 'N/A',
      billNumber: invoiceData.billNumber || 'N/A',
      projectCode: invoiceData.projectCode || 'N/A',
      domain: invoiceData.domain || 'N/A',
      topics: invoiceData.topics || 'N/A',
      startDate: invoiceData.startDate || '',
      endDate: invoiceData.endDate || '',
      billingDate: invoiceData.billingDate || '',
      paymentCycle: invoiceData.paymentCycle || null,
      trainingRate: invoiceData.trainingRate || 0,
      totalHours: invoiceData.totalHours || 0,
      tds: invoiceData.tds || 0,
      adhocAdjustment: invoiceData.adhocAdjustment || 0,
      conveyance: invoiceData.conveyance || 0,
      food: invoiceData.food || 0,
      lodging: invoiceData.lodging || 0,
      totalStudents: invoiceData.totalStudents || 0,
      bankName: invoiceData.bankName || 'N/A',
      accountNumber: invoiceData.accountNumber || 'N/A',
      ifscCode: invoiceData.ifscCode || 'N/A',
      panNumber: invoiceData.panNumber || 'N/A',
      gst: invoiceData.gst || 'NA',
    };

    // console.log('🔧 Using safe invoice data:', safeInvoiceData);

    const logo = await import('../../assets/gryphon_logo.png');

    const doc = new jsPDF();

    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 195, 280);

    // add logo
    try {
      doc.addImage(logo.default || logo, 'PNG', 15, 9, 30, 15);
      // console.log('✅ Logo added successfully');
    } catch (logoError) {
      // console.warn('⚠️ Logo loading failed:', logoError);
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
    doc.text('9th Floor, Olympia Business House (Archlare)', xPosition, yPosition);
    yPosition += 4.5;
    doc.text('Next to Supreme HQ, Mumbai - Pune Highway, Baner', xPosition, yPosition);
    yPosition += 4.5;
    doc.text('Pune, MH - 411045', xPosition, yPosition);
    yPosition += 10;
    doc.text('From', xPosition, yPosition);
    yPosition += 6;
    doc.text(`${safeInvoiceData.trainerName}`, xPosition, yPosition);
    yPosition += 4.5;

    // Bill & Account details
    const isJDDomain = safeInvoiceData.domain === 'JD';
    const projectLabel = isJDDomain ? 'Projects' : 'Project Code';
    const projectValue = isJDDomain && safeInvoiceData.projectCode.includes(',') 
      ? safeInvoiceData.projectCode.split(',').map(p => p.trim()).join('\n')
      : safeInvoiceData.projectCode;

    autoTable(doc, {
      startY: yPosition,
      body: [
        ['Bill Details', 'Account Details of Trainer'],
        [`Bill Number: ${safeInvoiceData.billNumber}`, `Name in Bank: ${safeInvoiceData.trainerName}`],
        [`${projectLabel}: ${projectValue}`, `Bank Name: ${safeInvoiceData.bankName}`],
        [`Domain: ${safeInvoiceData.domain}`, `Bank Account No: ${safeInvoiceData.accountNumber}`],
        [`Topic: ${safeInvoiceData.topics}`, `IFSC Code: ${safeInvoiceData.ifscCode}`],
        [`From: ${formatDate(safeInvoiceData.startDate)}`, `PAN Card: ${safeInvoiceData.panNumber}`],
        [`To: ${formatDate(safeInvoiceData.endDate)}`, `Billing Date: ${formatDate(safeInvoiceData.billingDate)}`],
        ...(safeInvoiceData.paymentCycle ? [[`Payment Cycle: ${formatPaymentCycle(safeInvoiceData.paymentCycle)}`, '']] : []),
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

    const trainingAmount = Math.round(safeInvoiceData.totalHours * safeInvoiceData.trainingRate);
    const conveyance = safeInvoiceData.conveyance || 0;
    const food = safeInvoiceData.food || 0;
    const lodging = safeInvoiceData.lodging || 0;
    const subTotal = trainingAmount + conveyance + food + lodging;
    const gstAmount = safeInvoiceData.gst === "18" ? Math.round(trainingAmount * 0.18) : 0;
    const taxableAmount = trainingAmount + gstAmount;
    const tdsAmount = (taxableAmount * (safeInvoiceData.tds || 0)) / 100;
    const otherExpenses = subTotal - trainingAmount;
    const adhocAdjustment = safeInvoiceData.adhocAdjustment || 0;
    const netPayable = taxableAmount - tdsAmount + otherExpenses + adhocAdjustment;

    // Calculate number of sessions (training days)
    const calculateSessions = () => {
      if (!safeInvoiceData.startDate || !safeInvoiceData.endDate) return '';
      const start = new Date(safeInvoiceData.startDate);
      const end = new Date(safeInvoiceData.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
      const diffTime = Math.abs(end - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
      return diffDays.toString();
    };

    const numberOfSessions = calculateSessions();

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: [
        ['Charges', 'Rate', 'Total Hrs/Days', 'Total Amount'],
        ['Training Charges per Hour', `Rs. ${safeInvoiceData.trainingRate}`, `${safeInvoiceData.totalHours}`, `Rs. ${trainingAmount}`],
        ['Conveyance', '-', '-', `Rs. ${conveyance}`],
        ['Food', '-', '-', `Rs. ${food}`],
        ['Lodging', '-', '-', `Rs. ${lodging}`],
        [{ content: 'Total Amount', colSpan: 3, styles: { halign: 'left' } }, `Rs. ${subTotal}`],
        ['Adhoc Addition/Deduction', '-', '-', `Rs. ${adhocAdjustment}`],
        ['Less (TDS)', '-', '-', `Rs. ${tdsAmount}`],
        ['GST', safeInvoiceData.gst === "NA" ? "NA" : `${safeInvoiceData.gst}%`, '-', `Rs. ${gstAmount}`],
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
        if (data.row.index === 9 || data.row.index === 5 || data.row.index === 6 || data.row.index === 7 || data.row.index === 8) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      body: [
        [{ content: 'Summary of Training', colSpan: 2, styles: { halign: 'left', fontSize: 10.5, fonStyle: 'bold', cellPadding: 1.8 } }],
        ['No of Sessions', numberOfSessions],
        ['No of Hours', `${safeInvoiceData.totalHours}`],
        ['No of Attendees', `${safeInvoiceData.totalStudents}`],
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

    const fileName = `Invoice_${safeInvoiceData.billNumber || 'NA'}.pdf`;
    // console.log('💾 Attempting to save PDF with filename:', fileName);

    // Generate PDF as blob for both download and preview
    const pdfBlob = doc.output('blob');
    
    // Log the PDF download action
    await logInvoiceAction(AUDIT_ACTIONS.DOWNLOAD, safeInvoiceData, {
      downloadFormat: 'pdf',
      downloadSource: 'web',
      fileName: fileName
    });
    
    // Download the file and open in new tab
    saveAs(pdfBlob, fileName);
    // console.log('✅ PDF download initiated successfully');
    
    // Also open in new tab for preview
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    // console.log('✅ PDF opened in new tab for preview');

    return true;
  } catch (error) {
    // console.error('❌ PDF generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
    return false;
  }
};
