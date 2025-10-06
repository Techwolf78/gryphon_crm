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
    } catch (error) {

      alert("Failed to update invoice status. Please try again.");
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
      <td className="px-2 sm:px-4 py-2">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {item.trainerName}
            </div>
            <div className="text-sm text-gray-500">ID: {item.trainerId}</div>
            <div className="text-xs text-blue-600 mt-1">
              Phase: {item.phase}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 sm:px-4 py-2">
        <div className="text-sm text-gray-900 font-medium max-w-xs truncate">
          {item.collegeName || item.businessName.split('/')[0].trim() || item.businessName}
        </div>
        <div className="text-sm text-gray-500">
          {item.allProjects.join(", ")}
        </div>
      </td>
      <td className="px-2 sm:px-4 py-2">
        <div className="text-sm text-gray-900">{item.allDomains.join(", ")}</div>
      </td>

      <td className="px-2 sm:px-4 py-2">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <FiCalendar className="text-gray-400 flex-shrink-0" />
          <span>
            {formatDate(item.earliestStartDate)} -{" "}
            {formatDate(item.latestEndDate)}
          </span>
        </div>

        <div className="text-xs text-gray-500 mt-1 flex items-center">
          <FaRupeeSign className="text-gray-400 mr-1 flex-shrink-0" />
          <span>
            {item.totalCollegeHours} hrs •{" "}
            {item.perHourCost ? `₹${item.perHourCost}/hr` : "Rate not set"}
          </span>
        </div>
        {item.allBatches.length > 1 && (
          <div className="text-xs text-blue-600 mt-1 flex items-center">
            <FiLayers className="mr-1" />
            {item.allBatches.length} batches combined
          </div>
        )}
      </td>
      <td className="px-2 sm:px-4 py-2">
        <div className="flex flex-col gap-2">
          {item.hasExistingInvoice ? (
            <>
              <div className="flex flex-col gap-2">
                {/* Status Badge */}
                <div
                  className={`text-xs px-2 py-1 rounded-full text-center font-medium ${
                    uiStatus === "done"
                      ? "bg-green-100 text-green-800 flex items-center justify-center"
                      : uiStatus === "pending"
                      ? "bg-yellow-100 text-yellow-800 flex items-center justify-center"
                      : "bg-blue-100 text-blue-800 flex items-center justify-center"
                  }`}
                >
                  {uiStatus === "done" && <FiCheckCircle className="mr-1" />}
                  {uiStatus === "approve"
                    ? "Approval Needed"
                    : uiStatus === "pending"
                    ? "Pending Payment"
                    : "Payment Done"}
                </div>

                {/* Action Buttons in a single line */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadInvoice(item)}
                    disabled={
                      downloadingInvoice ===
                      `${item.trainerId}_${item.collegeName}_${item.phase}`
                    }
                    className="flex-1 inline-flex items-center justify-center px-1 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-all"
                  >
                    <FiDownload className="w-3 h-3 mr-1" />
                    Download
                  </button>
                  
                  <button
                    onClick={() => handleEditInvoice(item)}
                    className="flex-1 inline-flex items-center justify-center px-1 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all"
                  >
                    <FaEye className="w-3 h-3 mr-1" />
                    View
                  </button>
                  
                  {uiStatus === "approve" && (
                    <button
                      onClick={updateInvoiceStatus}
                      disabled={updatingStatus}
                      className="flex-1 inline-flex items-center justify-center px-1 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {updatingStatus ? (
                        <FiRefreshCw className="animate-spin w-3 h-3" />
                      ) : (
                        "Approve"
                      )}
                    </button>
                  )}
                </div>

                {/* ✅ Remarks Section */}
                {invoiceData?.remarks && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="font-medium text-gray-700">
                      Remarks:
                    </span>{" "}
                    {invoiceData.remarks.text}{" "}
                    <span className="text-gray-400">
                      ({new Date(invoiceData.remarks.addedAt).toLocaleDateString()}
                      )
                    </span>
                  </div>
                )}
              </div>

              {getDownloadStatus(item)}
            </>
          ) : invoiceAvailable ? (
            <button
              onClick={() => handleGenerateInvoice(item)}
              className="w-full inline-flex items-center justify-center px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
            >
              <FiFileText className="w-4 h-4 mr-1" />
              Generate Invoice
            </button>
          ) : (
            <div className="text-center">
              <div className="text-xs text-amber-600 flex items-center justify-center mb-1">
                <FiClock className="mr-1" />
                Available on{" "}
                {item.latestEndDate
                  ? formatDate(
                      new Date(
                        new Date(item.latestEndDate).getTime() +
                          24 * 60 * 60 * 1000
                      )
                    )
                  : "N/A"}
              </div>
              <button
                disabled
                className="w-full inline-flex items-center justify-center px-2 py-1 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
              >
                <FiFileText className="w-4 h-4 mr-1" />
                Generate Invoice
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default TrainerRow;
