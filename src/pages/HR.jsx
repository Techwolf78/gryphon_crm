import React, { useState, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  getDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import StatsCards from "../components/HR/StatsCards";
import FinancialSummary from "../components/HR/FinancialSummary";
import FiltersSection from "../components/HR/FiltersSection";
import BillsTable from "../components/HR/BillsTable";
import ActionModal from "../components/HR/ActionModal";
import TrainerDetailsModal from "../components/HR/TrainerDetailsModal";
import LoadingState from "../components/HR/LoadingState";
import HRBillsTour from "../components/tours/HRBillsTour";
import { useAuth } from "../context/AuthContext";
const HR = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);

  const { user } = useAuth();

  const fetchBills = async () => {
    try {
      setLoading(true);

      const q = query(collection(db, "invoices"), where("invoice", "==", true));

      const querySnapshot = await getDocs(q);

      const billsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("📄 Firestore Bill Data:", doc.id, data);

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
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate?.() || new Date(),
          // Add these fields if they exist in your Firestore
          course: data.course || "",
          batch: data.batch || "",
          hours: data.hours || data.totalHours || 0,
          rate: data.rate || data.trainingRate || 0,
          submittedDate:
            data.submittedDate || data.createdAt?.toDate?.() || new Date(),
          amount: data.totalAmount || 0,
          trainerEmail: data.trainerEmail || "",
        };
      });

      console.log("✅ Final Bills Array:", billsData);
      setBills(billsData);
      setFilteredBills(billsData);
    } catch (error) {
      console.error("❌ Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats whenever bills change
  const totalBills = bills.length;
  const approvedBills = bills.filter(
    (bill) => bill.status === "approved"
  ).length;
  const pendingBills = bills.filter((bill) => bill.status === "pending").length;
  const rejectedBills = bills.filter(
    (bill) => bill.status === "rejected"
  ).length;

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const approvedAmount = bills
    .filter((bill) => bill.status === "approved")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const pendingAmount = bills
    .filter((bill) => bill.status === "pending")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const rejectedAmount = bills
    .filter((bill) => bill.status === "rejected")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Filter bills based on status and search term
  useEffect(() => {
    let result = bills;

    if (statusFilter !== "all") {
      result = result.filter((bill) => bill.status === statusFilter);
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
        specialization: trainerData.specialization || [bill.domain],
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
    } catch (error) {
      console.error("Error fetching trainer details:", error);
      alert("Failed to fetch trainer details.");
    }
  };

  const handleAction = (bill, action, remarks = "") => {
    setSelectedBill(bill);
    if (action === "approved") {
      handleUpdateStatus(action);
    } else if (action === "rejected") {
      handleUpdateStatus(action, remarks);
    } else {
      setShowActionModal(true);
    }
  };

  const handleUpdateStatus = async (status, remarks = "") => {
    if (!selectedBill) return;

    try {
      const billRef = doc(db, "invoices", selectedBill.id);
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

      await updateDoc(billRef, updatePayload);

      // Update local state
      const updatedBills = bills.map((bill) =>
        bill.id === selectedBill.id ? { ...bill, ...updatePayload } : bill
      );

      setBills(updatedBills);
      setShowActionModal(false);
      setSelectedBill(null);
    } catch (error) {
      console.error("Error updating bill status:", error);
      alert("Failed to update bill status. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading bills data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <HRBillsTour userId={user?.uid} />
      {/* Header */}
      <div className=" " data-tour="hr-header">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Trainer Bill Approvals
        </h1>
        <p className="text-gray-600 mt-1">
          Approve, reject or hold trainer bills with remarks
        </p>
      </div>

      {/* Stats Cards */}
      <div data-tour="stats-cards">
        <StatsCards
          totalBills={totalBills}
          approvedBills={approvedBills}
          pendingBills={pendingBills}
          rejectedBills={rejectedBills}
        />
      </div>

      {/* Financial Summary */}
      <div data-tour="financial-summary">
        <FinancialSummary
          totalAmount={totalAmount}
          approvedAmount={approvedAmount}
          pendingAmount={pendingAmount}
          rejectedAmount={rejectedAmount}
        />
      </div>

      {/* Filters and Search */}
      <div data-tour="filters-section">
        <FiltersSection
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={fetchBills}
          isLoading={loading}
        />
      </div>

      {/* Bills Table */}
      {loading ? (
        <LoadingState />
      ) : (
        <BillsTable
          bills={filteredBills}
          onViewDetails={handleViewDetails}
          onAction={handleAction}
        />
      )}

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

export default HR;
