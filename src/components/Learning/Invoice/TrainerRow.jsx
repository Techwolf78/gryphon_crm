import React, { useState, useEffect } from "react";
import {
  FiUser,
  FiCalendar,
  FiLayers,
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import { FaEye, FaRupeeSign } from "react-icons/fa";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

function TrainerRow({
  item,
  handleDownloadInvoice,
  handleEditInvoice,
  handleGenerateInvoice,
  downloadingInvoice,
  getDownloadStatus,
  formatDate,
}) {
  const [invoiceData, setInvoiceData] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current invoice data from Firebase
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!item.hasExistingInvoice) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "invoices"),
          where("trainerId", "==", item.trainerId),
          where("collegeName", "==", item.collegeName),
          where("phase", "==", item.phase)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const invoiceDoc = querySnapshot.docs[0];
          setInvoiceData({
            id: invoiceDoc.id,
            ...invoiceDoc.data(),
          });
        }
      }  finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [item]);

  // Update invoice status
  const updateInvoiceStatus = async () => {
    if (!invoiceData) return;

    setUpdatingStatus(true);
    try {
      // Update invoice field to true
      await updateDoc(doc(db, "invoices", invoiceData.id), {
        invoice: true,
      });

      // Refresh the invoice data
      const updatedDoc = await getDocs(
        query(
          collection(db, "invoices"),
          where("trainerId", "==", item.trainerId),
          where("collegeName", "==", item.collegeName),
          where("phase", "==", item.phase)
        )
      );

      if (!updatedDoc.empty) {
        const updatedData = updatedDoc.docs[0].data();
        setInvoiceData({
          id: updatedDoc.docs[0].id,
          ...updatedData,
        });
      }
      } catch {      alert("Failed to update invoice status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Determine UI status based on invoice data
  const getUiStatus = () => {
    if (!invoiceData) return "pending";

    if (invoiceData.payment === true) {
      return "done";
    } else if (invoiceData.invoice === true) {
      return "pending";
    } else {
      return "approve"; // This is when invoice needs approval
    }
  };

  const uiStatus = getUiStatus();

  const invoiceAvailable = item.latestEndDate
    ? Date.now() >=
      new Date(item.latestEndDate).getTime() + 24 * 60 * 60 * 1000
    : false;

  if (loading) {
    return (
      <tr>
        <td colSpan="5" className="px-2 sm:px-4 py-2 text-center">
          <FiRefreshCw className="animate-spin inline mr-2" />
          Loading invoice data...
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <FiUser className="text-blue-600 text-lg" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-semibold text-gray-900">
              {item.trainerName}
            </div>
            <div className="text-xs text-gray-600">ID: {item.trainerId}</div>
            <div className="inline-flex items-center mt-1">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                {item.phase}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900 max-w-xs truncate">
            {item.collegeName || item.businessName.split('/')[0].trim() || item.businessName}
          </div>
          <div className="text-xs text-gray-600">
            {item.allProjects.join(", ")}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium text-gray-800">{item.allDomains.join(", ")}</div>
      </td>

      <td className="px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FiCalendar className="text-blue-500 flex-shrink-0" />
            <span className="font-medium">
              {formatDate(item.earliestStartDate)} - {formatDate(item.latestEndDate)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <FaRupeeSign className="text-green-500 flex-shrink-0" />
            <span>
              {item.totalCollegeHours} hrs • {item.perHourCost ? `₹${item.perHourCost}/hr` : "Rate not set"}
            </span>
          </div>
          
          {item.allBatches.length > 1 && (
            <div className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <FiLayers className="mr-1" />
              {item.allBatches.length} batches
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-3">
          {item.hasExistingInvoice ? (
            <>
              {/* Enhanced Status Badge */}
              <div className="flex justify-center">
                <div
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${
                    uiStatus === "done"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : uiStatus === "pending"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {uiStatus === "done" && <FiCheckCircle className="mr-2" />}
                  {uiStatus === "approve"
                    ? "✋ Needs Approval"
                    : uiStatus === "pending"
                    ? "⏳ Pending Payment"
                    : "✅ Payment Complete"}
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadInvoice(item)}
                    disabled={
                      downloadingInvoice ===
                      `${item.trainerId}_${item.collegeName}_${item.phase}`
                    }
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <FiDownload className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  
                  <button
                    onClick={() => handleEditInvoice(item)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <FaEye className="w-4 h-4 mr-2" />
                    View
                  </button>
                </div>
                
                {uiStatus === "approve" && (
                  <button
                    onClick={updateInvoiceStatus}
                    disabled={updatingStatus}
                    className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    {updatingStatus ? (
                      <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                    ) : (
                      "✓ Approve Invoice"
                    )}
                  </button>
                )}
              </div>

              {/* Enhanced Remarks Section */}
              {invoiceData?.remarks && (
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-800 block mb-1">
                      💬 Remarks:
                    </span>
                    <p className="text-gray-700">{invoiceData.remarks.text}</p>
                    <span className="text-gray-500 text-xs mt-1 block">
                      Added on {new Date(invoiceData.remarks.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {getDownloadStatus(item)}
            </>
          ) : invoiceAvailable ? (
            <div className="flex justify-center">
              <button
                onClick={() => handleGenerateInvoice(item)}
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <FiFileText className="w-5 h-5 mr-2" />
                🚀 Generate Invoice
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs text-amber-700 flex items-center justify-center mb-2">
                  <FiClock className="mr-2" />
                  <span className="font-medium">Available on</span>
                </div>
                <div className="text-sm font-semibold text-amber-800">
                  {item.latestEndDate
                    ? formatDate(
                        new Date(
                          new Date(item.latestEndDate).getTime() +
                            24 * 60 * 60 * 1000
                        )
                      )
                    : "N/A"}
                </div>
              </div>
              <button
                disabled
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed border border-gray-200"
              >
                <FiFileText className="w-4 h-4 mr-2" />
                🔒 Generate Invoice
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default TrainerRow;
