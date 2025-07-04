import { useState, useEffect, useRef } from "react";
import { FiDownload, FiChevronDown, FiFilter, FiDatabase, FiInfo } from "react-icons/fi";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const ExportPlacementData = ({ companies }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const parseDate = (date) => {
    if (!date) return "";
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000);
      }
      return new Date(date);
    } catch {
      return "";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const groupByDate = (companies) => {
    const grouped = {};
    
    companies.forEach((company) => {
      const date = parseDate(company.createdAt);
      const dateKey = date ? formatDate(date) : "No Date";
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push({
        // Company Information
        "Company Name": company.companyName || "",
        "Website": company.companyWebsite || "",
        "College": company.college || "",
        
        // Job Details
        "Job Type": company.jobType || "",
        "Designation": company.jobDesignation || "",
        "Location": company.jobLocation || "",
        "Salary": company.salary ? `${company.salary} LPA` : "",
        "Internship Duration": company.internshipDuration ? `${company.internshipDuration} months` : "",
        "Stipend": company.stipend ? `₹${company.stipend}/month` : "",
        
        // Eligibility Criteria
        "Course": company.course || "",
        "Specialization": company.specialization || "",
        "Passing Year": company.passingYear || "",
        "Marks Criteria": company.marksCriteria || "",
        
        // Status Information
        "Status": company.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1) : "",
        "Created Date": dateKey,
        "Updated At": company.updatedAt ? formatDate(parseDate(company.updatedAt)) : "",
        
        // Other Details
        "Mode of Interview": company.modeOfInterview || "",
        "Joining Period": company.joiningPeriod || "",
        "Mode of Work": company.modeOfWork || "",
        "Job Description": company.jobDescription || ""
      });
    });
    
    // Sort dates in descending order
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === "No Date") return 1;
      if (b === "No Date") return -1;
      return new Date(b) - new Date(a);
    });
    
    const sortedGrouped = {};
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date];
    });
    
    return sortedGrouped;
  };

  const handleExport = () => {
    if (!companies || companies.length === 0) {
      alert("No data to export");
      return;
    }

    const groupedData = groupByDate(companies);
    const wb = XLSX.utils.book_new();

    Object.entries(groupedData).forEach(([date, data]) => {
      if (data.length === 0) return;

      const headers = Object.keys(data[0]);
      const sheetData = [
        headers,
        ...data.map((obj) => headers.map((h) => obj[h])),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws["!cols"] = headers.map((header) => {
        if (["Job Description", "Company Name", "College"].includes(header)) {
          return { wch: 30 };
        }
        if (["Designation", "Specialization", "Location"].includes(header)) {
          return { wch: 25 };
        }
        return { wch: 15 };
      });

      // Apply styles
      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];

          if (cell) {
            if (R === 0) {
              // Header styling
              cell.s = {
                fill: { fgColor: { rgb: "E6E6FA" } }, // Light purple
                font: { bold: true, color: { rgb: "000000" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                  top: { style: "thin", color: { rgb: "000000" } },
                  bottom: { style: "thin", color: { rgb: "000000" } },
                  left: { style: "thin", color: { rgb: "000000" } },
                  right: { style: "thin", color: { rgb: "000000" } },
                },
              };
            } else {
              // Data cell styling
              const isEven = R % 2 === 0;
              const isJobDesc = headers[C] === "Job Description";
              cell.s = {
                fill: { fgColor: { rgb: isEven ? "F9F9F9" : "FFFFFF" } },
                border: {
                  top: { style: "thin", color: { rgb: "CCCCCC" } },
                  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                  left: { style: "thin", color: { rgb: "CCCCCC" } },
                  right: { style: "thin", color: { rgb: "CCCCCC" } },
                },
                alignment: {
                  horizontal: "left",
                  vertical: "top",
                  wrapText: true,
                },
                ...(isJobDesc && { font: { sz: 10 } }),
              };

              // Color code by status
              if (headers[C] === "Status") {
                const status = data[R-1].Status.toLowerCase();
                let color = "";
                if (status.includes("ongoing")) color = "FFA07A"; // Light Salmon
                else if (status.includes("complete")) color = "98FB98"; // Pale Green
                else if (status.includes("cancel")) color = "FF6347"; // Tomato
                else if (status.includes("onhold")) color = "ADD8E6"; // Light Blue
                else if (status.includes("noapplications")) color = "D3D3D3"; // Light Gray
                
                if (color) {
                  cell.s.fill = { fgColor: { rgb: color } };
                }
              }
            }
          }
        }
      }

      const sheetName = date === "No Date" ? "No Date" : date.replace(/\//g, '-');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = `Placement_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setMenuOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center justify-center px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out hover:shadow-md"
      >
        <FiDownload className="w-4 h-4 mr-2" />
        Export Data
        <FiChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${
            menuOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 divide-y divide-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Export Options
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={handleExport}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiDatabase className="w-4 h-4 mr-3 text-blue-500" />
              All Placement Data
            </button>
          </div>
          <div className="px-2 py-1 bg-gray-50 text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
            <FiInfo className="w-3 h-3 text-blue-400" />
            Grouped by creation date
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPlacementData;