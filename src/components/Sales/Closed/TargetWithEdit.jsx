import React, { useState, useEffect } from "react";
import { FiEdit, FiCheck, FiX, FiLoader, FiChevronDown, FiChevronUp, FiUser } from "react-icons/fi";
import { setDoc, getDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import PropTypes from "prop-types";

const TargetWithEdit = ({
  value,
  fy,
  currentUser,
  targetUser,
  users,
  onUpdate,
  viewMyLeadsOnly,
}) => {
  const formatCurrency = (amt) =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt)
      : "-";

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [showSubordinates, setShowSubordinates] = useState(false);
  const [subordinateTargets, setSubordinateTargets] = useState([]);

  useEffect(() => {
    setEditValue(value?.toString() || "");
  }, [value]);

  const currentUserObj = Object.values(users).find((u) => u.uid === currentUser?.uid);
  const targetUserObj = targetUser || currentUserObj;
  const currentRole = currentUserObj?.role;
  const targetRole = targetUserObj?.role;

  // Get subordinates for current manager
  const subordinates = Object.values(users).filter(
    (u) => u.reportingManager === currentUserObj?.name && ["Assistant Manager", "Executive"].includes(u.role)
  );

  // Check edit permissions
  let canEdit = false;
  if (viewMyLeadsOnly) {
    canEdit = currentUser?.uid === targetUserObj?.uid && currentRole === "Head";
  } else {
    if (currentRole === "Head" && targetRole === "Manager") {
      canEdit = true;
    } else if (currentRole === "Manager" && ["Assistant Manager", "Executive"].includes(targetRole)) {
      canEdit = true;
    }
  }

  if (!canEdit || !targetUserObj) {
    return <span className="text-gray-700 font-medium">{formatCurrency(value)}</span>;
  }

  const handleSave = async () => {
    const numValue = Number(editValue.replace(/,/g, ""));
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const quarters = ["Q1", "Q2", "Q3", "Q4"];

      // Check Manager's total target if assigning to subordinate
      if (
        currentRole === "Manager" &&
        ["Assistant Manager", "Executive"].includes(targetRole)
      ) {
        const managerUid = currentUserObj.uid;
        let managerTotalTarget = 0;

        for (const q of quarters) {
          const managerTargetId = `${fy}_${q}_${managerUid}`;
          const managerDocRef = doc(db, "quarterly_targets", managerTargetId);
          const managerDocSnap = await getDoc(managerDocRef);

          if (managerDocSnap.exists()) {
            const data = managerDocSnap.data();
            managerTotalTarget += data.target_amount || 0;
          }
        }

        if (numValue > managerTotalTarget) {
          setError("Cannot assign more than your total target");
          setIsUpdating(false);
          return;
        }
      }

      // Split target into quarters
      const perQuarter = Math.floor(numValue / 4);
      let remaining = numValue - perQuarter * 4;

      for (let i = 0; i < quarters.length; i++) {
        let adjustedTarget = perQuarter;
        if (remaining > 0) {
          adjustedTarget += 1;
          remaining -= 1;
        }

        const targetId = `${fy}_${quarters[i]}_${targetUserObj.uid}`;
        await setDoc(
          doc(db, "quarterly_targets", targetId),
          {
            target_amount: adjustedTarget,
            financial_year: fy,
            quarter: quarters[i],
            assignedTo: targetUserObj.uid,
          },
          { merge: true }
        );
      }

      // Manager target reduction for all quarters
      if (
        currentRole === "Manager" &&
        ["Assistant Manager", "Executive"].includes(targetRole)
      ) {
        const managerUid = currentUserObj.uid;
        const managerPerQuarterReduction = Math.floor(numValue / 4);
        let mgrRemaining = numValue - managerPerQuarterReduction * 4;

        for (let i = 0; i < quarters.length; i++) {
          let reduction = managerPerQuarterReduction;
          if (mgrRemaining > 0) {
            reduction += 1;
            mgrRemaining -= 1;
          }

          const managerTargetId = `${fy}_${quarters[i]}_${managerUid}`;
          const managerDocRef = doc(db, "quarterly_targets", managerTargetId);
          const managerDocSnap = await getDoc(managerDocRef);
          const managerData = managerDocSnap.exists() ? managerDocSnap.data() : {};
          const currentManagerTarget = managerData.target_amount || 0;
          const newManagerTarget = Math.max(currentManagerTarget - reduction, 0);

          await setDoc(
            managerDocRef,
            {
              target_amount: newManagerTarget,
              financial_year: fy,
              quarter: quarters[i],
              assignedTo: managerUid,
            },
            { merge: true }
          );
        }
      }

      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating target:", err);
      setError("Failed to update target. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setEditValue(val.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setIsEditing(false);
      setError(null);
      setEditValue(value?.toString() || "");
    }
  };

  return (
    <div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="px-3 py-1 border rounded focus:outline-none focus:ring"
            disabled={isUpdating}
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            {isUpdating ? (
              <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded flex items-center">
                <FiLoader className="animate-spin mr-1" /> Updating...
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                    setEditValue(value?.toString() || "");
                  }}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-1 bg-blue-50 text-blue-600 rounded"
        >
          <FiEdit className="inline-block mr-1" size={14} />
          Edit
        </button>
      )}
    </div>
  );
};

TargetWithEdit.propTypes = {
  value: PropTypes.number.isRequired,
  fy: PropTypes.string.isRequired,
  currentUser: PropTypes.object.isRequired,
  targetUser: PropTypes.object,
  users: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
};

export default TargetWithEdit;
