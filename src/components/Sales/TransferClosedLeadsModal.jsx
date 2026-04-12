import React, { useState, useEffect } from "react";
import { doc, writeBatch, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const TransferClosedLeadsModal = ({ show, onClose, users, leads }) => {
  const [step, setStep] = useState("pin"); // "pin" or "transfer"
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [closedLeadsCount, setClosedLeadsCount] = useState(0);

  const CORRECT_PIN = "5878";

  // Get sales and admin users
  const transferUsers = Object.values(users).filter(
    (user) =>
      user.department === "Sales" ||
      (Array.isArray(user.departments) && user.departments.includes("Sales")) ||
      user.department === "Admin" ||
      (Array.isArray(user.departments) && user.departments.includes("Admin"))
  );

  // Calculate closed leads count when selectedUser changes
  useEffect(() => {
    if (!selectedUser) {
      setClosedLeadsCount(0);
      return;
    }

    const userClosedLeads = Object.values(leads).filter(
      (lead) => lead.assignedTo?.uid === selectedUser && lead.phase === "closed"
    );

    setClosedLeadsCount(userClosedLeads.length);
  }, [selectedUser, leads]);

  const handlePinSubmit = async () => {
    setPinError("");

    if (!pin) {
      setPinError("Please enter the PIN");
      return;
    }

    if (pin !== CORRECT_PIN) {
      setPinError("❌ Incorrect PIN. Access denied.");
      setPin("");
      // Auto-close after showing error
      setTimeout(() => {
        setPin("");
        onClose();
      }, 2000);
      return;
    }

    setStep("transfer");
  };

  const handleTransfer = async () => {
    if (!selectedUser || !assignTo || selectedUser === assignTo) {
      alert("Please select valid source and destination users");
      return;
    }

    if (closedLeadsCount === 0) {
      alert("This user has no closed leads to transfer");
      return;
    }

    setLoading(true);
    try {
      const assignToUser = Object.values(users).find((u) => u.uid === assignTo);

      if (!assignToUser) {
        alert("Destination user not found");
        setLoading(false);
        return;
      }

      // Get closed leads assigned to the selected user
      const closedLeads = Object.entries(leads).filter(
        ([, lead]) => lead.assignedTo?.uid === selectedUser && lead.phase === "closed"
      );

      if (closedLeads.length === 0) {
        alert("No closed leads found to transfer");
        setLoading(false);
        return;
      }

      // Use batch for atomic updates
      const batchWrite = writeBatch(db);
      const leadsToUpdate = [];

      // Update all closed leads in batch
      closedLeads.forEach(([leadId, lead]) => {
        const leadRef = doc(db, "leads", leadId);
        batchWrite.update(leadRef, {
          "assignedTo.uid": assignTo,
          "assignedTo.name": assignToUser.name,
          "assignedTo.role": assignToUser.role,
          lastUpdatedAt: serverTimestamp(),
          lastModifiedBy: "system_admin_closed_transfer",
        });
        leadsToUpdate.push({
          id: leadId,
          businessName: lead.businessName,
          projectCode: lead.projectCode,
          totalCost: lead.totalCost,
        });
      });

      // Also update trainingForms if they exist
      for (const [, lead] of closedLeads) {
        if (lead.projectCode) {
          const docId = lead.projectCode.replace(/\//g, "-");
          const trainingFormRef = doc(db, "trainingForms", docId);

          try {
            // Check if document exists
            const trainingFormsSnapshot = await getDocs(
              query(
                collection(db, "trainingForms"),
                where("__name__", "==", docId)
              )
            );

            if (trainingFormsSnapshot.docs.length > 0) {
              batchWrite.update(trainingFormRef, {
                "createdBy.uid": assignTo,
                "createdBy.name": assignToUser.name,
                lastModifiedBy: assignTo,
                lastModifiedDate: serverTimestamp(),
              });
            }
          } catch (error) {
            console.error("Error updating trainingForm:", error);
            // Continue with other updates
          }
        }
      }

      // Commit all updates
      await batchWrite.commit();

      setSuccessMessage(
        `✅ Successfully transferred ${closedLeads.length} closed lead(s) from ${
          Object.values(users).find((u) => u.uid === selectedUser)?.name
        } to ${assignToUser.name}`
      );

      // Reset form
      setTimeout(() => {
        setSelectedUser("");
        setAssignTo("");
        setPin("");
        setStep("pin");
        setSuccessMessage("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error transferring closed leads:", error);
      alert("Error transferring leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-linear-to-r from-red-500 to-orange-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8m0 8l-6-4m6 4l6-4"
              />
            </svg>
            <h2 className="text-xl font-bold text-white">Transfer Closed Leads</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {/* PIN Step */}
          {step === "pin" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔐 Enter Security PIN
                </label>
                <input
                  type="password"
                  maxLength="4"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setPinError("");
                  }}
                  placeholder="••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                />
                {pinError && (
                  <p className="mt-2 text-sm text-red-600 font-medium">{pinError}</p>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                ⚠️ This action is restricted. Only authorized users can transfer closed leads.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePinSubmit}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  disabled={loading || pin.length !== 4}
                >
                  {loading ? "Verifying..." : "Verify PIN"}
                </button>
              </div>
            </div>
          )}

          {/* Transfer Step */}
          {step === "transfer" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👤 From (Deactivated/Source User)
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select user...</option>
                  {transferUsers.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.name} ({user.department}) - {Object.values(leads).filter(
                        (l) => l.assignedTo?.uid === user.uid && l.phase === "closed"
                      ).length} closed leads
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    📊 <strong>{closedLeadsCount}</strong> closed lead(s) will be transferred
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 To (New User)
                </label>
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select user...</option>
                  {transferUsers
                    .filter((u) => u.uid !== selectedUser)
                    .map((user) => (
                      <option key={user.uid} value={user.uid}>
                        {user.name} ({user.department})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  ⚠️ <strong>Warning:</strong> This will update all collections related to closed leads.
                  Make sure you select the correct destination user.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep("pin");
                    setPin("");
                    setPinError("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleTransfer}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  disabled={
                    loading ||
                    !selectedUser ||
                    !assignTo ||
                    selectedUser === assignTo ||
                    closedLeadsCount === 0
                  }
                >
                  {loading ? "Transferring..." : "Transfer Leads"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferClosedLeadsModal;
