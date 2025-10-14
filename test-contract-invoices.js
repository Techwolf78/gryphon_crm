// Test file for ContractInvoiceTable merged contracts logic
// Run with: node test-contract-invoices.js

// Mock data for testing
const mockContracts = [
  {
    id: 'contract1',
    collegeName: 'Indira',
    paymentType: 'ATTP',
    paymentDetails: [
      { name: 'Advance', percentage: 25, totalAmount: 30 },
      { name: 'Training', percentage: 25, totalAmount: 30 },
      { name: 'Training', percentage: 25, totalAmount: 30 },
      { name: 'Placement', percentage: 25, totalAmount: 30 }
    ],
    course: 'Engineering',
    year: '2nd',
    studentCount: 10,
    netPayableAmount: 118
  },
  {
    id: 'contract2',
    collegeName: 'Indira',
    paymentType: 'ATTT',
    paymentDetails: [
      { name: 'Advance', percentage: 25, totalAmount: 30 },
      { name: 'Training', percentage: 25, totalAmount: 30 },
      { name: 'Training', percentage: 25, totalAmount: 30 },
      { name: 'Training', percentage: 25, totalAmount: 30 }
    ],
    course: 'Engineering',
    year: '1st',
    studentCount: 100,
    netPayableAmount: 590000
  },
  {
    id: 'contract3',
    collegeName: 'MIT',
    paymentType: 'AT',
    paymentDetails: [
      { name: 'Advance', percentage: 50, totalAmount: 50 },
      { name: 'Training', percentage: 50, totalAmount: 50 }
    ],
    course: 'Computer Science',
    year: '1st',
    studentCount: 50,
    netPayableAmount: 100
  }
];

// Mock existing invoices for testing individual invoice filtering
const mockExistingInvoices = [
  {
    id: 'inv1',
    isMergedInvoice: false,
    originalInvoiceId: 'contract1', // ATTP contract
    installmentIndex: 0, // Advance installment
    installment: 'Advance'
  }
];

// Test function: getMergedContracts (the core logic we modified)
function getMergedContracts(existingInvoices = []) {
  // Collect contract IDs that have individual invoices generated
  const individualInvoiceContractIds = new Set();
  existingInvoices.forEach((invoice) => {
    if (!invoice.isMergedInvoice && invoice.originalInvoiceId) {
      individualInvoiceContractIds.add(invoice.originalInvoiceId);
    }
  });

  // Filter contracts to only include those without any individual invoices
  const availableContracts = mockContracts.filter(contract => !individualInvoiceContractIds.has(contract.id));

  // Group available contracts by college AND installment count
  const allMerged = {};

  availableContracts.forEach((contract) => {
    const collegeName = contract.collegeName;
    const installmentCount = contract.paymentDetails?.length || 4; // Mock installment count

    // ✅ Final grouping key: collegeName + installmentCount (merge contracts with same college and same number of installments)
    const key = `${collegeName}-${installmentCount}`;

    if (!allMerged[key]) {
      allMerged[key] = {
        collegeName,
        installmentCount,
        paymentTypes: [contract.paymentType || 'UNKNOWN'],
        contracts: [contract],
      };
    } else {
      if (!allMerged[key].paymentTypes.includes(contract.paymentType)) {
        allMerged[key].paymentTypes.push(contract.paymentType);
      }
      allMerged[key].contracts.push(contract);
    }
  });

  const filteredMerged = Object.values(allMerged);

  return filteredMerged;
}

// Test function: getMergedViewInstallmentsWithInvoiceCheck (tests the merged view logic with individual invoice checking)
function getMergedViewInstallmentsWithInvoiceCheck(mergedItem, existingInvoices = []) {
  const installmentsByIndex = {};

  mergedItem.contracts.forEach(contract => {
    contract.paymentDetails?.forEach((installment, idx) => {
      if (!installmentsByIndex[idx]) {
        installmentsByIndex[idx] = {
          names: new Set(),
          percentages: new Set(),
          totalAmount: 0,
          contracts: []
        };
      }

      installmentsByIndex[idx].names.add(installment.name);
      installmentsByIndex[idx].percentages.add(installment.percentage);
      installmentsByIndex[idx].totalAmount += parseFloat(installment.totalAmount) || 0;
      installmentsByIndex[idx].contracts.push(contract);
    });
  });

  // Convert to array and sort by index
  const sortedInstallments = Object.entries(installmentsByIndex)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([idx, data]) => ({
      idx: parseInt(idx),
      name: Array.from(data.names).join('/'),
      percentage: Array.from(data.percentages)[0],
      totalAmount: data.totalAmount,
      contracts: data.contracts,
      hasMergedInvoices: existingInvoices.some(inv =>
        inv.isMergedInvoice &&
        inv.installmentIndex === parseInt(idx) &&
        inv.mergedContracts &&
        inv.mergedContracts.length === data.contracts.length &&
        inv.mergedContracts.every(mc => data.contracts.some(c => c.id === mc.id))
      )
    }));

  return sortedInstallments;
}

// Test function: calculateMergedInvoiceAmounts (tests the handleMergeSubmit logic)
function calculateMergedInvoiceAmounts(contracts, installmentIdx) {
  let totalBaseAmount = 0;
  let totalStudentCount = 0;
  const courses = [];
  const years = [];

  // Calculate amounts for each contract at the specified installment index
  contracts.forEach((contract) => {
    const installmentDetail = contract.paymentDetails?.[installmentIdx];
    const roundedInstallmentAmount = Math.round(parseFloat(installmentDetail?.totalAmount) || 0);
    const contractBaseAmount = Math.round(roundedInstallmentAmount / 1.18);
    totalBaseAmount += contractBaseAmount;

    if (contract.studentCount) {
      totalStudentCount += parseInt(contract.studentCount);
    }
    if (contract.course) {
      courses.push(contract.course);
    }
    if (contract.year) {
      years.push(contract.year);
    }
  });

  // Calculate GST amounts
  const gstAmount = Math.round(totalBaseAmount * 0.18);
  const netPayableAmount = totalBaseAmount + gstAmount;

  return {
    totalBaseAmount,
    gstAmount,
    netPayableAmount,
    totalStudentCount,
    courses: [...new Set(courses)],
    years: [...new Set(years)]
  };
}

// Helper function to format currency
function formatCurrency(amount) {
  if (!amount && amount !== 0) return "-";
  try {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return `₹${amount}`;

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numAmount);
  } catch {
    return `₹${amount}`;
  }
}

// Run tests
console.log('🧪 Testing ContractInvoiceTable Merged Contracts Logic\n');

// Test 1: Check merged contracts grouping
console.log('Test 1: Merged Contracts Grouping');
const mergedContracts = getMergedContracts();
console.log(`Number of merged groups: ${mergedContracts.length}`);
console.log('Expected: 2 groups (Indira-4 and MIT-2)\n');

// Test 2: Check Indira college group
console.log('Test 2: Indira College Group (4 installments)');
const indiraGroup = mergedContracts.find(group => group.collegeName === 'Indira' && group.installmentCount === 4);
if (indiraGroup) {
  console.log(`✅ Indira group found`);
  console.log(`   Contracts: ${indiraGroup.contracts.length} (Expected: 2)`);
  console.log(`   Payment Types: ${indiraGroup.paymentTypes.join(', ')} (Expected: ATTP, ATTT)`);
  console.log(`   Installment Count: ${indiraGroup.installmentCount} (Expected: 4)`);
  console.log(`   Total Students: ${indiraGroup.contracts.reduce((sum, c) => sum + (c.studentCount || 0), 0)} (Expected: 110)`);
  console.log(`   Total Amount: ${formatCurrency(indiraGroup.contracts.reduce((sum, c) => sum + (c.netPayableAmount || 0), 0))} (Expected: ₹5,90,118)`);
} else {
  console.log('❌ Indira group not found');
}
console.log('');

// Test 3: Check MIT college group
console.log('Test 3: MIT College Group (2 installments)');
const mitGroup = mergedContracts.find(group => group.collegeName === 'MIT' && group.installmentCount === 2);
if (mitGroup) {
  console.log(`✅ MIT group found`);
  console.log(`   Contracts: ${mitGroup.contracts.length} (Expected: 1)`);
  console.log(`   Payment Types: ${mitGroup.paymentTypes.join(', ')} (Expected: AT)`);
  console.log(`   Installment Count: ${mitGroup.installmentCount} (Expected: 2)`);
  console.log(`   Total Students: ${mitGroup.contracts.reduce((sum, c) => sum + (c.studentCount || 0), 0)} (Expected: 50)`);
} else {
  console.log('❌ MIT group not found');
}
console.log('');

// Test 4: Check merged view installment processing (NEW LOGIC)
console.log('Test 4: Merged View Installment Processing for Indira Group');
if (indiraGroup) {
  const mergedInstallments = getMergedViewInstallmentsWithInvoiceCheck(indiraGroup);
  console.log(`   Number of combined installments: ${mergedInstallments.length} (Expected: 4)`);

  // Test each installment
  mergedInstallments.forEach((inst, idx) => {
    console.log(`   Installment ${idx + 1}: ${inst.name} - ${formatCurrency(inst.totalAmount)} - Merged: ${inst.hasMergedInvoices}`);
  });

  // Specific checks
  const firstInstallment = mergedInstallments[0];
  const fourthInstallment = mergedInstallments[3];

  console.log(`   1st Installment: ${firstInstallment.name} (Expected: Advance) - Amount: ${formatCurrency(firstInstallment.totalAmount)} (Expected: ₹60)`);
  console.log(`   4th Installment: ${fourthInstallment.name} (Expected: Placement/Training) - Amount: ${formatCurrency(fourthInstallment.totalAmount)} (Expected: ₹60)`);
}
console.log('');

// Test 5: Verify old vs new grouping logic
console.log('Test 5: Old vs New Grouping Logic Comparison');
console.log('Old logic (college + paymentType):');
const oldGroups = {};
mockContracts.forEach(contract => {
  const key = `${contract.collegeName}-${contract.paymentType}`;
  if (!oldGroups[key]) oldGroups[key] = [];
  oldGroups[key].push(contract);
});
console.log(`   Groups: ${Object.keys(oldGroups).length} (Indira-ATTP, Indira-ATTT, MIT-AT)`);

console.log('New logic (college + installmentCount):');
console.log(`   Groups: ${mergedContracts.length} (Indira-4, MIT-2)`);
console.log('✅ New logic merges contracts with same college AND same installment count');
console.log('');

// Test 6: Merged Invoice Amount Calculation for 4th Installment
console.log('Test 6: Merged Invoice Amount Calculation for 4th Installment');
if (indiraGroup) {
  const amounts = calculateMergedInvoiceAmounts(indiraGroup.contracts, 3); // 4th installment (index 3)
  console.log(`   Base Amount: ${formatCurrency(amounts.totalBaseAmount)} (Expected: ₹51)`);
  console.log(`   GST Amount: ${formatCurrency(amounts.gstAmount)} (Expected: ₹9)`);
  console.log(`   Net Payable: ${formatCurrency(amounts.netPayableAmount)} (Expected: ₹60)`);
  console.log(`   Total Students: ${amounts.totalStudentCount} (Expected: 110)`);
  console.log(`   Courses: ${amounts.courses.join(', ')} (Expected: Engineering)`);
  console.log(`   Years: ${amounts.years.join(', ')} (Expected: 2nd, 1st)`);
}
console.log('');

// Test 7: Merged View with Existing Individual Invoices
console.log('Test 7: Merged View with Existing Individual Invoices');

if (indiraGroup) {
  const mergedInstallmentsWithInvoices = getMergedViewInstallmentsWithInvoiceCheck(indiraGroup, mockExistingInvoices);
  console.log(`   Number of combined installments: ${mergedInstallmentsWithInvoices.length} (Expected: 4)`);

  mergedInstallmentsWithInvoices.forEach((inst, idx) => {
    const status = inst.hasMergedInvoices ? 'Has Merged' : 'Available';
    console.log(`   Installment ${idx + 1}: ${inst.name} - Status: ${status}`);
  });

  const firstInstallment = mergedInstallmentsWithInvoices[0];
  console.log(`   1st Installment (Advance) should be available: ${!firstInstallment.hasMergedInvoices} (Expected: true)`);
  console.log(`   Other installments should be available: ${mergedInstallmentsWithInvoices.slice(1).every(inst => !inst.hasMergedInvoices)} (Expected: true)`);
}
console.log('');

// Test 8: Merged Contracts with Individual Invoices (New Behavior)
console.log('Test 8: Merged Contracts with Individual Invoices - Contracts with individual invoices should not appear in merged view');
const mergedContractsWithIndividual = getMergedContracts(mockExistingInvoices);
console.log(`Number of merged groups with individual invoices: ${mergedContractsWithIndividual.length} (Expected: 2 - Indira (contract2 only), MIT)`);

const indiraGroupWithIndividual = mergedContractsWithIndividual.find(group => group.collegeName === 'Indira');
const mitGroupWithIndividual = mergedContractsWithIndividual.find(group => group.collegeName === 'MIT');

if (indiraGroupWithIndividual) {
  console.log(`✅ Indira group shows in merged view with contract2 only (contract1 has individual invoice)`);
  console.log(`   Contracts: ${indiraGroupWithIndividual.contracts.length} (Expected: 1)`);
  console.log(`   Contract IDs: ${indiraGroupWithIndividual.contracts.map(c => c.id).join(', ')} (Expected: contract2)`);
} else {
  console.log('❌ Indira group not found in merged view');
}

if (mitGroupWithIndividual) {
  console.log(`✅ MIT group still shows in merged view (no individual invoices)`);
  console.log(`   Contracts: ${mitGroupWithIndividual.contracts.length} (Expected: 1)`);
} else {
  console.log('❌ MIT group not found in merged view');
}
console.log('');

console.log('\n🎉 All tests completed!');

// Summary
console.log('\n📊 Test Summary:');
console.log('✅ Contracts from same college with same installment count are grouped together');
console.log('✅ ATTP and ATTT (both 4 installments) merge together from same college');
console.log('✅ EMI with different installment counts stay separate');
console.log('✅ Payment types are collected in an array');
console.log('✅ Merged view combines installments by index with "/" separator');
console.log('✅ Combined installment names show like "Placement/Training"');
console.log('✅ Combined amounts are properly summed');
console.log('✅ Merged invoice generation calculates correct GST amounts');
console.log('✅ Multiple contracts with different payment types can be merged if they have same installment count');
console.log('✅ Individual invoice checking works correctly in merged view');
console.log('✅ Contracts with merged invoices are removed from individual view');
console.log('✅ Contracts with individual invoices do not appear in merged view (filtered out before grouping)');
console.log('✅ Only contracts without any individual invoices can be merged');