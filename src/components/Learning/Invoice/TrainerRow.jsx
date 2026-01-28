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
  FiEdit3,
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
  handleViewInvoice,
  handleDeleteInvoice,
  downloadingInvoice,
  getDownloadStatus,
  formatDate
}) {
  // console.log('🔍 TrainerRow received item:', {
  //   trainerName: item.trainerName,
  //   trainerId: item.trainerId,
  //   assignedHours: item.assignedHours,
  //   totalCollegeHours: item.totalCollegeHours,
  //   paymentCycle: item.paymentCycle,
  //   allBatches: item.allBatches?.length
  // });
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
              where("phase", "==", item.phase),
              where("paymentCycle", "==", item.paymentCycle)
            )
          : query(
              collection(db, "invoices"),
              where("trainerId", "==", item.trainerId),
              where("collegeName", "==", item.collegeName),
              where("phase", "==", item.phase),
              where("projectCode", "==", item.projectCode),
              where("paymentCycle", "==", item.paymentCycle)
            );

        // console.log('🔍 TrainerRow fetching invoice for:', {
        //   trainerId: item.trainerId,
        //   collegeName: item.collegeName,
        //   phase: item.phase,
        //   paymentCycle: item.paymentCycle,
        //   projectCode: item.projectCode,
        //   isMerged: item.isMerged
        // });

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const invoiceDoc = querySnapshot.docs[0];
          const fetchedInvoiceData = {
            id: invoiceDoc.id,
            ...invoiceDoc.data(),
          };
          
          // console.log('✅ TrainerRow found invoice:', {
          //   trainer: item.trainerName,
          //   cycle: item.paymentCycle,
          //   billNumber: fetchedInvoiceData.billNumber,
          //   netPayment: fetchedInvoiceData.netPayment,
          //   totalAmount: fetchedInvoiceData.totalAmount
          // });
          
          setInvoiceData(fetchedInvoiceData);
        } else {
          // console.log('❌ TrainerRow no invoice found for:', {
          //   trainer: item.trainerName,
          //   cycle: item.paymentCycle
          // });
        }
      } catch {
        // console.error(`🚨 TrainerRow invoice fetch failed for ${item.trainerName}:`, fetchError);
      }
    };

    fetchInvoiceData();
  }, [item]);

  // Determine status for display
  const getStatusInfo = () => {
    if (!invoiceData) {
      return {
        label: "Pending",
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
          <div className="shrink-0 h-10 w-10 bg-linear-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <FiUser className="text-blue-600" />
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate" title={item.trainerName}>
              {item.trainerName}
            </div>
            <div className="text-xs text-gray-600 truncate">ID: {item.trainerId}</div>
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
            <FiCalendar className="text-blue-500 shrink-0 text-xs" />
            <span className="font-medium truncate" title={`${formatDate(item.earliestStartDate)} - ${formatDate(item.latestEndDate)}`}>
              {formatDate(item.earliestStartDate)}
            </span>
          </div>
          <div className="text-xs text-gray-500 truncate">
            to {formatDate(item.latestEndDate)}
          </div>
          
          {item.paymentCycle && (
            <div className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded truncate">
              <FiCalendar className="mr-1 text-xs" />
              Cycle: {item.paymentCycle}
            </div>
          )}
          
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <FaRupeeSign className="text-green-500 shrink-0 text-xs" />
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
        <div className="space-y-1">
          {invoiceData?.netPayment ? (
            <div className="text-sm font-semibold text-green-600">
              {(() => {
                // Recalculate net payment using stored invoice data to ensure accuracy
                const trainingFees = Math.round((invoiceData.trainingRate || 0) * (invoiceData.totalHours || 0));
                const gstAmount = invoiceData.gst === "18" ? Math.round(trainingFees * 0.18) : 0;
                const taxableAmount = trainingFees + gstAmount;
                const tdsAmount = Math.round((taxableAmount * (parseFloat(invoiceData.tds) || 0)) / 100);
                const otherExpenses = (parseFloat(invoiceData.conveyance) || 0) + (parseFloat(invoiceData.food) || 0) + (parseFloat(invoiceData.lodging) || 0);
                const netPayment = Math.round(taxableAmount - tdsAmount + otherExpenses + (parseFloat(invoiceData.adhocAdjustment) || 0));
                return `₹${netPayment.toLocaleString('en-IN')}`;
              })()}
            </div>
          ) : (
            <div className="text-sm font-semibold text-green-600">
              {(() => {
                // Calculate net payment for pending trainers using default values
                const trainingFees = Math.round((item.perHourCost || 0) * (item.assignedHours || item.totalCollegeHours || 0));
                const gstAmount = 0; // Default to NA (no GST)
                const taxableAmount = trainingFees + gstAmount;
                const tdsAmount = Math.round((taxableAmount * 0.1)); // Default 10% TDS
                const otherExpenses = (item.totalConveyance || 0) + (item.totalFood || 0) + (item.totalLodging || 0);
                const netPayment = Math.round(taxableAmount - tdsAmount + otherExpenses);
                return `₹${netPayment.toLocaleString('en-IN')}`;
              })()}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-1">
          <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border} shadow-sm`}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusInfo.label}
          </span>
          
          {/* Stack additional info based on status */}
          {invoiceData && (
            <>
              {(() => {
                const createdAt = invoiceData.createdAt?.toDate?.() || invoiceData.createdAt;
                return createdAt && !isNaN(new Date(createdAt).getTime()) && invoiceData.status !== "rejected" && (
                  <div className="text-xs text-gray-500">
                    Generated: {(() => {
                      const date = new Date(createdAt);
                      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                    })()}
                  </div>
                );
              })()}
            </>
          )}
          
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
              {/* Compact Action Buttons - Single Row */}
              <div className="flex gap-1 w-full">
                      {/* View button - icon only, minimal width */}
                      <button
                        onClick={() => {
                          // console.log('👁️ VIEW BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle, '|', datesInfo);
                          handleViewInvoice(item);
                        }}
                        className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-all shrink-0"
                      >
                        <FaEye className="w-3 h-3" />
                      </button>

                      {/* Edit button - icon only, minimal width */}
                      <button
                        onClick={() => handleEditInvoice(item)}
                        className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-all shrink-0"
                      >
                        <FiEdit3 className="w-3 h-3" />
                      </button>

                      {/* Download button */}
                      <button
                        onClick={() => {
                          // console.log('📥 DOWNLOAD BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle);
                          handleDownloadInvoice(item);
                        }}
                        disabled={
                          downloadingInvoice ===
                          `${item.trainerId}_${item.collegeName}_${item.phase}`
                        }
                        className="flex-1 inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 transition-all"
                      >
                        <FiDownload className="w-3 h-3 mr-1" />
                        Download
                      </button>

                      {/* Approve button for generated invoices */}
                      {invoiceData && invoiceData.status === "generated" && (
                        <button
                          onClick={() => {
                            // console.log('✅ APPROVE BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle);
                            handleApproveInvoice(item);
                          }}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-all"
                        >
                          <FiCheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                      )}

                      {/* Delete button for generated invoices (for splitting old combined invoices) */}
                      {invoiceData && (invoiceData.status === "generated" || invoiceData.status === "approved" || invoiceData.status === "pending") && (
                        <button
                          onClick={() => {
                            // console.log('🗑️ DELETE BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle);
                            handleDeleteInvoice(item);
                          }}
                          className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-all shrink-0"
                          title="Delete invoice (for splitting old combined invoices)"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Resubmit button for rejected invoices */}
                      {invoiceData && invoiceData.status === "rejected" && (
                        <button
                          onClick={() => {
                            // console.log('🔄 RESUBMIT BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle);
                            handleEditInvoice(item);
                          }}
                          className="flex-1 inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-linear-to-r from-amber-500 to-orange-500 rounded hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-sm hover:shadow-md border border-amber-400 hover:border-amber-500"
                        >
                          <FiRefreshCw className="w-3 h-3 mr-1" />
                          Resubmit
                        </button>
                      )}
                    </div>
                    
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
                      Added on {new Date(invoiceData.remarks.addedAt?.toDate?.() || invoiceData.remarks.addedAt).toLocaleDateString()}
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
                  onClick={() => {
                    // console.log('📄 GENERATE INVOICE BUTTON clicked for trainer:', item.trainerName, 'ID:', item.trainerId, 'Cycle:', item.paymentCycle, '|', datesInfo);
                    handleGenerateInvoice(item);
                  }}
                  className="w-full inline-flex items-center justify-center px-2 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md border border-blue-600"
                >
                  <FiFileText className="w-4 h-4 mr-1" />
                  Generate Invoice
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-0.5 max-w-32 mx-auto">
                  <div className="text-[10px] text-amber-700 flex items-center justify-center">
                    <FiClock className="mr-1 text-[10px]" />
                    <span className="font-medium">Available on</span>
                  </div>
                  <div className="text-xs font-semibold text-amber-800">
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
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default TrainerRow;