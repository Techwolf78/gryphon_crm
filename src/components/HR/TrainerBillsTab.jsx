import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import StatsCards from "./StatsCards";
import FinancialSummary from "./FinancialSummary";
import FiltersSection from "./FiltersSection";
import BillsTable from "./BillsTable";
import ActionModal from "./ActionModal";
import TrainerDetailsModal from "./TrainerDetailsModal";
import LoadingState from "./LoadingState";
import { FiDownload, FiEye } from "react-icons/fi";
import { exportBillsToExcel } from "./exportUtils";

const TrainerBillsTab = ({ onBillsCountChange }) => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);

      // Only fetch bills that have been approved in GenerateTrainerInvoice (invoice: true)
      const q = query(collection(db, "invoices"), where("invoice", "==", true));
      const querySnapshot = await getDocs(q);

      const billsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Calculate net payment if it doesn't exist but GST data is available
        let calculatedNetPayment = data.netPayment;
        if (!calculatedNetPayment && data.gst && data.totalAmount) {
          // Calculate net payment for legacy bills that don't have netPayment saved
          const trainingFees = Math.round((data.totalHours || 0) * (data.trainingRate || 0));
          const conveyance = data.conveyance || 0;
          const food = data.food || 0;
          const lodging = data.lodging || 0;
          const subTotal = trainingFees + conveyance + food + lodging;
          const gstAmount = data.gst === "18" ? Math.round(trainingFees * 0.18) : 0;
          const taxableAmount = trainingFees + gstAmount;
          const tdsAmount = (taxableAmount * (data.tds || 0)) / 100;
          const otherExpenses = subTotal - trainingFees;
          const adhocAdjustment = data.adhocAdjustment || 0;
          calculatedNetPayment = taxableAmount - tdsAmount + otherExpenses + adhocAdjustment;
        }

        return {
          id: doc.id,
          trainerName: data.trainerName || "",
          trainerId: data.trainerId || "",
          collegeName: data.collegeName || "",
          phase: data.phase || "",
          domain: data.domain || "",
          totalAmount: data.totalAmount || 0,
          totalHours: data.totalHours || 0,
          trainingRate: data.trainingRate || 0,
          invoice: data.invoice || false,
          billNumber: data.billNumber || "",
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate?.() || new Date(),
          // Add these fields if they exist in your Firestore
          course: data.course || "",
          batch: data.batch || "",
          hours: data.hours || data.totalHours || 0,
          rate: data.rate || data.trainingRate || 0,
          submittedDate:
            data.submittedDate || data.createdAt?.toDate?.() || new Date(),
          amount: calculatedNetPayment || data.totalAmount || 0,
          trainerEmail: data.trainerEmail || "",
        };
      });

      setBills(billsData);
      setFilteredBills(billsData);
    } catch (error) {
      console.error("❌ Error fetching bills:", error);
      // Error fetching bills - handled silently
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats whenever bills change
  const totalBills = bills.length;
  const approvedBills = bills.filter(
    (bill) => bill.status === "approved"
  ).length;
  const pendingBills = bills.filter((bill) => bill.status === "generated" || bill.status === "pending").length;
  const rejectedBills = bills.filter(
    (bill) => bill.status === "rejected"
  ).length;

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const approvedAmount = bills
    .filter((bill) => bill.status === "approved")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const pendingAmount = bills
    .filter((bill) => bill.status === "generated" || bill.status === "pending")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const rejectedAmount = bills
    .filter((bill) => bill.status === "rejected")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Filter bills based on status and search term
  useEffect(() => {
    let result = bills;

    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        result = result.filter((bill) => bill.status === "generated" || bill.status === "pending");
      } else {
        result = result.filter((bill) => bill.status === statusFilter);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (bill) =>
          bill.trainerName.toLowerCase().includes(term) ||
          (bill.course && bill.course.toLowerCase().includes(term)) ||
          (bill.batch && bill.batch.toLowerCase().includes(term)) ||
          bill.collegeName.toLowerCase().includes(term)
      );
    }

    setFilteredBills(result);
  }, [statusFilter, searchTerm, bills]);

  // Fetch bills on component mount
  useEffect(() => {
    fetchBills();
  }, []);

  // Notify parent component about bills count changes
  useEffect(() => {
    if (onBillsCountChange) {
      onBillsCountChange(bills.length);
    }
  }, [bills.length, onBillsCountChange]);

  const handleExport = () => {
    try {
      if (filteredBills.length === 0) {
        alert("No bills to export. Please adjust your filters or wait for bills to load.");
        return;
      }

      // Generate filename with current date and filter info
      const currentDate = new Date().toISOString().split('T')[0];
      const statusSuffix = statusFilter !== 'all' ? `_${statusFilter}` : '';
      const searchSuffix = searchTerm ? '_filtered' : '';
      const filename = `trainer_bills_${currentDate}${statusSuffix}${searchSuffix}.xlsx`;

      // Export current filtered view
      exportBillsToExcel(filteredBills, filename);

      // Optional: Show success message (you can integrate with toast if available)
      console.log(`✅ Exported ${filteredBills.length} bills to ${filename}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert("Failed to export bills. Please try again.");
    }
  };

  const handleViewDetails = async (bill) => {
    if (!bill.trainerId) {
      alert("Trainer ID missing for this bill");
      return;
    }

    try {
      const trainerRef = doc(db, "trainers", bill.trainerId);
      const trainerSnap = await getDoc(trainerRef);

      let trainerData = {};
      if (trainerSnap.exists()) {
        trainerData = trainerSnap.data();
      }

      const trainer = {
        name: trainerData.name || bill.trainerName,
        trainerId: bill.trainerId,
        domain: bill.domain,
        charges: bill.trainingRate,
        paymentType: "per hour",
        contact: trainerData.contact || "",
        email: trainerData.email || "",
        specialization: (trainerData.specialization && trainerData.specialization.length > 0) ? trainerData.specialization : [bill.domain],
        otherSpecialization: trainerData.otherSpecialization || [],
        accountNumber: trainerData.accountNumber || "",
        bankName: trainerData.bankName || "",
        ifsc: trainerData.ifsc || "",
        nameAsPerBank: trainerData.nameAsPerBank || bill.trainerName,
        pan: trainerData.pan || "",
        aadhar: trainerData.aadhar || "",
        bankAddress: trainerData.bankAddress || "",
        createdAt: bill.createdAt,
      };

      setSelectedTrainer(trainer);
      setShowTrainerModal(true);
    } catch {
      // Error fetching trainer details - handled through alert
      alert("Failed to fetch trainer details.");
    }
  };

  const handleAction = (bill, action, remarks = "") => {
    if (action === "approved") {
      handleUpdateStatus(bill, action);
    } else if (action === "rejected") {
      handleUpdateStatus(bill, action, remarks);
    } else {
      setSelectedBill(bill);
      setShowActionModal(true);
    }
  };

  const handleUpdateStatus = async (bill, status, remarks = "") => {
    if (!bill) {
      console.error("No bill provided for status update");
      return;
    }

    console.log("Updating bill status:", bill.id, "to", status, "with remarks:", remarks);

    try {
      const billRef = doc(db, "invoices", bill.id);
      const updatePayload = {
        status: status,
        ...(status === "approved" && {
          approvedDate: new Date().toISOString().split("T")[0],
          approvedBy: "Current User",
          payment: true,
        }),
        ...(status === "rejected" && {
          rejectedDate: new Date().toISOString().split("T")[0],
          rejectedBy: "Current User",
          rejectionRemarks: remarks,
        }),
      };

      console.log("Update payload:", updatePayload);
      await updateDoc(billRef, updatePayload);
      console.log("Firestore update successful");

      // Update local state
      const updatedBills = bills.map((b) =>
        b.id === bill.id ? { ...b, ...updatePayload } : b
      );

      console.log("Updated bills array length:", updatedBills.length);
      setBills(updatedBills);
      setShowActionModal(false);
      setSelectedBill(null);
      console.log("Status update completed successfully");
    } catch (error) {
      console.error("Error updating bill status:", error);
      alert("Failed to update bill status. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading bills data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
      {/* Unified Professional Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="mx-auto px-3 py-3">
          {/* Top Row: Title, Metrics, Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-3">
            {/* Title and Description */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bills Management</h1>
                <p className="text-sm text-slate-600">Review and approve trainer bills</p>
              </div>
            </div>

            {/* Action Buttons and Metrics */}
            <div className="flex items-center gap-3">
              {/* Key Metrics */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-600">Total Bills:</span>
                  <span className="text-xs font-medium text-slate-700">{bills.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-slate-600">Total Payable:</span>
                  <span className="text-xs font-medium text-slate-700">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Updated {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Search and Filters */}
          <div className="border-t border-slate-100 pt-3">
            <FiltersSection
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onRefresh={fetchBills}
              isLoading={loading}
              onExport={handleExport}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-1">
        {/* Statistics Overview */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Live Data
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-4">
            <StatsCards
              totalBills={totalBills}
              approvedBills={approvedBills}
              pendingBills={pendingBills}
              rejectedBills={rejectedBills}
            />
          </div>

          {/* Financial Summary */}
          <div>
            <FinancialSummary
              totalAmount={totalAmount}
              approvedAmount={approvedAmount}
              pendingAmount={pendingAmount}
              rejectedAmount={rejectedAmount}
            />
          </div>
        </div>

        {/* Bills Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/60">
            <h3 className="text-lg font-semibold text-slate-900">Recent Bills</h3>
            <p className="text-sm text-slate-600">Manage and track all trainer bill submissions</p>
          </div>

          <div className="p-4">
            {loading ? (
              <LoadingState />
            ) : (
              <BillsTable
                bills={filteredBills}
                onViewDetails={handleViewDetails}
                onAction={handleAction}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {selectedBill && (
        <ActionModal
          bill={selectedBill}
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Trainer Details Modal */}
      {selectedTrainer && (
        <TrainerDetailsModal
          trainer={selectedTrainer}
          isOpen={showTrainerModal}
          onClose={() => setShowTrainerModal(false)}
        />
      )}
    </div>
  );
};

export default TrainerBillsTab;