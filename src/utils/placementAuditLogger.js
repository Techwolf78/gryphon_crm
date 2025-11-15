import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const logPlacementActivity = async ({
  userId,
  userName,
  action,
  companyId,
  companyName,
  details,
  changes = null,
  sessionId = null,
  pageUrl = window.location.href,
  ipAddress = null,
  userAgent = navigator.userAgent
}) => {
  try {
    const auditLog = {
      userId,
      userName,
      action,
      companyId,
      companyName,
      details,
      changes,
      sessionId,
      pageUrl,
      ipAddress,
      userAgent,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, "placement_audit_logs"), auditLog);
    console.log("Audit log created:", auditLog);
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};

// Predefined action types
export const AUDIT_ACTIONS = {
  VIEW_LEAD: "VIEW_LEAD",
  UPDATE_LEAD: "UPDATE_LEAD",
  DELETE_LEAD: "DELETE_LEAD",
  SCHEDULE_FOLLOWUP: "SCHEDULE_FOLLOWUP",
  ASSIGN_LEAD: "ASSIGN_LEAD",
  STATUS_CHANGE: "STATUS_CHANGE",
  FILTER_APPLIED: "FILTER_APPLIED",
  SEARCH_PERFORMED: "SEARCH_PERFORMED",
  PAGE_NAVIGATION: "PAGE_NAVIGATION",
  BULK_ACTION: "BULK_ACTION"
};