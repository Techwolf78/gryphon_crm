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

  // Fetch subordinate targets when component mounts or when FY changes
  useEffect(() => {
    const fetchSubordinateTargets = async () => {
      if (currentRole === "Manager" && subordinates.length > 0) {
        const targets = await Promise.all(
          subordinates.map(async (sub) => {
            const q1 = await getDoc(doc(db, "quarterly_targets", `${fy}_Q1_${sub.uid}`));
            const q2 = await getDoc(doc(db, "quarterly_targets", `${fy}_Q2_${sub.uid}`));
            const q3 = await getDoc(doc(db, "quarterly_targets", `${fy}_Q3_${sub.uid}`));
            const q4 = await getDoc(doc(db, "quarterly_targets", `${fy}_Q4_${sub.uid}`));
            
            const total = [q1, q2, q3, q4].reduce(
              (sum, doc) => sum + (doc.exists() ? doc.data().target_amount || 0 : 0),
              0
            );
            
            return {
              name: sub.name,
              role: sub.role,
              totalTarget: total,
              uid: sub.uid
            };
          })
        );
        setSubordinateTargets(targets);
      }
    };
    
    fetchSubordinateTargets();
  }, [fy, currentRole, subordinates]);

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

      // Subordinate targets update
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

      // Manager target minus logic
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

          // Fetch manager doc
          const managerDocSnap = await getDoc(managerDocRef);
          const managerData = managerDocSnap.exists() ? managerDocSnap.data() : {};
          const currentManagerTarget = managerData.target_amount || 0;

          // Minus
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Manager's Target Section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <FiUser className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{targetUserObj.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{targetUserObj.role}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Annual Target</p>
          <p className="font-bold text-blue-600">{formatCurrency(value)}</p>
        </div>
      </div>

      {/* Edit Section */}
      {isEditing ? (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Set New Annual Target
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isUpdating}
                  autoFocus
                />
                {error && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              {isUpdating ? (
                <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg flex items-center">
                  <FiLoader className="animate-spin mr-2" />
                  Updating...
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setEditValue(value?.toString() || "");
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center"
          >
            <FiEdit className="mr-1" size={14} />
            Edit Target
          </button>
        </div>
      )}

      {/* Subordinates Section - Only for Managers */}
      {currentRole === "Manager" && subordinates.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowSubordinates(!showSubordinates)}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 mb-2"
          >
            {showSubordinates ? (
              <FiChevronUp className="mr-1" />
            ) : (
              <FiChevronDown className="mr-1" />
            )}
            {subordinates.length} Team Members
          </button>

          {showSubordinates && (
            <div className="space-y-3 mt-2">
              {subordinateTargets.map((sub) => (
                <div key={sub.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                      <FiUser className="text-purple-600" size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-800">{sub.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">{sub.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Assigned Target</p>
                    <p className="text-sm font-medium text-purple-600">
                      {formatCurrency(sub.totalTarget)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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