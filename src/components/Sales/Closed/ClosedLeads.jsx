import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import ClosedLeadsProgressBar from "./ClosedLeadsProgressBar";
import ClosedLeadsTable from "./ClosedLeadsTable";
import ClosedLeadsStats from "./ClosedLeadsStats";
import TrainingForm from "../ClosureForm/TrainingForm";
// 👇 Use xlsx-js-style for styling
import * as XLSX from "xlsx-js-style";
import Papa from "papaparse";

const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser, users }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [selectedClosureForm, setSelectedClosureForm] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("all");

  const handleEditClosureForm = async (lead) => {
    try {
      // Project code sanitize
      const sanitizedCode = lead.projectCode?.replace(/\//g, "-");
      if (!sanitizedCode) {
        console.error("Project code not found!");
        return;
      }

      const formRef = doc(db, "trainingForms", sanitizedCode);
      const formSnap = await getDoc(formRef);

      if (formSnap.exists()) {
        const formData = formSnap.data();
        // Ye data tumhare modal ko bhejna he (TrainingForm)
        setSelectedClosureForm(formData);

        setSelectedLead(lead);
        setShowClosureForm(true);
      } else {
        console.error("Form not found");
      }
    } catch (error) {
      console.error("Error fetching closure form:", error);
    }
  };

  const fetchTargets = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "quarterly_targets"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTargets(data);
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const getFinancialYear = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getQuarter = (date) => {
    const m = date.getMonth() + 1;
    if (m >= 4 && m <= 6) return "Q1";
    if (m >= 7 && m <= 9) return "Q2";
    if (m >= 10 && m <= 12) return "Q3";
    return "Q4";
  };

  const today = new Date();
  const currentQuarter = getQuarter(today);
  const selectedQuarter =
    quarterFilter === "current" ? currentQuarter : quarterFilter;
  const selectedFY = getFinancialYear(today);

  const currentUserObj = Object.values(users).find(
    (u) => u.uid === currentUser?.uid
  );
  const currentRole = currentUserObj?.role;

  const isUserInTeam = (uid) => {
    if (!uid) return false;

    if (currentRole === "Head") {
      const user = Object.values(users).find((u) => u.uid === uid);
      if (!user) return false;

      // Head can see all managers and all their subordinates
      if (user.role === "Manager") return true;
      if (
        ["Assistant Manager", "Executive"].includes(user.role) &&
        user.reportingManager
      ) {
        // Check if this subordinate's manager is among managers (head team)
        return Object.values(users).some(
          (mgr) => mgr.role === "Manager" && mgr.name === user.reportingManager
        );
      }
    }

    if (currentRole === "Manager") {
      const user = Object.values(users).find((u) => u.uid === uid);
      if (!user) return false;

      if (["Assistant Manager", "Executive"].includes(user.role)) {
        return user.reportingManager === currentUserObj.name;
      }
    }

    return false;
  };

  const filteredLeads = useMemo(() => {
    if (!currentUser) return [];
 
    return Object.entries(leads)
      .filter(([, lead]) => {
        if (viewMyLeadsOnly) {
          return lead.assignedTo?.uid === currentUser.uid;
        } else if (selectedTeamUserId !== "all") {
          return lead.assignedTo?.uid === selectedTeamUserId;
        } else {
          if (currentRole === "Director") {
            return true;
          }
          if (currentRole === "Head") {
            return isUserInTeam(lead.assignedTo?.uid);
          } else if (currentRole === "Manager") {
            return (
              isUserInTeam(lead.assignedTo?.uid) ||
              lead.assignedTo?.uid === currentUser.uid
            );
          } else {
            return (
              isUserInTeam(lead.assignedTo?.uid) ||
              lead.assignedTo?.uid === currentUser.uid
            );
          }
        }
      })
      .filter(([, lead]) => {
        if (filterType === "all") return true;
        return lead.closureType === filterType;
      })
      .filter(([, lead]) => {
  if (!lead.closedDate) return false; // Only include leads that are actually closed
  if (selectedQuarter === "all") return true;
  const closedQuarter = getQuarter(new Date(lead.closedDate));
  return closedQuarter === selectedQuarter;
})

 
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));
  }, [
    leads,
    currentUser,
    currentRole,
    filterType,
    selectedQuarter,
    viewMyLeadsOnly,
    selectedTeamUserId,
    users,
  ]);
 
 

  // ⭐⭐ Yeh line add karo ⭐⭐
  console.log("🔥 Selected Team User ID:", selectedTeamUserId);
  console.log("🔥 Filtered Leads:", filteredLeads);

  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, quarterFilter, viewMyLeadsOnly]);

  const achievedValue = useMemo(() => {
    const value = filteredLeads.reduce(
      (sum, [, lead]) => sum + (lead.totalCost || 0),
      0
    );
    console.log("🔥 Achieved Value (ClosedLeads):", value);
    return value;
  }, [filteredLeads]);

  const formatCurrency = (amt) =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt)
      : "-";

  const formatDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const handleTargetUpdate = async () => {
    await fetchTargets();
    // Update deficits for this user
    await updateDeficitsAndCarryForward(currentUser.uid, selectedFY);
    // Dobara fetch karo taaki latest deficit Firestore se aaye
    await fetchTargets();
  };
const handleExport = async () => {
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

    // Prepare data rows with proper formatting
    const rows = exportData.map(form => {
      const specializationText = form.courses
        ?.map(c => `${c.specialization}: ${c.students}`)
        .join(", ") || "-";

      const topicsText = form.topics
        ?.map(t => `${t.topic}: ${t.hours} hrs`)
        .join(", ") || "-";

      const paymentText = form.paymentDetails
        ?.map(p => `${p.name}: ₹${Number(p.totalAmount).toLocaleString('en-IN')}`)
        .join("\n") || "-";

      return {
        "College Name": form.collegeName || "-",
        "College Code": form.collegeCode || "-",
        "GST Number": form.gstNumber || "-",
        "Address": form.address || "-",
        "City": form.city || "-",
        "State": form.state || "-",
        "Pincode": form.pincode || "-",
        "TPO Name": form.tpoName || "-",
        "TPO Email": form.tpoEmail || "-",
        "TPO Phone": form.tpoPhone || "-",
        "Training Coordinator": form.trainingName || "-",
        "Training Email": form.trainingEmail || "-",
        "Training Phone": form.trainingPhone || "-",
        "Account Contact": form.accountName || "-",
        "Account Email": form.accountEmail || "-",
        "Account Phone": form.accountPhone || "-",
        "Course": form.course || "-",
        "Year": form.year || "-",
        "Delivery Mode": form.deliveryType || "-",
        "Passing Year": form.passingYear || "-",
        "Total Students": form.students || "-",
        "Total Hours": form.totalHours ? `${form.totalHours} hrs` : "-",
        "Specializations": specializationText,
        "Topics Covered": topicsText,
        "Payment Schedule": paymentText,
        "MOU URL": form.mouFileUrl || "-",
        "Contract Start": form.contractStartDate || "-",
        "Contract End": form.contractEndDate || "-",
        "EMI Months": form.emiMonths || "-",
        "Net Amount (₹)": form.netPayableAmount ? Number(form.netPayableAmount) : "-",
        "GST Amount (₹)": form.gstAmount ? Number(form.gstAmount) : "-",
        "Total Amount (₹)": form.netPayableAmount && form.gstAmount 
          ? Number(form.netPayableAmount) + Number(form.gstAmount) 
          : "-"
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // ===== STYLING ===== //
    // Define styles
    const headerStyle = {
      font: { 
        bold: true, 
        color: { rgb: "FFFFFF" },
        sz: 12
      },
      fill: { 
        fgColor: { rgb: "2F5597" } // Dark blue
      },
      alignment: { 
        horizontal: "center", 
        vertical: "center", 
        wrapText: true 
      },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const dataStyle = {
      font: { 
        sz: 11 
      },
      alignment: { 
        vertical: "top", 
        wrapText: true 
      },
      border: {
        top: { style: "thin", color: { rgb: "D9D9D9" } },
        bottom: { style: "thin", color: { rgb: "D9D9D9" } },
        left: { style: "thin", color: { rgb: "D9D9D9" } },
        right: { style: "thin", color: { rgb: "D9D9D9" } }
      }
    };

    const amountStyle = {
      ...dataStyle,
      numFmt: '"₹"#,##0.00'
    };

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
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
        
        if (headerText && headerText.includes("Amount")) {
          worksheet[cell].s = amountStyle;
        } else {
          worksheet[cell].s = dataStyle;
        }
      }
    }

    // Set column widths
    worksheet['!cols'] = [
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
      { wch: 15 }, // Total Hours
      { wch: 25 }, // Specializations
      { wch: 30 }, // Topics Covered
      { wch: 25 }, // Payment Schedule
      { wch: 40 }, // MOU URL
      { wch: 15 }, // Contract Start
      { wch: 15 }, // Contract End
      { wch: 12 }, // EMI Months
      { wch: 15 }, // Net Amount (₹)
      { wch: 15 }, // GST Amount (₹)
      { wch: 15 }  // Total Amount (₹)
    ];

    // Freeze header row
    worksheet['!freeze'] = { ySplit: 1 };

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Training Forms");

    // Generate timestamp for filename
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);

    // Export the workbook
    XLSX.writeFile(workbook, `Training_Forms_${timestamp}.xlsx`);

  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to generate export. Please try again.");
  }
};


  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-screen">
      <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterType === type
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "all" ? "All" : type === "new" ? "New" : "Renewals"}
              </button>
            ))}
          </div>

          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm"
          >
            <option value="current">Current Quarter</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="all">All Quarters</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-medium shadow hover:bg-green-700"
          >
            Export
          </button>
        </div>
      </div>

      <ClosedLeadsStats
        leads={leads}
        targets={targets}
        currentUser={currentUser}
        users={users}
        selectedFY={selectedFY}
        activeQuarter={selectedQuarter}
        formatCurrency={formatCurrency}
        viewMyLeadsOnly={viewMyLeadsOnly}
        achievedValue={achievedValue}
        handleTargetUpdate={handleTargetUpdate}
        selectedTeamUserId={selectedTeamUserId}
        setSelectedTeamUserId={setSelectedTeamUserId}
      />

      <ClosedLeadsProgressBar
        progressPercent={0}
        achievedValue={achievedValue}
        quarterTarget={0}
        formatCurrency={formatCurrency}
      />

      <ClosedLeadsTable
        leads={currentRows}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        viewMyLeadsOnly={viewMyLeadsOnly}
        onEditClosureForm={handleEditClosureForm}
      />

      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
          <div className="text-sm text-gray-500">
            Showing <strong>{startIdx + 1}</strong> to{" "}
            <strong>
              {Math.min(startIdx + rowsPerPage, filteredLeads.length)}
            </strong>{" "}
            of <strong>{filteredLeads.length}</strong> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                currentPage === 1
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiChevronLeft className="mr-1" /> Prev
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${
                currentPage === totalPages
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next <FiChevronRight className="ml-1" />
            </button>
          </div>
        </div>
      )}

      <TrainingForm
        show={showClosureForm}
        onClose={() => setShowClosureForm(false)}
        lead={selectedLead}
        existingFormData={selectedClosureForm}
        users={users}
      />
    </div>
  );
};

ClosedLeads.propTypes = {
  leads: PropTypes.object.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  currentUser: PropTypes.shape({ uid: PropTypes.string }),
  users: PropTypes.object.isRequired,
};

export default ClosedLeads;
