import React, { useRef, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaFileExcel, FaFilePdf, FaMapMarkerAlt } from "react-icons/fa";
import { IoIosSchool, IoMdBusiness } from "react-icons/io";
import { MdPayment, MdPeople, MdEmail, MdPhone } from "react-icons/md";
import { RiMoneyDollarCircleLine } from "react-icons/ri";

const PlacementDetailsModal = ({ training, onClose }) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const formatDate = (date) => {
    if (!date) return 'Not specified';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    return amount ? `₹${amount.toLocaleString('en-IN')}` : 'Not specified';
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-54 p-4 animate-fadeIn">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-100 animate-slideUp transform transition-all duration-300"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
              <IoIosSchool className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Placement Program Details
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-blue-100/90 text-sm bg-white/10 px-2 py-0.5 rounded-full">
                  {training?.projectCode || 'No project code'}
                </span>
                <span className="text-blue-100/70 text-xs flex items-center">
                  <FaMapMarkerAlt className="mr-1" />
                  {training?.city || 'Location not specified'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-all p-2 rounded-full hover:bg-white/20 flex items-center justify-center"
            aria-label="Close modal"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(95vh-72px)] p-6 space-y-6">
          {/* 1. Institution Section */}
          <ModernSection
            title="Institution Details"
            icon={<IoMdBusiness className="text-blue-500" />}
            badge={`${training?.collegeCode || 'No Code'}`}
            className="bg-gradient-to-br from-blue-50 to-blue-50/70"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailCard label="College Name" value={training?.collegeName} iconColor="text-blue-400" />
              <DetailCard label="College Code" value={training?.collegeCode} iconColor="text-blue-400" />
              <DetailCard label="GST Number" value={training?.gstNumber} iconColor="text-blue-400" />
              <DetailCard label="Address" value={training?.address} fullWidth iconColor="text-blue-400" />
              <DetailCard label="City" value={training?.city} iconColor="text-blue-400" />
              <DetailCard label="State" value={training?.state} iconColor="text-blue-400" />
              <DetailCard label="Pincode" value={training?.pincode} iconColor="text-blue-400" />
            </div>
          </ModernSection>

          {/* 2. Contacts Section */}
          <ModernSection
            title="Contact Information"
            icon={<MdPeople className="text-purple-500" />}
            className="bg-gradient-to-br from-purple-50 to-purple-50/70"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContactCard
                type="TPO"
                name={training?.tpoName}
                email={training?.tpoEmail}
                phone={training?.tpoPhone}
                color="bg-purple-100"
                iconColor="text-purple-500"
              />
              <ContactCard
                type="Training Coordinator"
                name={training?.trainingName}
                email={training?.trainingEmail}
                phone={training?.trainingPhone}
                color="bg-blue-100"
                iconColor="text-blue-500"
              />
              <ContactCard
                type="Account Contact"
                name={training?.accountName}
                email={training?.accountEmail}
                phone={training?.accountPhone}
                color="bg-amber-100"
                iconColor="text-amber-500"
              />
            </div>
          </ModernSection>

          {/* 3. Program Details */}
          <ModernSection
            title="Program Details"
            icon={<IoIosSchool className="text-green-500" />}
            badge={`${training?.studentCount || '0'} Students`}
            className="bg-gradient-to-br from-green-50 to-green-50/70"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DetailCard label="Course" value={training?.course} iconColor="text-green-400" />
              <DetailCard label="Year" value={training?.year} iconColor="text-green-400" />
              <DetailCard label="Delivery Type" value={training?.deliveryType} iconColor="text-green-400" />
              <DetailCard label="Passing Year" value={training?.passingYear} iconColor="text-green-400" />
              <DetailCard
                label="Course Specializations"
                value={
                  training?.courses?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {training.courses.map((course, index) => (
                        <li key={index} className="text-sm">
                          {course.specialization} ({course.students} students)
                        </li>
                      ))}
                    </ul>
                  ) : 'Not specified'
                }
                fullWidth
                iconColor="text-green-400"
              />
              <DetailCard label="Total Students" value={training?.studentCount} iconColor="text-green-400" />
              <DetailCard label="Total Hours" value={training?.totalHours} iconColor="text-green-400" />
              <DetailCard
                label="Student Data"
                value={training?.studentFileUrl ? "Uploaded" : "Not uploaded"}
                icon={training?.studentFileUrl ?
                  <FaFileExcel className="text-green-500" /> :
                  <FaFileExcel className="text-gray-400" />}
                status={training?.studentFileUrl ? "success" : "neutral"}
              />
            </div>

            {training?.topics?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FaCalendarAlt className="text-amber-500" />
                  Topics Breakdown
                </h4>
                <div className="border rounded-xl overflow-hidden border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Topic</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {training.topics.map((topic, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">{topic.topic || 'N/A'}</td>
                          <td className="px-4 py-3 font-medium">{topic.hours || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </ModernSection>

          {/* 4. Financials */}
          <ModernSection
            title="Financial Information"
            icon={<RiMoneyDollarCircleLine className="text-amber-500" />}
            badge={formatCurrency(training?.totalCost)}
            className="bg-gradient-to-br from-amber-50 to-amber-50/70"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailCard
                label="Total Students"
                value={training?.studentCount}
                iconColor="text-amber-400"
              />
              <DetailCard
                label="Cost per Student"
                value={formatCurrency(training?.perStudentCost)}
                iconColor="text-amber-400"
              />
              <DetailCard
                label="Total Amount"
                value={formatCurrency(training?.totalCost)}
                highlight
                iconColor="text-amber-400"
              />
              <DetailCard
                label="Payment Type"
                value={training?.paymentType}
                iconColor="text-amber-400"
              />
              <DetailCard
                label="Payment Status"
                value={training?.paymentReceived ? "Completed" : "Pending"}
                status={training?.paymentReceived ? "success" : "warning"}
                iconColor="text-amber-400"
              />
            </div>
          </ModernSection>

          {/* 5. Contract */}
          <ModernSection
            title="Contract Details"
            icon={<FaFilePdf className="text-red-500" />}
            badge={training?.mouFileUrl ? "MOU Uploaded" : "No MOU"}
            className="bg-gradient-to-br from-red-50 to-red-50/70"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailCard
                label="MOU Status"
                value={training?.mouFileUrl ? "Uploaded" : "Not uploaded"}
                icon={training?.mouFileUrl ?
                  <FaFilePdf className="text-red-500" /> :
                  <FaFilePdf className="text-gray-400" />}
                status={training?.mouFileUrl ? "success" : "neutral"}
              />
              <DetailCard
                label="Contract Start"
                value={formatDate(training?.contractStartDate)}
                icon={<FaCalendarAlt className="text-gray-400" />}
              />
              <DetailCard
                label="Contract End"
                value={formatDate(training?.contractEndDate)}
                icon={<FaCalendarAlt className="text-gray-400" />}
              />
            </div>
          </ModernSection>
        </div>
      </div>
    </div>
  );
};

// Modern Section Component with enhanced design
const ModernSection = ({ title, icon, children, className = "", badge }) => (
  <div className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${className}`}>
    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center">
        <span className="text-xl mr-3 p-2 rounded-lg bg-white shadow-sm">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {badge && (
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200">
          {badge}
        </span>
      )}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// Enhanced Detail Card with better styling
const DetailCard = ({ label, value, icon, fullWidth = false, highlight = false, status = "neutral", iconColor = "text-gray-400" }) => {
  let statusClasses = "";
  if (status === "success") statusClasses = "text-green-700 bg-green-100/50 border-green-200";
  if (status === "warning") statusClasses = "text-amber-700 bg-amber-100/50 border-amber-200";
  if (status === "neutral") statusClasses = "text-gray-700 bg-gray-100/50 border-gray-200";

  return (
    <div className={`${fullWidth ? "col-span-full" : ""}`}>
      <div className="flex items-start space-x-3">
        {icon ? (
          <span className={`mt-1 ${iconColor}`}>{icon}</span>
        ) : (
          <div className={`w-2 h-2 rounded-full mt-2 ${iconColor} opacity-70`}></div>
        )}
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <div className={`mt-1 text-sm font-medium ${highlight ? "text-blue-600 font-semibold" : "text-gray-800"} 
            ${status && status !== "neutral" ? `${statusClasses} px-3 py-1.5 rounded-lg border text-sm` : ""}`}>
            {value || 'Not specified'}
          </div>
        </div>
      </div>
    </div>
  );
};

// New Contact Card component for better contact display
const ContactCard = ({ type, name, email, phone, color, iconColor }) => (
  <div className={`rounded-lg border border-gray-200 p-4 ${color}/20 backdrop-blur-sm`}>
    <div className="flex items-center space-x-3 mb-3">
      <div className={`p-2 rounded-lg ${color} ${iconColor}`}>
        {type === 'TPO' && <MdPeople size={18} />}
        {type === 'Training Coordinator' && <IoIosSchool size={18} />}
        {type === 'Account Contact' && <MdPayment size={18} />}
      </div>
      <h4 className="font-medium text-gray-800">{type}</h4>
    </div>
    <div className="space-y-2">
      <div className="flex items-center text-sm">
        <span className="text-gray-500 w-20">Name:</span>
        <span className="font-medium">{name || 'Not specified'}</span>
      </div>
      <div className="flex items-center text-sm">
        <span className="text-gray-500 w-20">Email:</span>
        <span className="font-medium">{email || 'Not specified'}</span>
      </div>
      <div className="flex items-center text-sm">
        <span className="text-gray-500 w-20">Phone:</span>
        <span className="font-medium">{phone || 'Not specified'}</span>
      </div>
    </div>
  </div>
);

export default PlacementDetailsModal;