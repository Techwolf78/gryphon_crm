import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const LeadTransferModal = ({ show, onClose, users, leads }) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ hot: 0, warm: 0, cold: 0, closed: 0 });

  // Get sales users
  const salesUsers = Object.values(users).filter(
    (user) => user.department === "Sales" || (Array.isArray(user.departments) && user.departments.includes("Sales"))
  );

  // Calculate counts when selectedUser changes
  useEffect(() => {
    if (!selectedUser) {
      setCounts({ hot: 0, warm: 0, cold: 0, closed: 0 });
      return;
    }

    const userLeads = Object.values(leads).filter(
      (lead) => lead.assignedTo?.uid === selectedUser
    );

    const newCounts = { hot: 0, warm: 0, cold: 0, closed: 0 };
    userLeads.forEach((lead) => {
      const phase = lead.phase || "hot";
      newCounts[phase]++;
    });

    setCounts(newCounts);
  }, [selectedUser, leads]);

  const handleTransfer = async () => {
    if (!selectedUser || !assignTo || selectedUser === assignTo) {
      alert("Please select valid users");
      return;
    }

    setLoading(true);
    try {
      const assignToUser = Object.values(users).find((u) => u.uid === assignTo);

      // Get leads assigned to the selected user from the leads prop (exclude closed leads)
      const userLeads = Object.values(leads).filter(
        (lead) => lead.assignedTo?.uid === selectedUser && lead.phase !== "closed"
      );

      // Update each lead
      const updatePromises = userLeads.map((lead) =>
        updateDoc(doc(db, "leads", lead.id), {
          assignedTo: {
            uid: assignToUser.uid,
            name: assignToUser.name,
            email: assignToUser.email,
          },
        })
      );

      await Promise.all(updatePromises);

      alert("Open leads transferred successfully!");
      onClose();
      setSelectedUser("");
      setAssignTo("");
    } catch (error) {
      console.error("Error transferring leads:", error);
      alert("Error transferring leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Transfer Leads</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Sales Person Leaving
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select User</option>
            {salesUsers.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Lead Counts:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-red-50 p-2 rounded">
                Hot: {counts.hot}
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                Warm: {counts.warm}
              </div>
              <div className="bg-blue-50 p-2 rounded">
                Cold: {counts.cold}
              </div>
              <div className="bg-green-50 p-2 rounded">
                Closed: {counts.closed} (not transferred)
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Assign To
          </label>
          <select
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select User</option>
            {salesUsers
              .filter((user) => user.uid !== selectedUser)
              .map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading || !selectedUser || !assignTo}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Transferring..." : "Transfer Leads"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadTransferModal;