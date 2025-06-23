// // FULLY UPDATED TrainingForm COMPONENT USING SEPARATE SECTION COMPONENTS

// import React, { useState, useEffect } from "react";
// import { FaTimes } from "react-icons/fa";

// import CollegeInfoSection from "./sections/CollegeInfoSection";
// import POCInfoSection from "./sections/POCInfoSection";
// import StudentBreakdownSection from "./sections/StudentBreakdownSection";
// import TopicBreakdownSection from "./sections/TopicBreakdownSection";
// import PaymentInfoSection from "./sections/PaymentInfoSection";
// import MOUUploadSection from "./sections/MOUUploadSection";

// const TrainingForm = ({ show, onClose, lead }) => {
//   if (!show || !lead) return null;

//   const [formData, setFormData] = useState({
//     projectCode: "",
//     collegeName: lead?.businessName || "",
//     address: lead?.address || "",
//     city: lead?.city || "",
//     state: lead?.state || "",
//     pincode: "",
//     gstNumber: "",
//     tpoName: "",
//     tpoEmail: "",
//     tpoPhone: "",
//     trainingName: "",
//     trainingEmail: "",
//     trainingPhone: "",
//     accountName: "",
//     accountEmail: "",
//     accountPhone: "",
//     course: "",
//     year: "",
//     courses: [{ specialization: "", students: "" }],
//     topics: [{ topic: "", hours: "" }],
//     paymentType: "",
//     gstType: "include",
//     totalCost: 0,
//     studentCount: 0,
//     perStudentCost: 0,
//     emiMonths: 0,
//     emiSplits: [],
//     invoiceNumber: "",
//     additionalNotes: "",
//     splitTotal: 0
//   });

//   const [studentFile, setStudentFile] = useState(null);
//   const [mouFile, setMouFile] = useState(null);

//   useEffect(() => {
//     const totalStudents = formData.courses.reduce(
//       (sum, item) => sum + (parseInt(item.students) || 0),
//       0
//     );
//     setFormData((prev) => ({
//       ...prev,
//       studentCount: totalStudents,
//       totalCost: totalStudents * (parseFloat(prev.perStudentCost) || 0),
//     }));
//   }, [formData.courses, formData.perStudentCost]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
//       <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
//         <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
//           <h2 className="text-xl font-bold text-gray-800">Client Onboarding Form</h2>
//           <div className="flex items-center space-x-3">
//             <input
//               name="projectCode"
//               value={formData.projectCode}
//               onChange={handleChange}
//               placeholder="Project Code"
//               className="px-3 py-1 border rounded-md"
//             />
//             <button onClick={onClose} className="text-xl text-red-500 hover:text-red-700">
//               <FaTimes />
//             </button>
//           </div>
//         </div>

//         <form className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
//           <CollegeInfoSection formData={formData} setFormData={setFormData} handleChange={handleChange} />

//           <POCInfoSection formData={formData} handleChange={handleChange} />

//           <StudentBreakdownSection formData={formData} setFormData={setFormData} studentFile={studentFile} setStudentFile={setStudentFile} />

//           <TopicBreakdownSection formData={formData} setFormData={setFormData} />

//           <PaymentInfoSection formData={formData} setFormData={setFormData} />

//           <MOUUploadSection mouFile={mouFile} setMouFile={setMouFile} />
//         </form>
//       </div>
//     </div>
//   );
// };

// export default TrainingForm;
// TrainingForm.jsx
import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

import CollegeInfoSection from "./CollegeInfoSection";
import POCInfoSection from "./POCInfoSection";
import StudentBreakdownSection from "./StudentBreakdownSection";
import TopicBreakdownSection from "./TopicBreakdownSection";
import PaymentInfoSection from "./PaymentInfoSection";
import MOUUploadSection from "./MOUUploadSection";

const TrainingForm = ({ show, onClose, lead }) => {
  if (!show || !lead) return null;

  const [formData, setFormData] = useState({
  projectCode: "",
  collegeName: lead?.businessName || "",
  address: lead?.address || "",
  city: lead?.city || "",
  state: lead?.state || "",
  pincode: "",
  gstNumber: "",

  // POC Info
  tpoName: "",
  tpoEmail: "",
  tpoPhone: "",
  trainingName: "",
  trainingEmail: "",
  trainingPhone: "",
  accountName: "",
  accountEmail: "",
  accountPhone: "",

  // Student Info
  course: "",
  year: "",
  studentList: [],
  courses: [{ specialization: "", students: "" }],

  // Topic Info
  topics: [{ topic: "", hours: "" }],

  // Payment Info
  paymentType: "",
  gstType: "include",
  perStudentCost: 0,
  totalCost: 0,
  studentCount: 0,

  // All payment types
  paymentSplits: [],       // For AT, AP, ATT, ATP, etc.
  emiMonths: 0,            // For EMI
  emiSplits: [],           // For EMI

  // Additional Info
  invoiceNumber: "",
  additionalNotes: "",
  splitTotal: 0
});


  const [studentFile, setStudentFile] = useState(null);
  const [mouFile, setMouFile] = useState(null);

  useEffect(() => {
    const totalStudents = formData.courses.reduce(
      (sum, item) => sum + (parseInt(item.students) || 0),
      0
    );
    setFormData((prev) => ({
      ...prev,
      studentCount: totalStudents,
      totalCost: totalStudents * (parseFloat(prev.perStudentCost) || 0),
    }));
  }, [formData.courses, formData.perStudentCost]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-100">
          <h2 className="text-xl font-bold text-gray-800">Client Onboarding Form</h2>
          <div className="flex items-center space-x-3">
            <input
              name="projectCode"
              value={formData.projectCode}
              onChange={handleChange}
              placeholder="Project Code"
              className="px-3 py-1 border rounded-md text-sm"
            />
            <button onClick={onClose} className="text-xl text-red-500 hover:text-red-700">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form className="flex-1 overflow-y-auto p-6 space-y-6 text-sm" onSubmit={(e) => {
          e.preventDefault();
          console.log("Form submitted", formData);
        }}>
          <CollegeInfoSection formData={formData} setFormData={setFormData} handleChange={handleChange} />
          <POCInfoSection formData={formData} handleChange={handleChange} />

          <StudentBreakdownSection formData={formData} setFormData={setFormData} studentFile={studentFile} setStudentFile={setStudentFile} />
          <TopicBreakdownSection formData={formData} setFormData={setFormData} />
          <PaymentInfoSection formData={formData} setFormData={setFormData} />
          <MOUUploadSection mouFile={mouFile} setMouFile={setMouFile} />

          <div className="pt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TrainingForm;

