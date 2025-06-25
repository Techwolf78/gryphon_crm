import { CSVLink } from "react-csv";
import { FiDownload } from "react-icons/fi";

const ExportLead = ({ filteredLeads }) => {
  const exportData = filteredLeads.map(([, lead]) => ({
    BusinessName: lead.businessName,
    City: lead.city,
    Phone: lead.phoneNo,
    Email: lead.email,
    Phase: lead.phase,
    AssignedTo: lead.assignedTo?.displayName || "",
    CreatedAt: new Date(lead.createdAt).toLocaleDateString(),
  }));

  return (
    <CSVLink
      data={exportData}
      filename={"leads_export.csv"}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-gradient-to-r from-blue-50 to-white text-blue-700 hover:from-blue-100 hover:to-white hover:shadow-md transition-all"
    >
      <FiDownload className="w-4 h-4" />
      <span>Export</span>
    </CSVLink>
  );
};

export default ExportLead;