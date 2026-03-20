// Shared constants used across the application

// Industry options for companies and follow-ups
export const INDUSTRY_OPTIONS = [
  // original broad categories
  "IT Services", "Software Development", "Consulting", "Manufacturing",
  "Healthcare", "Education", "Finance", "Retail", "Real Estate",
  "Construction", "Automotive", "Telecommunications", "Energy",
  "Transportation", "Agriculture", "Media & Entertainment",
  // banking & finance sub‑domains
  "Banking", "Financial Services & Insurance (BFSI)", "Retail Banking",
  "Corporate Banking", "Investment Banking", "Insurance",
  "NBFC (Non-Banking Financial Companies)",
  "Investment Banking & Capital Markets", "Mergers & Acquisitions (M&A)",
  "Equity Research", "Debt Capital Markets", "Financial Valuation",
  "Corporate Finance", "Budgeting", "Financial Planning & Analysis (FP&A)",
  "Treasury Management", "Cost Accounting / Costing",
  "Consulting (Financial & Strategy)", "Financial Advisory", "Risk Consulting",
  "Transaction Advisory", "FinTech", "Digital Payments",
  "Lending Platforms", "WealthTech", "Private Equity & Venture Capital",
  "Startup Funding", "Growth Capital", "Asset & Wealth Management",
  "Mutual Funds", "Portfolio Management", "Investment Advisory",
  "Accounting & Audit", "Statutory Audit", "Internal Audit", "Taxation",
  "Credit Rating Agencies", "Credit Rating & Risk Assessment",
  "Stock Broking & Trading", "Equity Trading", "Commodity Trading",
  "Forex Trading", "Insurance & Actuarial Services", "Life Insurance",
  "General Insurance", "Reinsurance", "Actuarial Science",
  "Real Estate Finance", "Project Finance", "Mortgage Lending",
  "Government & Regulatory Bodies", "Monetary Policy",
  "Financial Regulation", "Financial Compliance",
  // newly added domains
  "Marketing", "FMCG Marketing", "Retail Marketing", "Real Estate Marketing",
  "E-commerce Marketing", "Ed-tech Marketing", "Finance (General)",
  "BFSI Finance", "Consulting Finance", "FinTech Finance",
  "Accounting Finance", "Audit & Risk", "Human Resources (HR)",
  "Operations", "Logistics", "Supply Chain",
  "Other"
];

// Remarks templates for placement follow-ups
export const REMARKS_TEMPLATES = [
  { value: "Call Connected", label: "Call Connected" },
  { value: "Invite mail sent", label: "Invite mail sent" },
  { value: "Call Disconnected", label: "Call Disconnected" },
  { value: "Switched off", label: "Switched off" },
  { value: "Busy", label: "Busy" },
  { value: "Didn't pick", label: "Didn't pick" },
  { value: "Not Hiring", label: "Not Hiring" },
  { value: "Invalid Number", label: "Invalid Number" }
];

// Designation options for consistency
export const DESIGNATION_OPTIONS = [
  "CEO/Founder", "CTO/Technical Head", "HR Manager", "Recruitment Manager",
  "Talent Acquisition Lead", "Business Development Manager", "Sales Manager",
  "Operations Manager", "Project Manager", "Team Lead", "Senior Developer",
  "Developer", "Intern", "Other"
];

// Status options for leads
export const STATUS_OPTIONS = [
  "Hot",
  "Warm",
  "Cold",
  "Called",
  "Onboarded",
];