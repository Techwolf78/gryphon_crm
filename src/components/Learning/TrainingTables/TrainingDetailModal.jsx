import React, { useRef, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { IoIosSchool, IoMdBusiness } from "react-icons/io";
import { MdPayment, MdPeople, MdEmail, MdPhone } from "react-icons/md";

const TrainingDetailModal = ({ training, onClose }) => {
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
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-100 animate-slideUp"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <IoIosSchool className="text-blue-100" />
              Training Program Details
            </h2>
            <p className="text-blue-100/90 text-sm mt-1">{training?.projectCode || 'No project code'}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/90 hover:text-white transition-all p-1 rounded-full hover:bg-white/10"
            aria-label="Close modal"
          >
            <FaTimes size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(95vh-72px)] p-6 space-y-8">
          {/* 1. Institution Section */}
          <ModernSection 
            title="Institution Details" 
            icon={<IoMdBusiness className="text-blue-500" />}
            className="bg-blue-50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <DetailCard label="College Name" value={training?.collegeName} />
              <DetailCard label="College Code" value={training?.collegeCode} />
              <DetailCard label="GST Number" value={training?.gstNumber} />
              <DetailCard label="Address" value={training?.address} fullWidth />
              <DetailCard label="City" value={training?.city} />
              <DetailCard label="State" value={training?.state} />
              <DetailCard label="Pincode" value={training?.pincode} />
            </div>
          </ModernSection>

          {/* 2. Contacts Section */}
          <ModernSection 
            title="Contact Information" 
            icon={<MdPeople className="text-purple-500" />}
            className="bg-purple-50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <DetailCard 
                label="TPO Name" 
                value={training?.tpoName} 
                icon={<MdPeople className="text-gray-400" />}
              />
              <DetailCard 
                label="TPO Email" 
                value={training?.tpoEmail} 
                icon={<MdEmail className="text-gray-400" />}
              />
              <DetailCard 
                label="TPO Phone" 
                value={training?.tpoPhone} 
                icon={<MdPhone className="text-gray-400" />}
              />
              <DetailCard 
                label="Training Coordinator" 
                value={training?.trainingName} 
              />
              <DetailCard 
                label="Training Email" 
                value={training?.trainingEmail} 
              />
              <DetailCard 
                label="Training Phone" 
                value={training?.trainingPhone} 
              />
              <DetailCard 
                label="Account Contact" 
                value={training?.accountName} 
              />
              <DetailCard 
                label="Account Email" 
                value={training?.accountEmail} 
              />
              <DetailCard 
                label="Account Phone" 
                value={training?.accountPhone} 
              />
            </div>
          </ModernSection>

          {/* 3. Program Details */}
          <ModernSection 
            title="Program Details" 
            icon={<IoIosSchool className="text-green-500" />}
            className="bg-green-50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <DetailCard label="Course" value={training?.course} />
              <DetailCard label="Year" value={training?.year} />
              <DetailCard label="Delivery Type" value={training?.deliveryType} />
              <DetailCard label="Passing Year" value={training?.passingYear} />
              <DetailCard label="Specialization" value={training?.specialization} />
              <DetailCard label="Total Students" value={training?.studentCount} />
              <DetailCard label="Total Hours" value={training?.totalHours} />
              <DetailCard 
                label="Student Data" 
                value={training?.studentFileUrl ? "Uploaded" : "Not uploaded"} 
                icon={training?.studentFileUrl ? 
                  <FaFileExcel className="text-green-500" /> : 
                  <FaFileExcel className="text-gray-400" />}
              />
            </div>

            {training?.topics?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FaCalendarAlt className="text-amber-500" />
                  Topics Breakdown
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Topic</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {training.topics.map((topic, index) => (
                        <tr key={index} className="hover:bg-gray-50">
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
            icon={<MdPayment className="text-amber-500" />}
            className="bg-amber-50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <DetailCard 
                label="Total Students" 
                value={training?.studentCount} 
              />
              <DetailCard 
                label="Cost per Student" 
                value={formatCurrency(training?.perStudentCost)} 
              />
              <DetailCard 
                label="Total Amount" 
                value={formatCurrency(training?.totalCost)} 
                highlight
              />
              <DetailCard 
                label="Payment Type" 
                value={training?.paymentType} 
              />
              <DetailCard 
                label="Payment Status" 
                value={training?.paymentReceived ? "Completed" : "Pending"} 
                status={training?.paymentReceived ? "success" : "warning"}
              />
            </div>
          </ModernSection>

          {/* 5. Contract */}
          <ModernSection 
            title="Contract Details" 
            icon={<FaFilePdf className="text-red-500" />}
            className="bg-red-50/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <DetailCard 
                label="MOU Status" 
                value={training?.mouFileUrl ? "Uploaded" : "Not uploaded"} 
                icon={training?.mouFileUrl ? 
                  <FaFilePdf className="text-red-500" /> : 
                  <FaFilePdf className="text-gray-400" />}
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

// Modern Section Component
const ModernSection = ({ title, icon, children, className = "" }) => (
  <div className={`rounded-xl overflow-hidden border border-gray-200 ${className}`}>
    <div className="px-5 py-4 flex items-center border-b border-gray-200">
      <span className="text-xl mr-2">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// Enhanced Detail Card
const DetailCard = ({ label, value, icon, fullWidth = false, highlight = false, status = "" }) => {
  let statusClasses = "";
  if (status === "success") statusClasses = "text-green-600 bg-green-50";
  if (status === "warning") statusClasses = "text-amber-600 bg-amber-50";
  
  return (
    <div className={`${fullWidth ? "col-span-full" : ""}`}>
      <div className="flex items-start">
        {icon && <span className="mr-2 mt-1">{icon}</span>}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-sm font-medium ${highlight ? "text-blue-600" : "text-gray-800"} ${statusClasses} px-2 py-1 rounded`}>
            {value || 'Not specified'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrainingDetailModal;