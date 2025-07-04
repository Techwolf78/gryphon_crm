// TargetWithEdit.js
import React, { useState, useEffect } from "react";
import { FiEdit, FiCheck, FiX, FiLoader } from "react-icons/fi";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import PropTypes from "prop-types";

const TargetWithEdit = ({
  value,
  fy,
  quarter,
  currentUser,
  users,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const userObj = Object.values(users).find(u => u.uid === currentUser?.uid);
  const userRole = userObj?.role;
  const canEdit = ["Director", "Head"].includes(userRole);

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const handleSave = async () => {
    const numValue = Number(editValue.replace(/,/g, ""));
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const targetId = `${fy}_${quarter}`;
      await updateDoc(doc(db, "quarterly_targets", targetId), {
        target_amount: numValue,
        financial_year: fy,
        quarter: quarter,
      });
      
      onUpdate({
        id: targetId,
        financial_year: fy,
        quarter: quarter,
        target_amount: numValue,
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating target:", error);
      setError("Failed to update target. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amt) =>
    typeof amt === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt)
      : "-";

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setEditValue(value.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  if (!canEdit) {
    return <span>{formatCurrency(value)}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={editValue}
              onChange={handleInputChange}
              className="w-32 px-2 py-1 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={isUpdating}
              autoFocus
            />
            {error && (
              <p className="absolute -bottom-5 text-xs text-red-500">{error}</p>
            )}
          </div>
          {isUpdating ? (
            <FiLoader className="animate-spin text-gray-500" />
          ) : (
            <>
              <button
                onClick={handleSave}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Save"
              >
                <FiCheck size={16} />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Cancel"
              >
                <FiX size={16} />
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <span>{formatCurrency(value)}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-blue-600 ml-2 transition-colors"
            title="Edit target"
          >
            <FiEdit size={14} />
          </button>
        </>
      )}
    </div>
  );
};

TargetWithEdit.propTypes = {
  value: PropTypes.number.isRequired,
  fy: PropTypes.string.isRequired,
  quarter: PropTypes.string.isRequired,
  currentUser: PropTypes.shape({ uid: PropTypes.string }),
  users: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default TargetWithEdit;