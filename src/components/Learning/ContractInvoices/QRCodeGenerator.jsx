import React from "react";

const QRCodeGenerator = ({ invoiceNumber }) => {
  const generateQRCode = () => {
    // Generate URL for invoice details page
    const invoiceUrl = `http://localhost:5173/${invoiceNumber}`;
    return `https://quickchart.io/qr?text=${encodeURIComponent(
      invoiceUrl
    )}&size=120`;
  };

  return (
    <>
      <div className="qr-code-container text-center">
        <img
          src={generateQRCode()}
          alt="QR Code"
          className="mx-auto border border-gray-300"
          title="Scan to view invoice details"
          style={{ width: "120px", height: "120px" }}
          onError={(e) => {
            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=http://localhost:5173/${invoiceNumber}`;
          }}
        />
        <p className="text-xs text-gray-600 mt-1">Scan QR Code</p>
      </div>
    </>
  );
};

export default QRCodeGenerator;
