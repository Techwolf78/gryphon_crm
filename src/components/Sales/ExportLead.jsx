import { useState, useEffect, useRef } from "react";
import {
  FiDownload,
  FiChevronDown,
  FiFilter,
  FiDatabase,
  FiInfo, // <-- Add this
} from "react-icons/fi";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const ExportLead = ({ filteredLeads, allLeads }) => {
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

  // Helper to get latest follow-up string (date + remarks)
  const getLatestFollowUp = (followupObj) => {
    if (!followupObj || typeof followupObj !== "object") return "";

    const followupsArray = Object.values(followupObj);
    if (followupsArray.length === 0) return "";

    followupsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const latest = followupsArray[0];

    return `${latest.formattedDate || latest.date || ""} - ${
      latest.remarks || ""
    }`;
  };

  const parseDate = (date) => {
    if (!date) return "";
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch {
      return "";
    }
  };

  // Filter out leads with phase = closed
  const filterOutClosed = (leads) =>
    leads.filter((item) => {
      const lead = Array.isArray(item) ? item[1] : item;
      return lead.phase && lead.phase.toLowerCase() !== "closed";
    });

  // Group leads by phase and shape data
  const groupByPhase = (leads) => {
    const result = { hot: [], warm: [], cold: [] };
    leads.forEach((item) => {
      const lead = Array.isArray(item) ? item[1] : item;
      if (!lead || !lead.phase) return;

      const phase = lead.phase.toLowerCase();
      if (["hot", "warm", "cold"].includes(phase)) {
        result[phase].push({
          "College Name": lead.businessName || "",
          City: lead.city || "",
          "Contact Name": lead.pocName || "",
          "Phone No.": lead.phoneNo || "",
          "Email ID": lead.email || "",
          TCV: lead.tcv || "",
          "Opened Date": parseDate(lead.createdAt),
          "Expected Closure": parseDate(lead.expectedClosureDate),
          "Follow-Ups": getLatestFollowUp(lead.followup),
          "Assigned To": lead.assignedTo?.name || "",
        });
      }
    });
    return result;
  };

  const handleExport = (option) => {
    const leadsToExport =
      option === "all"
        ? filterOutClosed(allLeads || [])
        : filterOutClosed(filteredLeads || []);
    const grouped = groupByPhase(leadsToExport);

    const wb = XLSX.utils.book_new();

    const phaseColors = {
      hot: "FFFFCCCC", // Light Red
      warm: "FFFFFFCC", // Light Yellow
      cold: "CCECFF", // Light Blue
    };

    Object.entries(grouped).forEach(([phase, data]) => {
      if (data.length === 0) return;

      const headers = Object.keys(data[0]);
      const sheetData = [
        headers,
        ...data.map((obj) => headers.map((h) => obj[h])),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths to 20 chars wide
      ws["!cols"] = headers.map(() => ({ wch: 20 }));

      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];

          if (cell) {
            if (R === 0) {
              // Header styling
              cell.s = {
                fill: {
                  fgColor: { rgb: phaseColors[phase] },
                },
                font: {
                  bold: true,
                  color: { rgb: "000000" },
                },
                alignment: {
                  horizontal: "center",
                  vertical: "center",
                },
                border: {
                  top: { style: "thin", color: { rgb: "000000" } },
                  bottom: { style: "thin", color: { rgb: "000000" } },
                  left: { style: "thin", color: { rgb: "000000" } },
                  right: { style: "thin", color: { rgb: "000000" } },
                },
              };
            } else {
              // Alternating row color & borders for data cells
              const isEven = R % 2 === 0;
              cell.s = {
                fill: {
                  fgColor: { rgb: isEven ? "F9F9F9" : "FFFFFF" },
                },
                border: {
                  top: { style: "thin", color: { rgb: "CCCCCC" } },
                  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                  left: { style: "thin", color: { rgb: "CCCCCC" } },
                  right: { style: "thin", color: { rgb: "CCCCCC" } },
                },
                alignment: {
                  horizontal: "left",
                  vertical: "center",
                },
              };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        `${phase[0].toUpperCase()}${phase.slice(1)} Leads`
      );
    });

    const fileName =
      option === "all"
        ? "All Leads.xlsx"
        : Object.keys(grouped)
            .filter((key) => grouped[key].length > 0)
            .map((key) => `${key[0].toUpperCase()}${key.slice(1)} Leads`)
            .join(" & ") + ".xlsx";

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setMenuOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center justify-center px-2 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out hover:shadow-md"
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
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 divide-y divide-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Export Options
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={() => handleExport("section")}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiFilter className="w-4 h-4 mr-3 text-blue-500" />
              Current View
              <span className="ml-auto text-xs text-gray-400">Filtered</span>
            </button>
            <button
              onClick={() => handleExport("all")}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiDatabase className="w-4 h-4 mr-3 text-blue-500" />
              All Leads
              <span className="ml-auto text-xs text-gray-400">Complete</span>
            </button>
          </div>
          <div className="px-2 py-1 bg-gray-50 text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
            <FiInfo className="w-3 h-3 text-blue-400" />
            Exports as Excel with formatted sheets
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportLead;
