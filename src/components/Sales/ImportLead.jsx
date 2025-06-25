import { FiUpload } from "react-icons/fi";
import Papa from "papaparse";

const ImportLead = ({ handleImportComplete }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        handleImportComplete(results.data);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
      },
    });
  };

  return (
    <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-gradient-to-r from-green-50 to-white text-green-700 hover:from-green-100 hover:to-white hover:shadow-md transition-all cursor-pointer">
      <FiUpload className="w-4 h-4" />
      <span>Import</span>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
    </label>
  );
};

export default ImportLead;