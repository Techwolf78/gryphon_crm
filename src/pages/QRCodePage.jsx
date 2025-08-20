import React, { useState } from "react";
import { FiDownload, FiCopy, FiRefreshCw, FiArrowLeft, FiCheck, FiGrid, FiPlus, FiTrash2, FiPackage } from "react-icons/fi";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const QRCodePage = ({ onBack }) => {
  const [inputText, setInputText] = useState("");
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInputs, setBulkInputs] = useState([""]);
  const [generatedQRCodes, setGeneratedQRCodes] = useState([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangePrefix, setRangePrefix] = useState("");
  const [rangeSuffix, setRangeSuffix] = useState("");

  const generateQRCode = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    try {
      const dataURL = await QRCode.toDataURL(inputText, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });
      setQrCodeDataURL(dataURL);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
    setIsGenerating(false);
  };

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return;

    const link = document.createElement("a");
    link.href = qrCodeDataURL;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (qrCodeDataURL) {
      setQrCodeDataURL(""); // Clear previous QR code when input changes
    }
  };

  const clearAll = () => {
    setInputText("");
    setQrCodeDataURL("");
  };

  // Bulk QR Code functions
  const addBulkInput = () => {
    setBulkInputs([...bulkInputs, ""]);
  };

  const removeBulkInput = (index) => {
    const newInputs = bulkInputs.filter((_, i) => i !== index);
    setBulkInputs(newInputs.length > 0 ? newInputs : [""]);
  };

  const updateBulkInput = (index, value) => {
    const newInputs = [...bulkInputs];
    newInputs[index] = value;
    setBulkInputs(newInputs);
  };

  const generateBulkQRCodes = async () => {
    const validInputs = bulkInputs.filter(input => input.trim());
    if (validInputs.length === 0) return;

    setIsBulkGenerating(true);
    const qrCodes = [];

    try {
      for (let i = 0; i < validInputs.length; i++) {
        const input = validInputs[i];
        const dataURL = await QRCode.toDataURL(input, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "M",
        });
        
        qrCodes.push({
          text: input,
          dataURL: dataURL,
          filename: `qr-code-${i + 1}.png`
        });
      }
      
      setGeneratedQRCodes(qrCodes);
    } catch (error) {
      console.error("Error generating bulk QR codes:", error);
    }
    
    setIsBulkGenerating(false);
  };

  const downloadBulkQRCodes = async () => {
    if (generatedQRCodes.length === 0) return;

    const zip = new JSZip();
    
    for (const qrCode of generatedQRCodes) {
      // Convert data URL to blob
      const response = await fetch(qrCode.dataURL);
      const blob = await response.blob();
      zip.file(qrCode.filename, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `qr-codes-${Date.now()}.zip`);
  };

  const addMultipleInputs = (count) => {
    const newInputs = Array(count).fill("");
    setBulkInputs([...bulkInputs, ...newInputs]);
  };

  // Range QR Code functions
  const generateRangeQRCodes = async () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (!start || !end || start > end) {
      alert("Please enter valid start and end numbers (start must be less than or equal to end)");
      return;
    }

    const totalCodes = end - start + 1;
    if (totalCodes > 1000) {
      const confirm = window.confirm(`You are about to generate ${totalCodes} QR codes. This might take a while. Continue?`);
      if (!confirm) return;
    }

    setIsBulkGenerating(true);
    const qrCodes = [];

    try {
      for (let i = start; i <= end; i++) {
        const content = `${rangePrefix}${i}${rangeSuffix}`;
        const dataURL = await QRCode.toDataURL(content, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "M",
        });
        
        qrCodes.push({
          text: content,
          dataURL: dataURL,
          filename: `qr-code-${i}.png`
        });
      }
      
      setGeneratedQRCodes(qrCodes);
    } catch (error) {
      console.error("Error generating range QR codes:", error);
    }
    
    setIsBulkGenerating(false);
  };

  const clearRangeInputs = () => {
    setRangeStart("");
    setRangeEnd("");
    setGeneratedQRCodes([]);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Back to Help Center
          </button>
          
          <div className="inline-flex items-center justify-start bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-5 mb-4 shadow-sm border border-white">
            <FiGrid className="text-blue-600 w-8 h-8" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            QR Code Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Generate QR codes for URLs, text, contact information, and more. Perfect for sharing links, business cards, or any information quickly.
          </p>
          
          {/* Mode Toggle */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => {setBulkMode(false); setRangeMode(false);}}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !bulkMode && !rangeMode
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Single QR Code
            </button>
            <button
              onClick={() => {setBulkMode(true); setRangeMode(false);}}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                bulkMode && !rangeMode
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Bulk QR Codes
            </button>
            <button
              onClick={() => {setBulkMode(false); setRangeMode(true);}}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                rangeMode
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Range QR Codes
            </button>
          </div>
        </div>

        {/* Main Content */}
        {rangeMode ? (
          // Range QR Code Mode
          <div className="space-y-6">
            {/* Range Input Section */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Generate Sequential QR Codes
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Number
                        </label>
                        <input
                          type="number"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          placeholder="101"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Number
                        </label>
                        <input
                          type="number"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          placeholder="160"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prefix (Optional)
                      </label>
                      <input
                        type="text"
                        value={rangePrefix}
                        onChange={(e) => setRangePrefix(e.target.value)}
                        placeholder="ID-"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suffix (Optional)
                      </label>
                      <input
                        type="text"
                        value={rangeSuffix}
                        onChange={(e) => setRangeSuffix(e.target.value)}
                        placeholder="-2024"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Preview Format:</h3>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-2">Your QR codes will contain:</p>
                      <div className="font-mono text-sm bg-white p-2 rounded border">
                        {rangePrefix}{rangeStart || "101"}{rangeSuffix}
                      </div>
                      <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                        {rangePrefix}{rangeStart ? parseInt(rangeStart) + 1 : "102"}{rangeSuffix}
                      </div>
                      <div className="text-center text-gray-400 my-1">...</div>
                      <div className="font-mono text-sm bg-white p-2 rounded border">
                        {rangePrefix}{rangeEnd || "160"}{rangeSuffix}
                      </div>
                    </div>
                    
                    {rangeStart && rangeEnd && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Total QR Codes: {parseInt(rangeEnd) - parseInt(rangeStart) + 1}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={generateRangeQRCodes}
                    disabled={!rangeStart || !rangeEnd || parseInt(rangeStart) > parseInt(rangeEnd) || isBulkGenerating}
                    className={`flex-1 flex items-center justify-center px-4 py-3 ${
                      !rangeStart || !rangeEnd || parseInt(rangeStart) > parseInt(rangeEnd) || isBulkGenerating
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white font-medium rounded-lg transition-all duration-200`}
                  >
                    {isBulkGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating {rangeStart && rangeEnd ? parseInt(rangeEnd) - parseInt(rangeStart) + 1 : 0} QR Codes...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="mr-2" />
                        Generate {rangeStart && rangeEnd ? parseInt(rangeEnd) - parseInt(rangeStart) + 1 : 0} QR Codes
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={clearRangeInputs}
                    className="px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Generated QR Codes Display */}
            {generatedQRCodes.length > 0 && (
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Generated Range QR Codes ({generatedQRCodes.length})
                    </h2>
                    <button
                      onClick={downloadBulkQRCodes}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <FiPackage className="mr-2" />
                      Download ZIP File
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {generatedQRCodes.map((qrCode, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <img
                          src={qrCode.dataURL}
                          alt={`QR Code ${qrCode.text}`}
                          className="w-full h-32 object-contain mb-2"
                        />
                        <p className="text-xs text-gray-600 truncate" title={qrCode.text}>
                          {qrCode.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !bulkMode ? (
          // Single QR Code Mode
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Input Data
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter text, URL, or data to encode
                  </label>
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Enter text, URL, email, phone number, or any data you want to encode..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="6"
                    />
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={copyToClipboard}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        title="Copy text"
                        disabled={!inputText.trim()}
                      >
                        {copied ? (
                          <FiCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <FiCopy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Character count: {inputText.length}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={generateQRCode}
                    disabled={!inputText.trim() || isGenerating}
                    className={`flex-1 flex items-center justify-center px-4 py-3 ${
                      !inputText.trim() || isGenerating
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="mr-2" />
                        Generate QR Code
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearAll}
                    disabled={!inputText && !qrCodeDataURL}
                    className="px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Display Section */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Generated QR Code
              </h2>
              
              {qrCodeDataURL ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <img
                        src={qrCodeDataURL}
                        alt="Generated QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={downloadQRCode}
                      className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      <FiDownload className="mr-2" />
                      Download QR Code
                    </button>

                    <div className="text-xs text-gray-500 text-center">
                      Right-click on the QR code to save or copy the image
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FiGrid className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    Enter some text and click "Generate QR Code" to see your QR code here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
          // Bulk QR Code Mode
          <div className="space-y-6">
            {/* Bulk Input Section */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Bulk Input Data
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addMultipleInputs(10)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => addMultipleInputs(20)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      +20
                    </button>
                    <button
                      onClick={() => addMultipleInputs(30)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      +30
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bulkInputs.map((input, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-8 text-sm text-gray-500 text-center">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => updateBulkInput(index, e.target.value)}
                        placeholder={`Enter text, URL, or data for QR code ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {bulkInputs.length > 1 && (
                        <button
                          onClick={() => removeBulkInput(index)}
                          className="p-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={addBulkInput}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FiPlus className="mr-2" />
                    Add Input
                  </button>
                  
                  <button
                    onClick={generateBulkQRCodes}
                    disabled={bulkInputs.filter(i => i.trim()).length === 0 || isBulkGenerating}
                    className={`flex-1 flex items-center justify-center px-4 py-2 ${
                      bulkInputs.filter(i => i.trim()).length === 0 || isBulkGenerating
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white font-medium rounded-lg transition-all duration-200`}
                  >
                    {isBulkGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating {bulkInputs.filter(i => i.trim()).length} QR Codes...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="mr-2" />
                        Generate {bulkInputs.filter(i => i.trim()).length} QR Codes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated QR Codes Display */}
            {generatedQRCodes.length > 0 && (
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Generated QR Codes ({generatedQRCodes.length})
                    </h2>
                    <button
                      onClick={downloadBulkQRCodes}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <FiPackage className="mr-2" />
                      Download ZIP File
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {generatedQRCodes.map((qrCode, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <img
                          src={qrCode.dataURL}
                          alt={`QR Code ${index + 1}`}
                          className="w-full h-32 object-contain mb-2"
                        />
                        <p className="text-xs text-gray-600 truncate" title={qrCode.text}>
                          {qrCode.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage Examples */}
        <div className="mt-8 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {rangeMode ? "Range Generation Examples" : bulkMode ? "Bulk Generation Features" : "Usage Examples"}
            </h2>
            
            {rangeMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Common Use Cases:</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">Event Tickets</h4>
                      <p className="text-sm text-blue-700">From: 1001, To: 1200</p>
                      <p className="text-xs text-blue-600">Creates: 1001, 1002, 1003... 1200</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900">Product IDs</h4>
                      <p className="text-sm text-green-700">Prefix: PROD-, From: 101, To: 160</p>
                      <p className="text-xs text-green-600">Creates: PROD-101, PROD-102... PROD-160</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900">Member Cards</h4>
                      <p className="text-sm text-purple-700">Prefix: MEM-, From: 5001, To: 5100, Suffix: -2024</p>
                      <p className="text-xs text-purple-600">Creates: MEM-5001-2024, MEM-5002-2024...</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Features:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Generate thousands of sequential QR codes
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Add custom prefix and suffix text
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Preview format before generation
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Automatic filename numbering
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Download all as organized ZIP file
                    </li>
                  </ul>
                </div>
              </div>
            ) : bulkMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Features:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Generate up to 100+ QR codes at once
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Download all QR codes as a ZIP file
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Each QR code saved as high-quality PNG
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Perfect for marketing campaigns
                    </li>
                    <li className="flex items-center">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Batch processing for events
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Quick Add Options:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Click "+10" to add 10 input fields</li>
                    <li>• Click "+20" to add 20 input fields</li>
                    <li>• Click "+30" to add 30 input fields</li>
                    <li>• Use "Add Input" for individual fields</li>
                    <li>• Remove unwanted fields with trash icon</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Website URL</h3>
                <p className="text-sm text-blue-700">https://example.com</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Email Address</h3>
                <p className="text-sm text-green-700">mailto:contact@example.com</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Phone Number</h3>
                <p className="text-sm text-purple-700">tel:+1234567890</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">WiFi Network</h3>
                <p className="text-sm text-orange-700">WIFI:T:WPA;S:NetworkName;P:password;;</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">SMS Message</h3>
                <p className="text-sm text-red-700">sms:+1234567890:Hello World</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Plain Text</h3>
                <p className="text-sm text-gray-700">Any text content</p>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
