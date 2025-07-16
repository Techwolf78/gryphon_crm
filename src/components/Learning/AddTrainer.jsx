import React, { useState, useEffect } from "react";
import { doc, setDoc, getDocs, query, orderBy, collection } from "firebase/firestore";
import { db } from "../../firebase";
import * as XLSX from "xlsx";

function AddTrainer({ onClose, onTrainerAdded }) {
  const [trainerData, setTrainerData] = useState({
    trainerId: "",
    name: "",
    contact: "",
    email: "",
    domain: "Soft Skills",
    nameAsPerBank: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    pan: "",
    aadhar: "",
    bankAddress: "",
    paymentType: "Per Hour",
    charges: "",
    specialization: "",
    otherSpecialization: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtherSpecialization, setShowOtherSpecialization] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importProgress, setImportProgress] = useState(0);

  // Generate next trainer ID
  useEffect(() => {
    const getNextTrainerId = async () => {
      try {
        const q = query(collection(db, "trainers"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        let maxNumber = 0;
        snapshot.forEach(doc => {
          const id = doc.id;
          if (id && id.startsWith("GA-T")) {
            const num = parseInt(id.replace("GA-T", ""));
            if (!isNaN(num)) {
              maxNumber = Math.max(maxNumber, num);
            }
          }
        });

        const nextId = `GA-T${(maxNumber + 1).toString().padStart(3, '0')}`;
        setTrainerData(prev => ({ ...prev, trainerId: nextId }));
      } catch (err) {
        console.error("Error generating ID:", err);
        setTrainerData(prev => ({ ...prev, trainerId: "GA-T001" }));
      }
    };
    getNextTrainerId();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData(prev => ({ ...prev, [name]: value }));

    if (name === "specialization" && value === "Others") {
      setShowOtherSpecialization(true);
    } else if (name === "specialization") {
      setShowOtherSpecialization(false);
    }
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const trainerToSave = {
      trainerId: trainerData.trainerId,
      name: trainerData.name,
      contact: trainerData.contact,
      email: trainerData.email,
      domain: trainerData.domain,
      nameAsPerBank: trainerData.nameAsPerBank,
      bankName: trainerData.bankName,
      accountNumber: trainerData.accountNumber,
      ifsc: trainerData.ifsc,
      pan: trainerData.pan,
      aadhar: trainerData.aadhar,
      bankAddress: trainerData.bankAddress,
      paymentType: trainerData.paymentType,
      charges: Number(trainerData.charges) || 0,
      specialization: showOtherSpecialization
        ? trainerData.otherSpecialization
        : trainerData.specialization,
      createdAt: new Date()
    };

    // Only add if it exists
    if (showOtherSpecialization) {
      trainerToSave.otherSpecialization = trainerData.otherSpecialization;
    }

    console.log("Saving trainer:", trainerToSave);
    await setDoc(doc(db, "trainers", trainerData.trainerId), trainerToSave, { merge: true });

    onTrainerAdded();
    onClose();
  } catch (err) {
    console.error("Error adding trainer:", err);
    setError(`Failed to add trainer: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  const specializationOptions = [
    "Advanced Excel and Power BI",
    "AI/ML",
    "Aptitude",
    "Aptitude (QA & LR)",
    "Aptitude Training",
    "Automation & Robotics",
    "Behavioral Soft Skills / Team Building / Campus to Corporate / POSH",
    "Chemical Technical (Campus Interview)",
    "Civil",
    "Civil Engineering",
    "Computer Science",
    "Corporate Trainer",
    "CS (Computer Science)",
    "Data Analytics - BI",
    "Data Structures and Algorithms (DSA)",
    "English",
    "Excel & Power BI",
    "Excel + AI, Finance",
    "Finance",
    "Finance, Accounts, Management, Leadership, Corporate Finance",
    "Finance, Communication Skills",
    "Food Technology and Professional Skills for Teachers and Students",
    "Generative AI and HR Soft Skills Training",
    "HR",
    "HR Soft Skills",
    "IMC (Industrial Maintenance & Control)",
    "Information Technology",
    "Industry Expert",
    "IoT (Internet of Things)",
    "Java, .NET, C, C++",
    "Java Full Stack",
    "Java MERN and AWS",
    "Leadership, Behaviors, and Communication",
    "Life Skills, Verbal Aptitude, Leadership Training",
    "Logical Reasoning and Quantitative Aptitude (LR QA Aptitude)",
    "M.Sc (Mathematics) and Aptitude Trainer with 15 Years of Experience",
    "Marketing",
    "MCA (Master of Computer Applications)",
    "Mechanical",
    "MERN Full Stack Trainer",
    "Microsoft Excel, PowerPoint, Word, Power BI, Human Resource Management",
    "MS Office and Data Analysis using Power BI",
    "Personal Finance",
    "PLC Programming & SCADA",
    "Power BI",
    "Psychology of Communication & Emotional Wellbeing",
    "Python",
    "Python, Java Full Stack, SQL, ML",
    "Sales and Marketing",
    "Sales, Marketing, Leadership, Soft Skills",
    "Soft Skills",
    "Soft Skills & Advanced Excel",
    "Soft Skills Trainer",
    "Soft Skills, Corporate Performance Improvement, Business Communication, Business English",
    "Soft Skills and Verbal Ability",
    "Technical",
    "Technical - Java Full Stack",
    "Technical - Mechanical",
    "Technical - Sales",
    "Technical - Mechatronics",
    "Technical - Civil",
    "Technical - Digital Marketing, Marketing Analytics",
    "Technical - IoT",
    "Technical - Machine Learning",
    "Technical - Computer Science",
    "Technical - Electrical",
    "Technical - Full Stack",
    "Technical - IMC",
    "Technical - MS Excel and Power BI",
    "Technical Sales",
    "Verbal Aptitude",
    "Others"
  ];

  // Import from Excel and save directly to Firestore
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("Processing file...");
    setImportProgress(10);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportProgress(30);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        setImportProgress(60);

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          throw new Error("No data found in the Excel file");
        }

        setImportProgress(80);

        // Process each row in the Excel file
        for (const importedData of jsonData) {
          // Generate trainer ID if not provided
          let trainerId = importedData["Trainer ID"] || "";
          if (!trainerId) {
            const q = query(collection(db, "trainers"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            let maxNumber = 0;
            snapshot.forEach(doc => {
              const id = doc.id;
              if (id && id.startsWith("GA-T")) {
                const num = parseInt(id.replace("GA-T", ""));
                if (!isNaN(num)) {
                  maxNumber = Math.max(maxNumber, num);
                }
              }
            });
            trainerId = `GA-T${(maxNumber + 1).toString().padStart(3, '0')}`;
          }

          const trainerToSave = {
            trainerId: trainerId,
            name: importedData["Name"] || "",
            contact: importedData["Contact"] || "",
            email: importedData["Email"] || "",
            domain: importedData["Domain"] || "Soft Skills",
            nameAsPerBank: importedData["Name as per Bank"] || "",
            bankName: importedData["Bank Name"] || "",
            accountNumber: importedData["Account Number"] || "",
            ifsc: importedData["IFSC Code"] || "",
            pan: importedData["PAN"] || "",
            aadhar: importedData["Aadhar"] || "",
            bankAddress: importedData["Bank Address"] || "",
            paymentType: importedData["Payment Type"] || "Per Hour",
            charges: Number(importedData["Charges"]) || 0,
            specialization: importedData["Specialization"] || "Soft Skills",
            createdAt: new Date()
          };

          // Add debug log
          console.log("Importing trainer:", trainerToSave);

          // Handle "Others" specialization
          if (!specializationOptions.includes(importedData["Specialization"])) {
            trainerToSave.specialization = "Others";
            trainerToSave.otherSpecialization = importedData["Specialization"] || "";
          }

          // Save to Firestore
          await setDoc(doc(db, "trainers", trainerId), trainerToSave);

          // Update form with the last imported trainer
          if (importedData === jsonData[jsonData.length - 1]) {
            setTrainerData(trainerToSave);
          }
        }

        setImportStatus(`${jsonData.length} trainers imported successfully!`);
        setImportProgress(100);
        onTrainerAdded(); // Refresh the trainers list

        setTimeout(() => {
          setImportStatus("");
          setImportProgress(0);
        }, 3000);
      } catch (error) {
        console.error("Import error:", error);
        setError(`Import failed: ${error.message}`);
        setImportStatus("Import failed");
        setImportProgress(0);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file");
      setImportStatus("Import failed");
      setImportProgress(0);
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Export to Excel
  const handleExportTemplate = () => {
    const templateData = [{
      "Name": "",
      "Contact": "",
      "Email": "",
      "Domain": "Soft Skills",
      "Name as per Bank": "",
      "Bank Name": "",
      "Account Number": "",
      "IFSC Code": "",
      "PAN": "",
      "Aadhar": "",
      "Bank Address": "",
      "Payment Type": "Per Hour",
      "Charges": "",
      "Specialization": ""
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trainers");
    XLSX.writeFile(workbook, "trainer_import_template.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Add New Trainer</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>

        {error && <div className="mb-2 p-2 bg-red-100 text-red-700 text-sm">{error}</div>}
        {importStatus && (
          <div className="mb-2 p-2 bg-blue-100 text-blue-700 text-sm">
            {importStatus}
            {importProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleExportTemplate}
            className="px-3 py-1 bg-green-500 text-white text-sm"
          >
            Download Template
          </button>
          <label className="px-3 py-1 bg-blue-500 text-white text-sm cursor-pointer">
            Import from Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="block mb-1">Trainer ID</label>
            <input
              type="text"
              value={trainerData.trainerId}
              readOnly
              className="w-full p-1 border bg-gray-100"
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Name of the Trainer*</label>
            <input
              type="text"
              name="name"
              value={trainerData.name}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Contact Number*</label>
            <input
              type="tel"
              name="contact"
              value={trainerData.contact}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Email Id*</label>
            <input
              type="email"
              name="email"
              value={trainerData.email}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Domain*</label>
            <select
              name="domain"
              value={trainerData.domain}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            >
              <option value="Soft Skills">Soft Skills</option>
              <option value="Aptitude">Aptitude</option>
              <option value="Technical">Technical</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="block mb-1">Name as per Bank*</label>
            <input
              type="text"
              name="nameAsPerBank"
              value={trainerData.nameAsPerBank}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Bank Name*</label>
            <input
              type="text"
              name="bankName"
              value={trainerData.bankName}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Account No*</label>
            <input
              type="text"
              name="accountNumber"
              value={trainerData.accountNumber}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">IFSC Code*</label>
            <input
              type="text"
              name="ifsc"
              value={trainerData.ifsc}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">PAN Card*</label>
            <input
              type="text"
              name="pan"
              value={trainerData.pan}
              onChange={handleChange}
              className="w-full p-1 border"
     
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Aadhar Card*</label>
            <input
              type="text"
              name="aadhar"
              value={trainerData.aadhar}
              onChange={handleChange}
              className="w-full p-1 border"
   
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Bank Address*</label>
            <input
              type="text"
              name="bankAddress"
              value={trainerData.bankAddress}
              onChange={handleChange}
              className="w-full p-1 border"
   
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Payment*</label>
            <select
              name="paymentType"
              value={trainerData.paymentType}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            >
              <option value="Per Hour">Per Hour</option>
              <option value="Per Day">Per Day</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="block mb-1">Charges Per Hour*</label>
            <input
              type="number"
              name="charges"
              value={trainerData.charges}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block mb-1">Specialization*</label>
            <select
              name="specialization"
              value={trainerData.specialization}
              onChange={handleChange}
              className="w-full p-1 border"
              required
            >
              <option value="">Select Specialization</option>
              {specializationOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {showOtherSpecialization && (
            <div className="mb-2">
              <label className="block mb-1">Other Specialization*</label>
              <input
                type="text"
                name="otherSpecialization"
                value={trainerData.otherSpecialization}
                onChange={handleChange}
                className="w-full p-1 border"
                required={showOtherSpecialization}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-500 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrainer;

