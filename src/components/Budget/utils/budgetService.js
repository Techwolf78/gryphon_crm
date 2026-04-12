// src/components/Budget/utils/budgetService.js
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.js";

/* --------------------------------------
   🔹 BUDGET FUNCTIONS
-------------------------------------- */

// ✅ Create or update department budget
export const createDepartmentBudget = async (deptName, FY, budgetData) => {
  const docId = `${deptName}_${FY}`;
  const budgetRef = doc(db, "department_budgets", docId);

  await setDoc(budgetRef, {
    deptName,
    FY,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...budgetData,
  });

  return docId;
};

// ✅ Fetch all department budgets
export const getDepartmentBudgets = async () => {
  const snapshot = await getDocs(collection(db, "department_budgets"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// ✅ Fetch a specific budget by dept & FY
export const getBudgetByDeptAndFY = async (deptName, FY) => {
  const docId = `${deptName}_${FY}`;
  const docRef = doc(db, "department_budgets", docId);
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ✅ Update total spent after PO approval
export const updateTotalSpent = async (deptName, FY, amount) => {
  const docId = `${deptName}_${FY}`;
  const docRef = doc(db, "department_budgets", docId);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Budget not found");

  const currentSpent = docSnap.data().totalSpent || 0;
  await updateDoc(docRef, {
    totalSpent: currentSpent + amount,
    updatedAt: serverTimestamp(),
  });
};

/* --------------------------------------
   🔹 PURCHASE INTENT FUNCTIONS
-------------------------------------- */

// ✅ Create a purchase intent
export const createPurchaseIntent = async (intentData) => {
  const intentRef = collection(db, "purchase_intents");

  const docRef = await addDoc(intentRef, {
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...intentData,
  });

  return docRef.id;
};

// ✅ Fetch intents (optionally by department)
export const getPurchaseIntents = async (deptName = null) => {
  const intentsRef = collection(db, "purchase_intents");
  const q = deptName
    ? query(intentsRef, where("department", "==", deptName))
    : intentsRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// ✅ Approve or reject a purchase intent
export const updatePurchaseIntentStatus = async (
  intentId,
  status,
  approver
) => {
  const docRef = doc(db, "purchase_intents", intentId);
  await updateDoc(docRef, {
    status,
    approvalBy: approver,
    updatedAt: serverTimestamp(),
  });
};

/* --------------------------------------
   🔹 PURCHASE ORDER FUNCTIONS
-------------------------------------- */

// ✅ Create Purchase Order
export const createPurchaseOrder = async (poData) => {
  const poRef = collection(db, "purchase_orders");

  const docRef = await addDoc(poRef, {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...poData,
  });

  return docRef.id;
};

// ✅ Fetch POs (optionally by department)
export const getPurchaseOrders = async (deptName = null) => {
  const poRef = collection(db, "purchase_orders");
  const q = deptName
    ? query(poRef, where("department", "==", deptName))
    : poRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* --------------------------------------
   🔹 VENDOR FUNCTIONS
-------------------------------------- */

// ✅ Add Vendor
export const addVendor = async (vendorData) => {
  const vendorRef = collection(db, "vendors");
  const docRef = await addDoc(vendorRef, {
    createdAt: serverTimestamp(),
    ...vendorData,
  });
  return docRef.id;
};

// ✅ Fetch Vendors
export const getVendors = async () => {
  const snapshot = await getDocs(collection(db, "vendors"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* --------------------------------------
   🔹 HELPER UTILS
-------------------------------------- */

// ✅ Validate unique FY for dept
export const validateUniqueFY = async (deptName, FY) => {
  const existingBudget = await getBudgetByDeptAndFY(deptName, FY);
  return existingBudget ? false : true;
};
