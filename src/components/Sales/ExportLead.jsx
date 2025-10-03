import { useState, useEffect, useRef } from "react";
import {
  FiDownload,
  FiChevronDown,
  FiFilter,
  FiDatabase,
  FiInfo,
} from "react-icons/fi";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const ExportLead = ({ filteredLeads, allLeads }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const getAllFollowUps = (followupObj) => {
    if (!followupObj || typeof followupObj !== "object") return "";

    const followupsArray = Object.values(followupObj);
    if (followupsArray.length === 0) return "";

    followupsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return followupsArray
      .map((followup, index) => {
        let dateStr = "";
        try {
          const date = followup.date?.seconds
            ? new Date(followup.date.seconds * 1000)
            : new Date(followup.date || followup.formattedDate);
          dateStr = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          dateStr = followup.formattedDate || followup.date || "";
        }

        return `${index + 1}. ${dateStr} - ${followup.remarks || ""}`;
      })
      .join(String.fromCharCode(10));
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

  const formatCourseDetails = (courses) => {
    if (!courses || !Array.isArray(courses)) return [];

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const currentAcademicYear = `${currentYear}-${nextYear}`;

    return courses.map((course) => {
      const courseType = course.courseType || course.manualCourseType || "";
      const specializations = course.specializations?.join(", ") || "";
      const passingYear = course.passingYear || "";
      const yearOfStudy = course.year || ""; // "2nd", "3rd", etc.

      // Format passing year information
      let passingYearDisplay = passingYear;
      if (passingYear) {
        passingYearDisplay = `${passingYear} (Current: ${currentAcademicYear})`;
        if (yearOfStudy) {
          passingYearDisplay += `, ${yearOfStudy} Year`;
        }
      }

      const studentCount = course.studentCount || "";
      const perStudentCost = course.perStudentCost || "";
      const courseTCV = course.courseTCV || 0;

      return {
        courseType,
        specializations,
        passingYear: passingYearDisplay,
        studentCount,
        perStudentCost,
        courseTCV,
        yearOfStudy, // Added as separate field if you want it in export
      };
    });
  };

  const filterOutClosed = (leads) =>
    leads.filter((item) => {
      const lead = Array.isArray(item) ? item[1] : item;
      return lead.phase && lead.phase.toLowerCase() !== "closed";
    });

  const groupByPhase = (leads) => {
    const result = { hot: [], warm: [], cold: [] };
    leads.forEach((item) => {
      const lead = Array.isArray(item) ? item[1] : item;
      if (!lead || !lead.phase) return;

      const phase = lead.phase.toLowerCase();
      if (["hot", "warm", "cold"].includes(phase)) {
        const courseDetails = formatCourseDetails(lead.courses);

        // Create base lead info with fixed columns first
        const leadInfo = {
          "College Name": lead.businessName || "",
          Address: lead.address || "",
          State: lead.state || "",
          City: lead.city || "",
          "Contact Name": lead.pocName || "",
          "Phone No.": lead.phoneNo || "",
          "Email ID": lead.email || "",
        };

        courseDetails.forEach((course, index) => {
          const prefix = `Course ${index + 1}`;
          leadInfo[`${prefix} - Type`] = course.courseType;
          leadInfo[`${prefix} - Specializations`] = course.specializations;
          leadInfo[`${prefix} - Passing Year`] = course.passingYear;
          leadInfo[`${prefix} - Year of Study`] = course.yearOfStudy; // Added this line
          leadInfo[`${prefix} - Student Count`] = course.studentCount;
          leadInfo[`${prefix} - Per Student Cost`] = course.perStudentCost;
          leadInfo[`${prefix} - Course TCV`] = course.courseTCV;
        });

        // Add accreditation and affiliation after course details
        leadInfo["Accreditation"] = lead.accreditation || "";
        leadInfo["Affiliation"] = lead.affiliation || "";

        // Add remaining fields
        leadInfo["Contact Method"] = lead.contactMethod || "";
        leadInfo["Total TCV"] = lead.tcv || "";
        leadInfo["Expected Closure"] = parseDate(lead.expectedClosureDate);
        leadInfo["Meetings"] = getAllFollowUps(lead.followup);
        
        // ✅ NEW: Add "Assigned To" column at the end
        leadInfo["Assigned To"] = lead.assignedTo?.name || "";

        result[phase].push(leadInfo);
      }
    });
    return result;
  };

  const handleExport = (option) => {
    const leadsToExport =
      option === "all"
        ? filterOutClosed(allLeads || [])  // ✅ Keep filtering out closed leads for "All Leads"
        : filterOutClosed(filteredLeads || []); // ✅ Filter for "Current View"
    
    // Check if there are any leads to export
    if (!leadsToExport || leadsToExport.length === 0) {
      alert("No leads available to export. Please check your data.");
      setMenuOpen(false);
      return;
    }

    const grouped = groupByPhase(leadsToExport); // ✅ Use existing function for both options

    // Check if any phase has data
    const hasData = Object.values(grouped).some(phaseData => phaseData.length > 0);
    if (!hasData) {
      alert("No leads found in Hot, Warm, or Cold phases. Only open leads can be exported.");
      setMenuOpen(false);
      return;
    }

    const wb = XLSX.utils.book_new();

    const phaseColors = {
      hot: "FFFFCCCC",
      warm: "FFFFFFCC",
      cold: "CCECFF",
    };

    let sheetsAdded = 0;

    Object.entries(grouped).forEach(([phase, data]) => {
      if (data.length === 0) return; // Skip empty phases

      const headers = Object.keys(data[0]);
      const sheetData = [
        headers,
        ...data.map((obj) => headers.map((h) => obj[h])),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws["!cols"] = headers.map((header) => {
        if (header.includes("Address") || header.includes("Meetings")) {
          return { wch: 30 };
        }
        if (header.includes("College Name") || header.includes("Affiliation")) {
          return { wch: 25 };
        }
        if (header.includes("Specializations")) {
          return { wch: 20 };
        }
        if (header.includes("Type") || header.includes("Course")) {
          return { wch: 15 };
        }
        // ✅ NEW: Set width for "Assigned To" column
        if (header === "Assigned To") {
          return { wch: 18 };
        }
        return { wch: 12 };
      });

      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];

          if (cell) {
            if (R === 0) {
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
              const isEven = R % 2 === 0;
              const isFollowUpCell = headers[C] === "Meetings";
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
                  vertical: "top",
                  wrapText: true,
                },
                ...(isFollowUpCell && {
                  font: {
                    sz: 10,
                  },
                }),
                ...((headers[C].includes("TCV") ||
                  headers[C].includes("Per Student Cost")) && {
                  numFmt: '"₹"#,##0.00',
                }),
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
      
      sheetsAdded++;
    });

    // Final check before writing - this should never happen now, but just in case
    if (sheetsAdded === 0) {
      alert("No valid data found to export.");
      setMenuOpen(false);
      return;
    }

    const fileName =
      option === "all"
        ? "All_Leads.xlsx"
        : Object.keys(grouped)
            .filter((key) => grouped[key].length > 0)
            .map((key) => `${key[0].toUpperCase()}${key.slice(1)}_Leads`)
            .join("_") + ".xlsx";

    try {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
    } catch (error) {

      alert("Export failed. Please try again or contact support.");
    }

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
