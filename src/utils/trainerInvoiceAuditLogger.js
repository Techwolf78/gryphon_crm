import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Trainer Invoice Audit Logger
 * Logs all actions performed on trainer invoices for compliance and tracking
 */

// Action types for consistency
export const AUDIT_ACTIONS = {
  GENERATE: 'generate',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  DOWNLOAD: 'download',
  VIEW: 'view',
  RESTORE: 'restore'
};

/**
 * Get current user information from localStorage or context
 */
const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        userId: user.id || user.uid || 'unknown',
        userName: user.name || user.displayName || user.email || 'Unknown User',
        userEmail: user.email || ''
      };
    }
  } catch {
    // console.warn('Error getting current user:', error);
  }

  return {
    userId: 'system',
    userName: 'System',
    userEmail: ''
  };
};

/**
 * Get client information
 */
const getClientInfo = () => {
  return {
    userAgent: navigator.userAgent,
    timestamp: serverTimestamp(),
    url: window.location.href
  };
};

/**
 * Log an invoice action to Firestore
 * @param {string} action - Action type from AUDIT_ACTIONS
 * @param {Object} invoiceData - Invoice/trainer data
 * @param {Object} additionalDetails - Additional context
 */
export const logInvoiceAction = async (action, invoiceData = {}, additionalDetails = {}) => {
  try {
    const user = getCurrentUser();
    const clientInfo = getClientInfo();

    // Prepare audit log data
    const auditData = {
      action,
      timestamp: serverTimestamp(),

      // User information
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,

      // Invoice/Trainer information
      trainerId: invoiceData.trainerId || '',
      trainerName: invoiceData.trainerName || '',
      collegeName: invoiceData.collegeName || invoiceData.businessName || '',
      projectCode: invoiceData.projectCode || '',
      phase: invoiceData.phase || '',
      paymentCycle: invoiceData.paymentCycle || '',
      domain: invoiceData.domain || '',
      billNumber: invoiceData.billNumber || '',
      invoiceId: invoiceData.id || invoiceData.invoiceId || '',

      // Financial information (for tracking)
      totalHours: invoiceData.totalHours || invoiceData.assignedHours || 0,
      trainingRate: invoiceData.trainingRate || invoiceData.perHourCost || 0,
      netPayment: invoiceData.netPayment || invoiceData.totalAmount || 0,

      // Client information
      clientInfo,

      // Additional details
      details: {
        ...additionalDetails,
        sessionId: additionalDetails.sessionId || generateSessionId(),
        ipAddress: additionalDetails.ipAddress || 'unknown'
      }
    };

    // Add action-specific details
    switch (action) {
      case AUDIT_ACTIONS.GENERATE:
        auditData.details.generatedFrom = additionalDetails.generatedFrom || 'manual';
        auditData.details.invoiceData = sanitizeInvoiceData(invoiceData);
        break;

      case AUDIT_ACTIONS.EDIT:
        auditData.details.previousValues = additionalDetails.previousValues || {};
        auditData.details.newValues = additionalDetails.newValues || {};
        auditData.details.changedFields = additionalDetails.changedFields || [];
        auditData.details.editReason = additionalDetails.editReason || '';
        break;

      case AUDIT_ACTIONS.DELETE:
        auditData.details.deleteReason = additionalDetails.deleteReason || '';
        auditData.details.deletedData = sanitizeInvoiceData(invoiceData);
        break;

      case AUDIT_ACTIONS.APPROVE:
      case AUDIT_ACTIONS.REJECT:
        auditData.details.approvalReason = additionalDetails.approvalReason || '';
        auditData.details.paymentCycle = invoiceData.paymentCycle;
        break;

      case AUDIT_ACTIONS.DOWNLOAD:
        auditData.details.downloadFormat = additionalDetails.downloadFormat || 'pdf';
        auditData.details.downloadSource = additionalDetails.downloadSource || 'web';
        break;

      case AUDIT_ACTIONS.VIEW:
        auditData.details.viewSource = additionalDetails.viewSource || 'dashboard';
        break;
    }

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'trainer_invoice_audit_logs'), auditData);

    // console.log(`✅ Invoice audit log created: ${action} - ${docRef.id}`);

    return {
      success: true,
      logId: docRef.id
    };

  } catch (error) {
    // Fallback: try to log to console if Firestore fails (removed for production)
    // console.warn('Audit log data:', {
    //   action,
    //   invoiceData: sanitizeInvoiceData(invoiceData),
    //   additionalDetails,
    //   error: error.message
    // });

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate a session ID for tracking user sessions
 */
const generateSessionId = () => {
  try {
    let sessionId = localStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return `session_${Date.now()}`;
  }
};

/**
 * Sanitize invoice data to remove sensitive information and convert non-serializable objects
 */
const sanitizeInvoiceData = (data) => {
  if (!data || typeof data !== 'object') return {};

  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = {};

  // Deep clone and sanitize
  const sanitizeValue = (value) => {
    if (value === null || value === undefined) return value;

    // Handle Sets - convert to arrays
    if (value instanceof Set) {
      return Array.from(value);
    }

    // Handle Maps - convert to objects
    if (value instanceof Map) {
      const obj = {};
      for (const [key, val] of value.entries()) {
        obj[key] = sanitizeValue(val);
      }
      return obj;
    }

    // Handle Dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    // Handle objects
    if (typeof value === 'object') {
      const obj = {};
      Object.keys(value).forEach(key => {
        // Skip sensitive fields
        if (sensitiveFields.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else {
          obj[key] = sanitizeValue(value[key]);
        }
      });
      return obj;
    }

    // Primitive values
    return value;
  };

  // Process the root object
  Object.keys(data).forEach(key => {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeValue(data[key]);
    }
  });

  // Limit large objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      try {
        const size = JSON.stringify(sanitized[key]).length;
        if (size > 10000) { // 10KB limit
          sanitized[key] = '[LARGE_OBJECT_REDACTED]';
        }
      } catch {
        // If JSON.stringify fails, replace with placeholder
        sanitized[key] = '[NON_SERIALIZABLE_OBJECT_REDACTED]';
      }
    }
  });

  return sanitized;
};

/**
 * Batch log multiple actions (for bulk operations)
 */
export const logBatchInvoiceActions = async (actions) => {
  const results = [];

  for (const action of actions) {
    const result = await logInvoiceAction(
      action.action,
      action.invoiceData,
      action.additionalDetails
    );
    results.push(result);
  }

  return results;
};

/**
 * Get audit statistics for a date range
 */
// eslint-disable-next-line no-unused-vars
export const getAuditStats = async (_startDate, _endDate) => {
  // This would be implemented in the admin component
  // For now, just return a placeholder
  return {
    totalLogs: 0,
    actionsBreakdown: {},
    topUsers: [],
    recentActivity: []
  };
};

export default {
  logInvoiceAction,
  logBatchInvoiceActions,
  getAuditStats,
  AUDIT_ACTIONS
};