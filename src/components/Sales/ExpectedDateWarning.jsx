// components/ExpectedDateModal.jsx
import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Update the path as per your project structure

const ExpectedDateModal = ({
    show,
    onClose,
    expectedDate,
    setExpectedDate,
    leadBeingUpdated,
    pendingPhaseChange,
}) => {
    if (!show) return null;

    const handleConfirm = async () => {
        if (!expectedDate || !leadBeingUpdated || !pendingPhaseChange) return;

        await updateDoc(doc(db, "leads", leadBeingUpdated.id), {
            phase: pendingPhaseChange,
            expectedClosureDate: new Date(expectedDate).getTime(),
        });

        onClose();
    };
    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-lg font-semibold mb-4">Set Expected Closure Date</h2>
                <input
                    type="date"
                    className="border w-full p-2 rounded mb-4"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpectedDateModal;
