// FILE: /components/budget/csdd/ViewRequests.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import exportVoucherToPDF from "./utils/exportVoucherToPDF.js";
import exportReimbursementPDF from "./utils/exportReimbursementPDF.js";

export default function ViewRequests({
  department,
  fiscalYear,
  currentUser,
  currentBudget,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const csddCollection = collection(db, "csdd_expenses");

  useEffect(() => {
    const q = query(
      csddCollection,
      where("department", "==", department),
      where("fiscalYear", "==", fiscalYear)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));

      const sorted = docs.sort((a, b) => {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;

        const da = a.createdAt?.seconds || 0;
        const db = b.createdAt?.seconds || 0;
        return db - da;
      });

      setRequests(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, [department, fiscalYear]);

  // Format date
  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      if (d.seconds)
        return new Date(d.seconds * 1000).toLocaleDateString("en-IN");
      return new Date(d).toLocaleDateString("en-IN");
    } catch {
      return "N/A";
    }
  };

  // Approve
  const handleApprove = async (request) => {
    if (actionLoading) return;
    setActionLoading(request.id);

    try {
      const ref = doc(db, "csdd_expenses", request.id);
      await updateDoc(ref, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: currentUser?.uid,
      });

      // Budget update
      if (
        currentBudget?.id &&
        request.csddComponent &&
        request.totalAmount > 0
      ) {
        const budgetRef = doc(db, "department_budgets", currentBudget.id);

        await updateDoc(budgetRef, {
          [`csddExpenses.${request.csddComponent}.spent`]: increment(
            request.totalAmount
          ),
          "summary.totalSpent": increment(request.totalAmount),
          lastUpdatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid,
        });
      }

      setActionLoading(null);
    } catch (err) {
      console.error(err);
      setActionLoading(null);
      alert("Approval failed");
    }
  };

  // Reject
  const handleReject = async (request) => {
    if (!confirm("Reject this request?")) return;
    setActionLoading(request.id);

    try {
      const ref = doc(db, "csdd_expenses", request.id);
      await updateDoc(ref, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser?.uid,
      });

      setActionLoading(null);
    } catch (err) {
      console.error(err);
      setActionLoading(null);
      alert("Rejection failed");
    }
  };

  // Status tag style
  const badge = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // Add these helper functions at the top of your component
  const getStatusDot = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500";
      case "rejected":
        return "bg-rose-500";
      case "submitted":
        return "bg-blue-500";
      case "paid":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  // Enhanced InfoItem component with icon support
  const InfoItem = ({ label, value, icon }) => (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-semibold">{value}</p>
      </div>
    </div>
  );

  const typeBadge = (type) => {
    return type === "voucher"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-purple-50 text-purple-700 border-purple-200";
  };

  if (loading)
    return (
      <div className="py-12 flex justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Loading requests...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* No data */}
      {requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            No CSDD expense requests have been submitted for the current fiscal
            year.
          </p>
        </div>
      )}

      {/* Request List */}
      <div className="grid gap-4">
        {requests.map((req, index) => (
          <div
            key={req.id}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:border-gray-200 group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left Content */}
              <div className="flex-1 space-y-4">
                {/* Header with status and type */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getStatusDot(
                        req.status
                      )}`}
                    />
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${typeBadge(
                        req.type
                      )}`}
                    >
                      {req.type === "voucher"
                        ? "Expense Voucher"
                        : "Reimbursement"}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${badge(
                      req.status
                    )}`}
                  >
                    {req.status}
                  </span>
                  {req.csddComponent && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                      {req.csddComponent.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Employee and metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoItem
                    label="Employee"
                    value={req.name || "N/A"}
                    icon={
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    }
                  />
                  <InfoItem
                    label="Department"
                    value={req.department || "N/A"}
                    icon={
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    }
                  />
                  <InfoItem
                    label="Submitted"
                    value={formatDate(req.createdAt)}
                    icon={
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  />
                  <InfoItem
                    label="Reference"
                    value={req.employeeId || "N/A"}
                    icon={
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                        />
                      </svg>
                    }
                  />
                </div>

                {/* Purpose with expandable functionality */}
                {req.purpose && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Purpose
                    </p>
                    <p className="text-gray-800 line-clamp-2 group-hover:line-clamp-none transition-all duration-200">
                      {req.purpose}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowDetailsModal(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      Read more
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Content - Actions and Amount */}
              <div className="flex flex-col items-start lg:items-end gap-4 min-w-[200px]">
                {/* Amount Display */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    ₹{(req.totalAmount || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center justify-end gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    Total Amount
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 lg:flex-none px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 justify-center group/btn"
                  >
                    <svg
                      className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Details
                  </button>

                  {req.status === "submitted" && (
                    <div className="flex gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => handleReject(req)}
                        disabled={actionLoading === req.id}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 justify-center group/btn"
                      >
                        {actionLoading === req.id ? (
                          <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        Reject
                      </button>

                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading === req.id}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 border border-emerald-600 rounded-xl hover:bg-emerald-700 hover:border-emerald-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 justify-center group/btn shadow-xs hover:shadow-sm"
                      >
                        {actionLoading === req.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-1000 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl  overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-gray-900 to-gray-800 p-6">
              <div className="flex justify-between items-start">
                <div className="text-white">
                  <h2 className="text-2xl font-bold">Request Details</h2>
                  <p className="text-gray-300 mt-1">
                    Complete information for this {selectedRequest.type}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors duration-200"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Basic Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailCard label="Request Type" value={selectedRequest.type} />
                <DetailCard label="Status" value={selectedRequest.status} />
                <DetailCard label="Employee" value={selectedRequest.name} />
                <DetailCard
                  label="Employee ID"
                  value={selectedRequest.employeeId}
                />
                <DetailCard
                  label="CSDD Component"
                  value={selectedRequest.csddComponent}
                />
                <DetailCard
                  label="Amount"
                  value={`₹${selectedRequest.totalAmount?.toLocaleString(
                    "en-IN"
                  )}`}
                  highlight
                />
                <DetailCard
                  label="Date Submitted"
                  value={formatDate(selectedRequest.createdAt)}
                />
                <DetailCard
                  label="Department"
                  value={selectedRequest.department}
                />
                <DetailCard
                  label="Fiscal Year"
                  value={selectedRequest.fiscalYear}
                />
              </div>

              {/* Purpose and Location */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedRequest.visitPurpose && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Visit Purpose
                    </h4>
                    <p className="text-gray-900">
                      {selectedRequest.visitPurpose}
                    </p>
                  </div>
                )}
                {selectedRequest.location && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Location
                    </h4>
                    <p className="text-gray-900">{selectedRequest.location}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedRequest.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-900">{selectedRequest.description}</p>
                </div>
              )}

              {/* Voucher Breakdown */}
              {selectedRequest.type === "voucher" &&
                selectedRequest.breakdown && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Voucher Breakdown
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                              Category
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(selectedRequest.breakdown).map(
                            ([key, value]) => (
                              <tr
                                key={key}
                                className="hover:bg-gray-50 transition-colors duration-150"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                  {key}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                                  ₹{value.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Reimbursement Rows */}
              {selectedRequest.type === "reimbursement" &&
                selectedRequest.rows && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Expense Details
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                Description
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                Destination
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                Mode
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                                Distance
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedRequest.rows.map((row, index) => (
                              <tr
                                key={index}
                                className="hover:bg-gray-50 transition-colors duration-150"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {formatDate(row.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {row.description}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {row.travelledTo}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                  {row.travelMode}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {row.distanceKm || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                                  ₹{row.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end items-center">
                {/* EXPORT PDF BUTTON (Voucher or Reimbursement) */}
                {(selectedRequest.type === "voucher" ||
                  selectedRequest.type === "reimbursement") && (
                  <button
                    onClick={() =>
                      selectedRequest.type === "voucher"
                        ? exportVoucherToPDF(selectedRequest, currentBudget)
                        : exportReimbursementPDF(selectedRequest, currentBudget)
                    }
                    className="px-6 py-2.5 text-white bg-blue-600 border border-blue-600 rounded-xl hover:bg-blue-700 transition duration-200 font-medium flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Export PDF
                  </button>
                )}

                {/* RIGHT SIDE BUTTONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-gray-900 font-medium">{value || "N/A"}</p>
    </div>
  );
}

function DetailCard({ label, value, highlight = false }) {
  return (
    <div
      className={`bg-gray-50 rounded-xl p-4  ${
        highlight ? "border-2 border-amber-200 bg-amber-50" : ""
      }`}
    >
      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`font-medium ${
          highlight ? "text-amber-700 text-lg" : "text-gray-900"
        }`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}
