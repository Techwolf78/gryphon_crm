import * as XLSX from "xlsx-js-style";
import { doc, getDoc } from "firebase/firestore";

export const exportClosedLeads = async (filteredLeads, db) => {
  try {
    const codes = filteredLeads
      .map(([, lead]) => lead.projectCode?.replace(/\//g, "-"))
      .filter(Boolean);

    const formSnaps = await Promise.all(
      codes.map((code) => getDoc(doc(db, "trainingForms", code)))
    );

    const exportData = formSnaps
      .map((snap) => (snap.exists() ? snap.data() : null))
      .filter(Boolean);

    if (exportData.length === 0) {
      alert("No training forms found for the selected leads.");
      return;
    }

    // Prepare data rows with NEW LINE formatting
    const rows = exportData.map((form) => {
      // Specializations - One per line
      const specializationText =
        form.courses
          ?.map((c) => ` ${c.specialization}: ${c.students} students`)
          .join("\n") || "-";

      // Topics - One per line with bullet points
      const topicsText =
        form.topics?.map((t) => ` ${t.topic}: ${t.hours} hours`).join("\n") ||
        "-";

      // Payment Schedule - One per line with bullet points
      const paymentText =
        form.paymentDetails
          ?.map((p) => {
            const paymentInfo = [];
            if (p.type) paymentInfo.push(p.type);
            if (p.name) paymentInfo.push(p.name);
            return ` ${paymentInfo.join(" | ")}: ₹${Number(
              p.totalAmount
            ).toLocaleString("en-IN")}`;
          })
          .join("\n") || "-";

      return {
        "College Name": form.collegeName || "-",
        "College Code": form.collegeCode || "-",
        "GST Number": form.gstNumber || "-",
        Address: form.address || "-",
        City: form.city || "-",
        State: form.state || "-",
        Pincode: form.pincode || "-",
        "TPO Name": form.tpoName || "-",
        "TPO Email": form.tpoEmail || "-",
        "TPO Phone": form.tpoPhone || "-",
        "Training Coordinator": form.trainingName || "-",
        "Training Email": form.trainingEmail || "-",
        "Training Phone": form.trainingPhone || "-",
        "Account Contact": form.accountName || "-",
        "Account Email": form.accountEmail || "-",
        "Account Phone": form.accountPhone || "-",
        Course: form.course || "-",
        Year: form.year || "-",
        "Delivery Mode": form.deliveryType || "-",
        "Passing Year": form.passingYear || "-",
        "Total no. of std. in contract": form.studentCount || "-",
        "Total No of stds. in a year": form.predictedstdcount || "500",
        "Total Hours": form.totalHours ? `${form.totalHours} hrs` : "-",
        Specializations: specializationText,
        "Topics Covered": topicsText,
        "Payment Type": form.paymentType || "-", // Added Payment Type field
        "Payment Schedule": paymentText,
        "MOU URL": form.mouFileUrl || "-",
        "Contract Start": form.contractStartDate || "-",
        "Contract End": form.contractEndDate || "-",
        "EMI Months": form.emiMonths || "-",

        "GST Type": form.gstType || "-",
        "Net Amount (₹)": form.netPayableAmount
          ? Number(form.netPayableAmount)
          : "-",
        "GST Amount (₹)": form.gstAmount ? Number(form.gstAmount) : "-",
        "Total Amount (₹)":
          form.netPayableAmount && form.gstAmount
            ? Number(form.netPayableAmount) + Number(form.gstAmount)
            : "-",
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!rows"] = rows.map(() => ({ hpx: 60 }));
    // ===== STYLING ===== //
    // Define styles
    const headerStyle = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 12,
      },
      fill: {
        fgColor: { rgb: "2F5597" }, // Dark blue
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    const dataStyle = {
      font: {
        sz: 11,
      },
      alignment: {
        vertical: "top",
        wrapText: true,
      },
      border: {
        top: { style: "thin", color: { rgb: "D9D9D9" } },
        bottom: { style: "thin", color: { rgb: "D9D9D9" } },
        left: { style: "thin", color: { rgb: "D9D9D9" } },
        right: { style: "thin", color: { rgb: "D9D9D9" } },
      },
    };

    const amountStyle = {
      ...dataStyle,
      numFmt: '"₹"#,##0.00',
    };

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    // Style headers (first row)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      if (!worksheet[cell]) continue;
      worksheet[cell].s = headerStyle;
    }

    // Style data cells
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cell]) continue;

        // Check if column contains amounts
        const headerCell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const headerText = worksheet[headerCell]?.v;

        if (
          headerText &&
          (headerText.includes("Amount") || headerText.includes("(₹)"))
        ) {
          worksheet[cell].s = amountStyle;
        } else {
          worksheet[cell].s = dataStyle;
        }
      }
    }

    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 }, // College Name
      { wch: 15 }, // College Code
      { wch: 20 }, // GST Number
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // Pincode
      { wch: 20 }, // TPO Name
      { wch: 25 }, // TPO Email
      { wch: 15 }, // TPO Phone
      { wch: 20 }, // Training Coordinator
      { wch: 25 }, // Training Email
      { wch: 15 }, // Training Phone
      { wch: 20 }, // Account Contact
      { wch: 25 }, // Account Email
      { wch: 15 }, // Account Phone
      { wch: 20 }, // Course
      { wch: 10 }, // Year
      { wch: 15 }, // Delivery Mode
      { wch: 15 }, // Passing Year
      { wch: 15 }, // Total Students
      { wch: 20 }, // Total No of stds. in a year
      { wch: 15 }, // Total Hours
      { wch: 25 }, // Specializations
      { wch: 30 }, // Topics Covered
      { wch: 15 }, // Payment Type (NEW COLUMN)
      { wch: 25 }, // Payment Schedule
      { wch: 40 }, // MOU URL
      { wch: 15 }, // Contract Start
      { wch: 15 }, // Contract End
      { wch: 12 }, // EMI Months
      { wch: 12 }, // GST Type (NEW COLUMN WIDTH)
      { wch: 15 }, // Net Amount (₹)
      { wch: 15 }, // GST Amount (₹)
      { wch: 15 }, // Total Amount (₹)
    ];

    // Freeze header row
    worksheet["!freeze"] = { ySplit: 1 };

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Training Forms");

    // Generate date for filename (without time)
    const dateStr = new Date().toISOString().split("T")[0]; // This gives YYYY-MM-DD format

    // Export the workbook with updated filename
    XLSX.writeFile(workbook, `Client_Onboarded_Data_${dateStr}.xlsx`);
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to generate export. Please try again.");
  }
};
