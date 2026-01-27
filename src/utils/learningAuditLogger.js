import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Cost-optimized audit logging utility for Learning & Development module
// Reduced data storage and batched writes for cost efficiency

// Batch write queue for cost optimization
let auditBatchQueue = [];
let batchTimeout = null;
const BATCH_SIZE = 5; // Batch 5 logs together
const BATCH_DELAY = 1000; // 1 second delay

// Cost-optimized log function with batching
export const logLearningActivity = async (action, entityData = {}, options = {}) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      // console.warn("No authenticated user for audit logging");
      return;
    }

    // Skip logging for low-value actions (cost optimization)
    const lowValueActions = ['undo', 'view', 'filter', 'search'];
    if (lowValueActions.some(actionType => action.toLowerCase().includes(actionType))) {
      return; // Skip logging low-value actions
    }

    // Sanitize and minimize entityData (cost optimization)
    const sanitizedEntityData = sanitizeForFirestore(entityData);

    // Extract entity information from entityData
    const { entityType, entityId, entityName, ...additionalData } = sanitizedEntityData;

    const auditLog = {
      timestamp: serverTimestamp(),
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email || "Unknown User",
      userEmail: currentUser.email,
      action: action,
      module: "Learning & Development",
      // Extract entity information
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(entityName && { entityName }),
      // Removed expensive fields: ipAddress, userAgent, sessionId, authenticationMethod
      riskLevel: options.riskLevel || "Low",
      success: options.success !== false,
      // Only include errorMessage if there's an actual error
      ...(options.errorMessage && { errorMessage: options.errorMessage }),
      // Minimize additionalData size - exclude entity fields that are already extracted
      ...(Object.keys(additionalData).length > 0 && { additionalData })
    };

    // Add to batch queue instead of immediate write (cost optimization)
    auditBatchQueue.push(auditLog);

    // Process batch if queue is full or start timeout
    if (auditBatchQueue.length >= BATCH_SIZE) {
      await processAuditBatch();
    } else if (!batchTimeout) {
      batchTimeout = setTimeout(processAuditBatch, BATCH_DELAY);
    }

    return `batch-${Date.now()}`; // Return batch ID instead of document ID

  } catch (error) {
    // console.error("Failed to queue audit log:", error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Process batched audit logs (cost optimization)
const processAuditBatch = async () => {
  if (auditBatchQueue.length === 0) return;

  const batch = [...auditBatchQueue];
  auditBatchQueue = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  try {
    // Use batch write for multiple documents (cost optimization)
    await Promise.all(
      batch.map(log => addDoc(collection(db, "learning_audit_logs"), log))
    );
    // console.log(`Audit batch processed: ${batch.length} logs`);
  } catch (error) {
    // console.error("Failed to process audit batch:", error);
    // Re-queue failed logs
    auditBatchQueue.unshift(...batch);
  }
};

// Utility function to sanitize objects for Firestore (remove undefined values)
const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized;
};

// Cleanup function to process remaining batches on app unload
export const cleanupAuditBatches = async () => {
  if (auditBatchQueue.length > 0) {
    await processAuditBatch();
  }
};

// Add cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAuditBatches);
}

// Specific audit logging functions for different operations
export const auditLogTrainerOperations = {
  trainerCreated: (trainerData) => logLearningActivity("TRAINER_CREATED", {
    entityType: "Trainer",
    entityId: trainerData.trainerId,
    entityName: trainerData.name || "New Trainer",
    additionalData: {
      domain: trainerData.domain,
      specializations: trainerData.specialization,
      paymentType: trainerData.paymentType
    }
  }),

  trainerUpdated: (trainerId, trainerName, changedFields, oldValues, newValues) => logLearningActivity("TRAINER_UPDATED", {
    entityType: "Trainer",
    entityId: trainerId,
    entityName: trainerName || "Unknown Trainer",
    changedFields,
    oldValues,
    newValues
  }),

  trainerDeleted: (trainerId, trainerName, deletionReason = null) => logLearningActivity("TRAINER_DELETED", {
    entityType: "Trainer",
    entityId: trainerId,
    entityName: trainerName || "Unknown Trainer",
    additionalData: { deletionReason }
  }),

  trainerBulkImport: (fileName, totalRecords, successfulImports, failedImports, importErrors = []) => logLearningActivity("TRAINER_BULK_IMPORT", {
    entityType: "Trainer",
    additionalData: {
      fileName,
      totalRecords,
      successfulImports,
      failedImports,
      importErrors
    }
  })
};

export const auditLogInvoiceOperations = {
  invoiceGenerated: (invoiceData) => logLearningActivity("INVOICE_GENERATED", {
    entityType: "Invoice",
    entityId: invoiceData.invoiceNumber,
    entityName: `Invoice ${invoiceData.invoiceNumber}`,
    additionalData: {
      contractId: invoiceData.contractId,
      installmentId: invoiceData.installmentId,
      invoiceType: invoiceData.invoiceType,
      amount: invoiceData.amount,
      dueDate: invoiceData.dueDate
    }
  }),

  invoiceEdited: (invoiceId, changedFields, oldValues, newValues) => logLearningActivity("INVOICE_EDITED", {
    entityType: "Invoice",
    entityId: invoiceId,
    changedFields,
    oldValues,
    newValues
  }),

  invoicesMerged: (mergedInvoiceIds, newInvoiceId, totalAmount, mergeReason) => logLearningActivity("INVOICES_MERGED", {
    entityType: "Invoice",
    entityId: newInvoiceId,
    additionalData: {
      mergedInvoiceIds,
      totalAmount,
      mergeReason
    }
  }),

  invoiceDataExported: (exportFormat, recordCount, dateRange, fileName) => logLearningActivity("INVOICE_DATA_EXPORTED", {
    entityType: "Invoice",
    additionalData: {
      exportFormat,
      recordCount,
      dateRange,
      fileName
    }
  })
};

export const auditLogTrainingOperations = {
  trainingInitiated: (trainingData) => logLearningActivity("TRAINING_INITIATED", {
    entityType: "Training",
    entityId: trainingData.trainingId,
    entityName: trainingData.collegeName,
    additionalData: {
      phases: trainingData.phases,
      domains: trainingData.domains,
      totalBatches: trainingData.totalBatches,
      totalTrainingHours: trainingData.totalTrainingHours,
      totalCost: trainingData.totalCost,
      initiatedBy: trainingData.initiatedBy,
      initiatedByName: trainingData.initiatedByName
    }
  }),

  batchCreated: (batchData) => logLearningActivity("BATCH_CREATED", {
    entityType: "TrainingBatch",
    entityId: batchData.batchCode,
    entityName: batchData.collegeName || "Unknown College",
    additionalData: {
      trainingId: batchData.trainingId,
      collegeName: batchData.collegeName,
      phase: batchData.phase,
      domain: batchData.domain,
      batchCode: batchData.batchCode,
      specialization: batchData.specialization,
      studentCount: batchData.studentCount,
      trainerCount: batchData.trainerCount,
      totalAssignedHours: batchData.totalAssignedHours,
      createdBy: batchData.createdBy,
      createdByName: batchData.createdByName
    }
  }),

  trainingAssigned: (trainingId, collegeName, oldAssignee, newAssignee) => logLearningActivity("TRAINING_ASSIGNED", {
    entityType: "Training",
    entityId: trainingId,
    entityName: collegeName,
    additionalData: {
      oldAssignee,
      newAssignee
    }
  }),

  trainingDeleted: (trainingId, collegeName, phaseId, deletionReason = null) => logLearningActivity("TRAINING_DELETED", {
    entityType: "Training",
    entityId: trainingId,
    entityName: collegeName,
    additionalData: {
      phaseId,
      deletionReason
    }
  }),

  trainingStatusChanged: (trainingId, collegeName, phaseId, oldStatus, newStatus, changeReason = null) => logLearningActivity("TRAINING_STATUS_CHANGED", {
    entityType: "Training",
    entityId: trainingId,
    entityName: collegeName,
    additionalData: {
      phaseId,
      oldStatus,
      newStatus,
      changeReason
    }
  }),

  trainingPhaseConfigured: (trainingId, phaseNumber, phaseData) => logLearningActivity("TRAINING_PHASE_CONFIGURED", {
    entityType: "Training",
    entityId: trainingId,
    additionalData: {
      phaseNumber,
      startDate: phaseData.startDate,
      endDate: phaseData.endDate,
      sessionCount: phaseData.sessionCount,
      configurationDetails: phaseData
    }
  }),

  batchesMerged: (sourceBatchIds, targetBatchId, mergeReason, affectedStudents) => logLearningActivity("BATCHES_MERGED", {
    entityType: "TrainingBatch",
    entityId: targetBatchId,
    additionalData: {
      sourceBatchIds,
      mergeReason,
      affectedStudents
    }
  })
};

export const auditLogStudentOperations = {
  studentDataUploaded: (trainingId, fileName, totalRecords, successfulUploads, failedUploads, uploadErrors = []) => logLearningActivity("STUDENT_DATA_UPLOADED", {
    entityType: "Student",
    additionalData: {
      trainingId,
      fileName,
      totalRecords,
      successfulUploads,
      failedUploads,
      uploadErrors
    }
  }),

  studentDataViewed: (trainingId, recordCount, viewFilters = {}) => logLearningActivity("STUDENT_DATA_VIEWED", {
    entityType: "Student",
    additionalData: {
      trainingId,
      recordCount,
      viewFilters
    }
  }),

  studentDataExported: (trainingId, exportFormat, recordCount, selectedColumns = []) => logLearningActivity("STUDENT_DATA_EXPORTED", {
    entityType: "Student",
    additionalData: {
      trainingId,
      exportFormat,
      recordCount,
      selectedColumns
    }
  })
};

export const auditLogCalendarOperations = {
  calendarViewed: (viewType, dateRange, appliedFilters = {}) => logLearningActivity("CALENDAR_VIEWED", {
    entityType: "Calendar",
    additionalData: {
      viewType,
      dateRange,
      appliedFilters
    }
  }),

  trainerAssignmentDeleted: (assignmentId, trainerId, trainingId, deletionReason) => logLearningActivity("TRAINER_ASSIGNMENT_DELETED", {
    entityType: "TrainerAssignment",
    entityId: assignmentId,
    additionalData: {
      trainerId,
      trainingId,
      deletionReason
    }
  }),

  calendarDataExported: (exportFormat, trainerId, dateRange, recordCount, fileName) => logLearningActivity("CALENDAR_DATA_EXPORTED", {
    entityType: "Calendar",
    additionalData: {
      exportFormat,
      trainerId,
      dateRange,
      recordCount,
      fileName
    }
  })
};

export const auditLogReportOperations = {
  collegeReportGenerated: (reportType, dateRange, collegeCount, totalStudents) => logLearningActivity("COLLEGE_REPORT_GENERATED", {
    entityType: "Report",
    additionalData: {
      reportType,
      dateRange,
      collegeCount,
      totalStudents
    }
  }),

  trainerDashboardViewed: () => logLearningActivity("TRAINER_DASHBOARD_VIEWED", {
    entityType: "Dashboard"
  }),

  trainerMetricsViewed: (trainerId = null) => logLearningActivity("TRAINER_METRICS_VIEWED", {
    entityType: "Metrics",
    entityId: trainerId
  })
};

export const auditLogSecurityOperations = {
  learningModuleAccessed: () => logLearningActivity("LEARNING_MODULE_ACCESSED", {
    entityType: "Module"
  }),

  adminPanelAccessed: () => logLearningActivity("ADMIN_PANEL_ACCESSED", {
    entityType: "AdminPanel",
    riskLevel: "Medium"
  }),

  bulkOperationPerformed: (operationType, affectedRecords) => logLearningActivity("BULK_OPERATION_PERFORMED", {
    entityType: "BulkOperation",
    additionalData: {
      operationType,
      affectedRecords
    },
    riskLevel: "Medium"
  }),

  dataExportRequested: (dataType, recordCount) => logLearningActivity("DATA_EXPORT_REQUESTED", {
    entityType: "DataExport",
    additionalData: {
      dataType,
      recordCount
    },
    riskLevel: "Medium"
  })
};

export const auditLogErrorOperations = {
  validationError: (errorType, fieldName, errorMessage, userInput = null) => logLearningActivity("VALIDATION_ERROR_OCCURRED", {
    success: false,
    errorMessage,
    additionalData: {
      errorType,
      fieldName,
      userInput
    }
  }),

  fileUploadFailed: (fileName, errorReason, fileSize = null, fileType = null) => logLearningActivity("FILE_UPLOAD_FAILED", {
    success: false,
    errorMessage: errorReason,
    additionalData: {
      fileName,
      fileSize,
      fileType
    }
  }),

  databaseOperationFailed: (operationType, collectionName, errorCode, errorMessage) => logLearningActivity("DATABASE_OPERATION_FAILED", {
    success: false,
    errorMessage,
    additionalData: {
      operationType,
      collectionName,
      errorCode
    }
  }),

  rateLimitExceeded: (limitType = "API") => logLearningActivity("RATE_LIMIT_EXCEEDED", {
    success: false,
    errorMessage: `${limitType} rate limit exceeded`,
    additionalData: {
      limitType
    }
  })
};

// Specific invoice operation logging function
export const logInvoiceOperation = async (operationType, invoiceId, operationData) => {
  const actionMap = {
    "invoice_creation": "INVOICE_CREATED",
    "invoice_conversion": "INVOICE_CONVERTED",
    "invoice_regeneration": "INVOICE_REGENERATED",
    "merged_invoice_creation": "MERGED_INVOICE_CREATED",
    "invoice_cancellation": "INVOICE_CANCELLED"
  };

  return logLearningActivity(actionMap[operationType] || operationType.toUpperCase(), {
    entityType: "Invoice",
    entityId: invoiceId,
    entityName: operationData.invoiceNumber ? `Invoice ${operationData.invoiceNumber}` : `Invoice ${invoiceId}`,
    additionalData: operationData
  });
};

// Utility function to measure and log processing time
export const withAuditLogging = async (operation, operationData = {}) => {
  const startTime = Date.now();

  try {
    const result = await operation();

    const processingTime = Date.now() - startTime;
    await logLearningActivity(operationData.action, {
      ...operationData,
      processingTime,
      success: true
    });

    return result;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    await logLearningActivity(operationData.action, {
      ...operationData,
      processingTime,
      success: false,
      errorMessage: error.message
    });

    throw error;
  }
};