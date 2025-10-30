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
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import { FaEye, FaRupeeSign } from "react-icons/fa";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";

function TrainerRow({
  item,
  handleDownloadInvoice,
  handleEditInvoice,
  handleGenerateInvoice,
  handleApproveInvoice,
  downloadingInvoice,
  getDownloadStatus,
  formatDate,
  recentlyGeneratedInvoices,
  handleUndoInvoice,
  countdownTimers
}) {
  const [invoiceData, setInvoiceData] = useState(null);

  // Fetch current invoice data from Firebase
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!item.hasExistingInvoice) {
        return;
      }
      
      try {
        const q = item.isMerged
          ? query(
              collection(db, "invoices"),
              where("trainerId", "==", item.trainerId),
              where("collegeName", "==", item.collegeName),
              where("phase", "==", item.phase)
            )
          : query(
              collection(db, "invoices"),
              where("trainerId", "==", item.trainerId),
              where("collegeName", "==", item.collegeName),
              where("phase", "==", item.phase),
              where("projectCode", "==", item.projectCode)
            );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const invoiceDoc = querySnapshot.docs[0];
          const fetchedInvoiceData = {
            id: invoiceDoc.id,
            ...invoiceDoc.data(),
          };
          
          setInvoiceData(fetchedInvoiceData);
        } else {
          // No invoice found - this is expected for trainers without invoices
        }
      } catch (fetchError) {
        console.error(`🚨 TrainerRow invoice fetch failed for ${item.trainerName}:`, fetchError);
      }
    };

    fetchInvoiceData();
  }, [item]);

  // Determine status for display
  const getStatusInfo = () => {
    if (!invoiceData) {
      return {
        label: "Not Generated",
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: FiClock
      };
    }

    if (invoiceData.status === "rejected") {
      return {
        label: "Rejected by HR",
        bg: "bg-red-50",
        text: "text-red-800",
        border: "border-red-200",
        icon: FiXCircle
      };
    } else if (invoiceData.payment === true) {
      return {
        label: "Paid",
        bg: "bg-green-50",
        text: "text-green-800",
        border: "border-green-200",
        icon: FiCheckCircle
      };
    } else if (invoiceData.invoice === true) {
      return {
        label: "Approved",
        bg: "bg-blue-50",
        text: "text-blue-800",
        border: "border-blue-200",
        icon: FiCheckCircle
      };
    } else {
      return {
        label: "Generated",
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        icon: FiFileText
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const invoiceAvailable = item.latestEndDate
    ? Date.now() >=
      new Date(item.latestEndDate).getTime() + 24 * 60 * 60 * 1000
    : false;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-3 py-3">
        <div className="flex items-center min-w-0">
          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate" title={item.trainerName}>
              {item.trainerName}
            </div>
            <div className="text-xs text-gray-600 truncate">ID: {item.trainerId}</div>
            <div className="inline-flex items-center mt-1">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded truncate">
                {item.phase}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 max-w-0">
        <div className="space-y-1 min-w-0 max-w-full">
          <div className="text-sm font-semibold text-gray-900 truncate max-w-full" title={item.collegeName || item.businessName.split('/')[0].trim() || item.businessName}>
            {item.collegeName || item.businessName.split('/')[0].trim() || item.businessName}
          </div>
          <div className="text-xs text-gray-600 truncate max-w-full" title={item.allProjects.join(", ")}>
            {item.allProjects.join(", ")}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-800 truncate" title={item.allDomains.join(", ")}>{item.allDomains.join(", ")}</div>
      </td>

      <td className="px-3 py-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1 text-xs text-gray-700">
            <FiCalendar className="text-blue-500 flex-shrink-0 text-xs" />
            <span className="font-medium truncate" title={`${formatDate(item.earliestStartDate)} - ${formatDate(item.latestEndDate)}`}>
              {formatDate(item.earliestStartDate)}
            </span>
          </div>
          <div className="text-xs text-gray-500 truncate">
            to {formatDate(item.latestEndDate)}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <FaRupeeSign className="text-green-500 flex-shrink-0 text-xs" />
            <span className="truncate">
              {item.totalCollegeHours}h • {item.perHourCost ? `₹${item.perHourCost}` : "No rate"}
            </span>
          </div>
          
          {item.allBatches.length > 1 && (
            <div className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded truncate">
              <FiLayers className="mr-1 text-xs" />
              {item.allBatches.length} batches
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} shadow-sm`}>
            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
            {statusInfo.label}
          </span>
          
          {/* Show rejection remarks directly below status when rejected */}
          {invoiceData?.status === "rejected" && invoiceData?.rejectionRemarks && (
            <div className="bg-red-50 border border-red-200 rounded px-2 py-1 max-w-xs">
              <p className="text-xs text-red-700 leading-tight">
                {invoiceData.rejectionRemarks}
              </p>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-2 min-w-0">
          {item.hasExistingInvoice ? (
            <>
              {/* Check if this trainer has a recently generated invoice for undo */}
              {(() => {
                const undoInvoice = recentlyGeneratedInvoices?.find(inv => 
                  inv.trainerId === item.trainerId && 
                  inv.collegeName === item.collegeName && 
                  inv.phase === item.phase
                );
                const hasUndoOption = !!undoInvoice;
                const timeLeft = hasUndoOption ? countdownTimers?.[undoInvoice?.id] || Math.max(0, Math.ceil((undoInvoice?.expiresAt - Date.now()) / 1000)) : 0;
                
                return (
                  <>
                    {/* Compact Action Buttons - Single Row */}
                    <div className={`flex gap-1 w-full ${hasUndoOption ? 'grid grid-cols-4' : ''}`}>
                      <button
                        onClick={() => handleDownloadInvoice(item)}
                        disabled={
                          downloadingInvoice ===
                          `${item.trainerId}_${item.collegeName}_${item.phase}`
                        }
                        className={`${hasUndoOption ? 'col-span-1' : 'flex-1'} inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 transition-all`}
                      >
                        <FiDownload className="w-3 h-3 mr-1" />
                        Download
                      </button>
                      
                      <button
                        onClick={() => handleEditInvoice(item)}
                        className={`${hasUndoOption ? 'col-span-1' : 'flex-1'} inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-all`}
                      >
                        <FaEye className="w-3 h-3 mr-1" />
                        View
                      </button>

                      {/* Approve button for generated invoices */}
                      {invoiceData && invoiceData.status === "generated" && (
                        <button
                          onClick={() => handleApproveInvoice(item)}
                          className={`${hasUndoOption ? 'col-span-1' : 'flex-1'} inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-all`}
                        >
                          <FiCheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                      )}
                      
                      {invoiceData && invoiceData.status === "rejected" && (
                        <button
                          onClick={() => handleEditInvoice(item)}
                          className={`${hasUndoOption ? 'col-span-1' : 'flex-1'} inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-sm hover:shadow-md border border-amber-400 hover:border-amber-500`}
                        >
                          <FiRefreshCw className="w-3 h-3 mr-1" />
                          Resubmit
                        </button>
                      )}
                      
                      {hasUndoOption && timeLeft > 0 && (
                        <button
                          onClick={() => handleUndoInvoice(undoInvoice)}
                          className="col-span-1 inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-all"
                        >
                          <FiTrash2 className="w-3 h-3 mr-1" />
                          Undo
                        </button>
                      )}
                    </div>
                    
                    {/* Show countdown timer below buttons if undo is available */}
                    {hasUndoOption && timeLeft > 0 && (
                      <div className="text-center mt-1">
                        <span className="text-xs text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">
                          Undo expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {/* Enhanced Remarks Section - Only show non-rejection remarks */}
              {invoiceData?.remarks && invoiceData?.status !== "rejected" && (
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-800 block mb-1">
                      💬 Remarks:
                    </span>
                    <p className="text-gray-700">
                      {invoiceData.remarks.text}
                    </p>
                    <span className="text-gray-500 text-xs mt-1 block">
                      Added on {new Date(invoiceData.remarks.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {getDownloadStatus(item)}
            </>
          ) : invoiceAvailable ? (
            <>
              <div className="flex justify-center">
                <button
                  onClick={() => handleGenerateInvoice(item)}
                  className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md border border-blue-600"
                >
                  <FiFileText className="w-5 h-5 mr-2" />
                  Generate Invoice
                </button>
              </div>
            </>
          ) : (
            <>
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
                  Generate Invoice
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default TrainerRow;