// Utility functions for formatting salary and stipend values consistently across the application

/**
 * Formats salary value for display
 * Converts raw number (e.g., 500000) to LPA format (e.g., "5 LPA")
 * @param {number|string} salary - Raw salary value
 * @returns {string} Formatted salary string
 */
export const formatSalary = (salary) => {
  if (!salary || salary === 0) return "-";

  const numSalary = typeof salary === 'string' ? parseFloat(salary) : salary;
  if (isNaN(numSalary)) return "-";

  // Convert to LPA (divide by 100000)
  const lpaValue = numSalary / 100000;

  // Format to appropriate decimal places
  let formattedValue;
  if (lpaValue % 1 === 0) {
    formattedValue = lpaValue.toString();
  } else {
    // Show up to 2 decimal places, removing trailing zeros
    formattedValue = parseFloat(lpaValue.toFixed(2)).toString();
  }

  return `${formattedValue} LPA`;
};

/**
 * Formats stipend value for display
 * Converts raw number (e.g., 25000) to formatted currency (e.g., "₹25,000/month")
 * @param {number|string} stipend - Raw stipend value
 * @returns {string} Formatted stipend string
 */
export const formatStipend = (stipend) => {
  if (!stipend || stipend === 0) return "-";

  const numStipend = typeof stipend === 'string' ? parseFloat(stipend) : stipend;
  if (isNaN(numStipend)) return "-";

  // Format with Indian number system (commas)
  const formattedAmount = numStipend.toLocaleString('en-IN');

  return `₹${formattedAmount}/month`;
};

/**
 * Parses salary input from user (accepts salary in rupees)
 * @param {string} input - User input (e.g., "500000")
 * @returns {number} Parsed salary value in rupees
 */
export const parseSalaryInput = (input) => {
  if (!input || input.trim() === '') return null;

  // Remove commas and parse
  const cleaned = input.replace(/,/g, '');
  const numValue = parseFloat(cleaned);

  return isNaN(numValue) ? null : numValue;
};

/**
 * Parses stipend input from user
 * @param {string} input - User input (e.g., "25000" or "25,000")
 * @returns {number} Parsed stipend value
 */
export const parseStipendInput = (input) => {
  if (!input || input.trim() === '') return null;

  // Remove commas and parse
  const cleaned = input.replace(/,/g, '');
  const numValue = parseFloat(cleaned);

  return isNaN(numValue) ? null : numValue;
};

/**
 * Formats salary for storage in database (always in rupees)
 * @param {string|number} salary - Salary value (could be LPA or rupees)
 * @returns {number|null} Salary in rupees
 */
export const normalizeSalaryForStorage = (salary) => {
  if (!salary) return null;
  return parseSalaryInput(salary.toString());
};

/**
 * Formats stipend for storage in database (always in rupees)
 * @param {string|number} stipend - Stipend value
 * @returns {number|null} Stipend in rupees
 */
export const normalizeStipendForStorage = (stipend) => {
  if (!stipend) return null;
  return parseStipendInput(stipend.toString());
};