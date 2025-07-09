import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import ClosedLeadsProgressBar from "./ClosedLeadsProgressBar";
import ClosedLeadsTable from "./ClosedLeadsTable";
import ClosedLeadsStats from "./ClosedLeadsStats";
import { doc, getDoc, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx-js-style";


const ClosedLeads = ({ leads, viewMyLeadsOnly, currentUser, users }) => {
  const [filterType, setFilterType] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("current");
  const [targets, setTargets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchTargets = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "quarterly_targets"));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
  const selectedQuarter = quarterFilter === "current" ? currentQuarter : quarterFilter;
  const selectedFY = getFinancialYear(today);

  const currentUserObj = Object.values(users).find(u => u.uid === currentUser?.uid);
  const currentRole = currentUserObj?.role;

  const isUserInTeam = (uid) => {
    if (!uid) return false;

    if (currentRole === "Head") {
      const user = Object.values(users).find(u => u.uid === uid);
      if (!user) return false;

      // Head can see all managers and all their subordinates
      if (user.role === "Manager") return true;
      if (["Assistant Manager", "Executive"].includes(user.role) && user.reportingManager) {
        // Check if this subordinate's manager is among managers (head team)
        return Object.values(users).some(
          mgr => mgr.role === "Manager" && mgr.name === user.reportingManager
        );
      }
    }

    if (currentRole === "Manager") {
      const user = Object.values(users).find(u => u.uid === uid);
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
          // ✅ My Leads tab
          return lead.assignedTo?.uid === currentUser.uid;
        } else {
          // ✅ My Team tab
          if (currentRole === "Head") {
            // Head ke liye: sirf team members ki leads, khud ki nahi
            return isUserInTeam(lead.assignedTo?.uid);
          } else if (currentRole === "Manager") {
            // Manager ke liye: team members + khud ki leads
            return (
              isUserInTeam(lead.assignedTo?.uid) ||
              lead.assignedTo?.uid === currentUser.uid
            );
          } else {
            // Baaki koi role: default same as manager
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
        if (selectedQuarter === "all") return true;
        const closedQuarter = getQuarter(new Date(lead.closedDate));
        return closedQuarter === selectedQuarter;
      })
      .sort(([, a], [, b]) => new Date(b.closedDate) - new Date(a.closedDate));
  }, [leads, currentUser, currentRole, filterType, selectedQuarter, viewMyLeadsOnly, users]);



  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredLeads.slice(startIdx, startIdx + rowsPerPage);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, quarterFilter, viewMyLeadsOnly]);

  const achievedValue = useMemo(() => {
    const value = filteredLeads.reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0);
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
  const handleReupload = async (file, type, projectCode) => {
  if (!file || !projectCode) {
    console.error("❌ File or Project Code missing");
    return;
  }

  const safeProjectCode = projectCode.replaceAll("/", "-");
  const studentsRef = collection(db, "trainingForms", safeProjectCode, "students");

  try {
    if (type === "student") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const students = XLSX.utils.sheet_to_json(sheet);

      console.log("📋 Parsed Students:", students);

      if (!students.length) {
        console.warn("⚠️ Excel file is empty.");
        return;
      }

      // 🔴 Delete existing student docs
      const oldDocs = await getDocs(studentsRef);
      const deleteBatch = writeBatch(db);
      oldDocs.forEach((docSnap) => deleteBatch.delete(docSnap.ref));
      await deleteBatch.commit();
      console.log("🧹 Old student data deleted.");

      // ✅ Upload new student data with same key structure
      const uploadBatch = writeBatch(db);
      students.forEach((student) => {
        const id = student.Email?.toLowerCase().replace(/[^\w]/g, "") || Date.now().toString();
        const studentRef = doc(studentsRef, id);
        uploadBatch.set(studentRef, student, { merge: false });
      });
      await uploadBatch.commit();

      console.log("✅ Students replaced successfully.");
    }
  } catch (err) {
    console.error("❌ Upload Error:", err.message || err);
  }
};

  const uploadFileToCloudinary = async (file, folder) => {
    const cloudName = "gryphon"; // ✅ Make sure this matches your Cloudinary Cloud name
    const uploadPreset = "lead_upload_preset"; // ✅ Ensure this is unsigned & configured correctly

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    return data.secure_url;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {["all", "new", "renewal"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterType === type
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
            onChange={e => setQuarterFilter(e.target.value)}
            className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm"
          >
            <option value="current">Current Quarter</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="all">All Quarters</option>
          </select>
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
        onReupload={handleReupload}
      />




      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t gap-4">
          <div className="text-sm text-gray-500">
            Showing <strong>{startIdx + 1}</strong> to{" "}
            <strong>{Math.min(startIdx + rowsPerPage, filteredLeads.length)}</strong> of{" "}
            <strong>{filteredLeads.length}</strong> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${currentPage === 1 ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
            >
              <FiChevronLeft className="mr-1" /> Prev
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm flex items-center ${currentPage === totalPages ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
            >
              Next <FiChevronRight className="ml-1" />
            </button>
          </div>
        </div>
      )}
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