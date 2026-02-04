import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "../../../firebase"; // Adjust path to your firebase config

export const DepartmentService = {
  // ==========================================
  // 1. HELPERS
  // ==========================================
  getCurrentFiscalYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 = Jan, 3 = April
    const fyStartYear = month >= 3 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    return `${fyStartYear.toString().slice(-2)}-${fyEndYear
      .toString()
      .slice(-2)
      .padStart(2, "0")}`;
  },

  getDepartmentCode(department) {
    const map = {
      lnd: "T",
      dm: "DM",
      sales: "Sales",
      cr: "CR",
      hr: "HR&Admin",
      admin: "MAN",
      management: "MAN",
      placement: "CR",
    };
    return map[department?.toLowerCase()] || department?.toUpperCase();
  },

  // ==========================================
  // 2. REAL-TIME LISTENERS (SUBSCRIPTIONS)
  // ==========================================

  /**
   * Listen to Budgets for a specific department
   */
  subscribeToBudgets(department, onUpdate) {
    const q = query(
      collection(db, "department_budgets"),
      where("department", "==", department),
      orderBy("fiscalYear", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const budgets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(budgets);
    });
  },

  subscribeToIntents(department, fiscalYear, onUpdate) {
    const q = query(
      collection(db, "purchase_intents"),
      where("department", "==", department),
      where("fiscalYear", "==", fiscalYear),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const intents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(intents);
    });
  },

  subscribeToOrders(department, fiscalYear, onUpdate) {
    const q = query(
      collection(db, "purchase_orders"),
      where("department", "==", department),
      where("fiscalYear", "==", fiscalYear),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(orders);
    });
  },

  subscribeToVendors(onUpdate) {
    return onSnapshot(collection(db, "vendors"), (snapshot) => {
      const vendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(vendors);
    });
  },

  // ==========================================
  // 3. BUDGET ACTIONS
  // ==========================================

  async createBudget(department, budgetData, user) {
    const fiscalYear = budgetData.fiscalYear || this.getCurrentFiscalYear();
    const docId = `${department}_FY-20${fiscalYear}`;

    const payload = {
      ...budgetData,
      department,
      fiscalYear,
      ownerName: user.displayName,
      status: budgetData.status || "draft",
      createdBy: user.uid,
      updatedBy: user.uid,
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "department_budgets", docId), payload);
  },

  async updateBudget(budgetData, existingBudget, user) {
    const budgetRef = doc(db, "department_budgets", existingBudget.id);

    // If activating, we must archive others first (Batch Logic)
    if (budgetData.status === "active") {
      const budgetsQuery = query(
        collection(db, "department_budgets"),
        where("department", "==", existingBudget.department)
      );
      const snapshot = await getDocs(budgetsQuery);

      const archivePromises = snapshot.docs
        .filter((d) => d.id !== existingBudget.id)
        .map((d) =>
          updateDoc(doc(db, "department_budgets", d.id), {
            status: "archived",
            lastUpdatedAt: serverTimestamp(),
            updatedBy: user.uid,
          })
        );

      await Promise.all(archivePromises);
    }

    await updateDoc(budgetRef, {
      ...budgetData,
      lastUpdatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  },

  async deleteBudget(budgetId) {
    await deleteDoc(doc(db, "department_budgets", budgetId));
  },

  async activateBudget(budgetToActivate, user) {
    // Re-using the update logic essentially, but specific for the 'Activate' button
    // This handles the batch archiving of other budgets
    const budgetsQuery = query(
      collection(db, "department_budgets"),
      where("department", "==", budgetToActivate.department)
    );
    const snapshot = await getDocs(budgetsQuery);

    const batchPromises = [];
    snapshot.forEach((docSnapshot) => {
      const ref = doc(db, "department_budgets", docSnapshot.id);

      if (docSnapshot.id === budgetToActivate.id) {
        batchPromises.push(
          updateDoc(ref, {
            status: "active",
            lastUpdatedAt: serverTimestamp(),
            updatedBy: user.uid,
          })
        );
      } else if (docSnapshot.data().status === "active") {
        batchPromises.push(
          updateDoc(ref, {
            status: "archived",
            lastUpdatedAt: serverTimestamp(),
            updatedBy: user.uid,
          })
        );
      }
    });

    await Promise.all(batchPromises);
  },

  // ==========================================
  // 4. PURCHASE INTENTS
  // ==========================================

  async createIntent(intentData, department, fiscalYear, user) {
    const payload = {
      ...intentData,
      department,
      fiscalYear,
      status: "submitted",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      currentApprover: "department_head",
    };
    await addDoc(collection(db, "purchase_intents"), payload);
  },

  async deleteIntent(intentId) {
    await deleteDoc(doc(db, "purchase_intents", intentId));
  },

  // ==========================================
  // 5. PURCHASE ORDERS (THE COMPLEX TRANSACTION)
  // ==========================================

  async createPurchaseOrder(
    orderData,
    department,
    fiscalYear,
    activeBudget,
    user
  ) {
    if (!activeBudget?.id) throw new Error("No active budget found");

    // 1. Prepare Data
    const deptCode = this.getDepartmentCode(department);
    const prefix = department?.toLowerCase() === "dm" ? "ICEM" : "GA";
    const totalAmount = orderData.finalAmount;
    const intentId = orderData.intentId;
    const budgetComponent =
      orderData.budgetComponent || orderData.selectedBudgetComponent;

    // 2. Identify Budget Section
    const section = activeBudget.departmentExpenses?.[budgetComponent]
      ? "departmentExpenses"
      : activeBudget.fixedCosts?.[budgetComponent]
      ? "fixedCosts"
      : activeBudget.csddExpenses?.[budgetComponent]
      ? "csddExpenses"
      : null;

    if (!section)
      throw new Error(`Budget component "${budgetComponent}" not found.`);

    // 3. Run Transaction
    await runTransaction(db, async (transaction) => {
      const budgetRef = doc(db, "department_budgets", activeBudget.id);
      const budgetDoc = await transaction.get(budgetRef);
      if (!budgetDoc.exists()) throw new Error("Budget document not found!");

      // A. Generate PO Number
      const currentCount = budgetDoc.data().poCounter || 0;
      const newCount = currentCount + 1;
      const poNumber = `${prefix}/${fiscalYear}/${deptCode}/${newCount
        .toString()
        .padStart(2, "0")}`;

      // B. Create PO Record
      const poRef = doc(collection(db, "purchase_orders"));
      const orderPayload = {
        ...orderData,
        department,
        fiscalYear,
        poNumber,
        status: "approved",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        purchaseDeptApproved: true,
        approvedAt: serverTimestamp(),
        approvedBy: user.displayName || user.uid,
        totalCost: totalAmount,
      };
      transaction.set(poRef, orderPayload);

      // C. Update Intent
      const intentRef = doc(db, "purchase_intents", intentId);
      transaction.update(intentRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        poCreated: true,
        poNumber,
        updatedAt: serverTimestamp(),
      });

      // D. Update Budget (Money & Counter)
      const updatePayload = {
        poCounter: increment(1),
        "summary.totalSpent": increment(totalAmount),
        lastUpdatedAt: serverTimestamp(),
        updatedBy: user.uid,
        [`${section}.${budgetComponent}.spent`]: increment(totalAmount),
      };
      transaction.update(budgetRef, updatePayload);
    });
  },

  async updatePurchaseOrder(updatedOrder, user) {
    // Permission check logic can be done here or in component
    const orderRef = doc(db, "purchase_orders", updatedOrder.id);
    await updateDoc(orderRef, {
      ...updatedOrder,
      lastUpdatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  },

  // ==========================================
  // 6. ADMIN / PURCHASE SPECIFIC METHODS
  // ==========================================

  /**
   * Listen to ALL budgets (for Purchase/Admin view)
   */
  subscribeToAllBudgets(onUpdate) {
    const q = query(
      collection(db, "department_budgets"),
      orderBy("fiscalYear", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const budgets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(budgets);
    });
  },

  subscribeToAllIntents(fiscalYear, onUpdate) {
    const q = query(
      collection(db, "purchase_intents"),
      where("fiscalYear", "==", fiscalYear),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const intents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(intents);
    });
  },

  subscribeToAllOrders(fiscalYear, onUpdate) {
    const q = query(
      collection(db, "purchase_orders"),
      where("fiscalYear", "==", fiscalYear),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(orders);
    });
  },

  async approveIntent(intentId, userId, notes = "") {
    await updateDoc(doc(db, "purchase_intents", intentId), {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: userId,
      approvalNotes: notes,
    });
  },

  async approveOrder(orderId, userId) {
    await updateDoc(doc(db, "purchase_orders", orderId), {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: userId,
    });
  },

  /**
   * The Complex "Create PO from Intent" Logic
   * Finds the correct budget automatically based on the Intent's department
   */
  async createPurchaseOrderFromIntent(orderData, currentFiscalYear, user) {
    const intentId = orderData.intentId;
    if (!intentId) throw new Error("No intent ID provided");

    await runTransaction(db, async (transaction) => {
      // 1. Get Intent
      const intentRef = doc(db, "purchase_intents", intentId);
      const intentDoc = await transaction.get(intentRef);
      if (!intentDoc.exists()) throw new Error("Purchase intent not found");

      const intent = intentDoc.data();
      const department = intent.department;
      if (!department)
        throw new Error("No department found in purchase intent");

      // 2. Find Active Budget for that Department
      const budgetsQuery = query(
        collection(db, "department_budgets"),
        where("department", "==", department),
        where("status", "==", "active")
      );
      const budgetsSnapshot = await getDocs(budgetsQuery);
      if (budgetsSnapshot.empty)
        throw new Error(`No active budget found for ${department}`);

      const targetBudget = budgetsSnapshot.docs[0];
      const targetBudgetRef = doc(db, "department_budgets", targetBudget.id);

      // 3. Generate PO Number
      // (Reusing logic: In a real app, extract generatePurchaseOrderNumber to a shared helper)
      const deptCode = this.getDepartmentCode(department);
      const prefix = department?.toLowerCase() === "dm" ? "ICEM" : "GA";
      const currentCount = targetBudget.data().poCounter || 0;
      const newCount = currentCount + 1;
      const poNumber = `${prefix}/${currentFiscalYear}/${deptCode}/${newCount
        .toString()
        .padStart(2, "0")}`;

      // 4. Create PO
      const totalAmount = orderData.finalAmount;
      const poRef = doc(collection(db, "purchase_orders"));
      const orderPayload = {
        ...orderData,
        department,
        fiscalYear: currentFiscalYear,
        poNumber,
        status: "approved",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        purchaseDeptApproved: true,
        approvedAt: serverTimestamp(),
        approvedBy: user.displayName || user.uid,
        totalCost: totalAmount,
      };
      transaction.set(poRef, orderPayload);

      // 5. Update Intent
      transaction.update(intentRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        poCreated: true,
        poNumber,
        updatedAt: serverTimestamp(),
      });

      // 6. Update Budget
      const budgetComponent =
        orderData.budgetComponent || intent.budgetComponent;
      const budgetData = targetBudget.data();

      const section = budgetData.departmentExpenses?.[budgetComponent]
        ? "departmentExpenses"
        : budgetData.fixedCosts?.[budgetComponent]
        ? "fixedCosts"
        : budgetData.csddExpenses?.[budgetComponent]
        ? "csddExpenses"
        : null;

      const updatePayload = {
        poCounter: increment(1),
        "summary.totalSpent": increment(totalAmount),
        lastUpdatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (section) {
        updatePayload[`${section}.${budgetComponent}.spent`] =
          increment(totalAmount);
      }

      transaction.update(targetBudgetRef, updatePayload);
    });
  },

  /**
   * Bulk Expense Recording (Transaction)
   */
  async recordBulkExpenses(expenseData, fiscalYear) {
    await runTransaction(db, async (transaction) => {
      const docsToUpdate = [];

      // Read Phase
      for (const entry of expenseData.entries) {
        const dept = entry.department.toLowerCase();
        const amount = Number(entry.amount) || 0;
        if (amount <= 0) continue;

        const budgetId = `${dept}_FY-20${fiscalYear}`;
        const budgetRef = doc(db, "department_budgets", budgetId);
        const snap = await transaction.get(budgetRef);

        if (snap.exists()) {
          docsToUpdate.push({ budgetRef, amount });
        }
      }

      // Write Phase
      for (const { budgetRef, amount } of docsToUpdate) {
        const { expenseSection, expenseType, createdBy } = expenseData;
        const fieldPath =
          expenseSection === "fixedCosts"
            ? `fixedCosts.${expenseType}.spent`
            : `departmentExpenses.${expenseType}.spent`;

        transaction.update(budgetRef, {
          [fieldPath]: increment(amount),
          "summary.totalSpent": increment(amount),
          lastUpdatedAt: serverTimestamp(),
          updatedBy: createdBy,
        });
      }
    });
  },
};
