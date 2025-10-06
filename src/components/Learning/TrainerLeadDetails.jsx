import React from "react";
import { FiX, FiCopy, FiPhone, FiMail, FiUser, FiCreditCard, FiHome, FiFileText } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

function TrainerLeadDetails({ trainer, onClose }) {
  if (!trainer) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here if needed
  };

  const contactTrainer = () => {
    window.open(`tel:${trainer.contact}`);
  };

  const emailTrainer = () => {
    window.open(`mailto:${trainer.email}`);
  };

  return (
    <div className="fixed inset-0 z-54 flex items-center justify-center p-4">
      {/* Enhanced backdrop with fade-in animation */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>
      
      {/* Modal with slide-up animation */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-300">
        {/* Header with sticky positioning */}
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FiUser className="text-blue-600" />
                {trainer.name}
              </h2>
              <p className="text-gray-500 mt-1">{trainer.trainerId}</p>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-2"
              onClick={onClose}
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content with organized sections */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailCard 
              icon={<FiUser className="text-blue-500" />}
              title="Domain"
              value={trainer.domain}
            />
            <DetailCard 
              icon={<FaRupeeSign className="text-green-500" />}
              title="Charges"
              value={`₹${trainer.charges ?? "-"} ${trainer.paymentType ? `(${trainer.paymentType})` : ""}`}
            />
          </div>

          {/* Contact Information */}
          <Section title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard 
                icon={<FiPhone className="text-blue-500" />}
                title="Phone"
                value={trainer.contact}
                action={contactTrainer}
                copyable
                copyToClipboard={copyToClipboard}
              />
              <DetailCard 
                icon={<FiMail className="text-red-500" />}
                title="Email"
                value={trainer.email}
                action={emailTrainer}
                copyable
                copyToClipboard={copyToClipboard}
              />
            </div>
          </Section>

          {/* Specializations */}
          <Section title="Specializations">
            <div className="flex flex-wrap gap-2">
              {[
                ...(Array.isArray(trainer.specialization) ? trainer.specialization : []),
                ...(Array.isArray(trainer.otherSpecialization) ? trainer.otherSpecialization : [])
              ]
                .filter(spec => spec) // This is equivalent to .filter(Boolean)
                .map((spec, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {spec}
                  </span>
                ))}
            </div>
          </Section>

          {/* Bank Details */}
          <Section title="Bank Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard 
                icon={<FiCreditCard className="text-purple-500" />}
                title="Account Number"
                value={trainer.accountNumber}
                copyable
                copyToClipboard={copyToClipboard}
              />
              <DetailCard 
                icon={<FiHome className="text-amber-500" />}
                title="Bank Name"
                value={trainer.bankName}
              />
              <DetailCard 
                icon={<FiFileText className="text-green-500" />}
                title="IFSC Code"
                value={trainer.ifsc}
                copyable
                copyToClipboard={copyToClipboard}
              />
              <DetailCard 
                icon={<FiUser className="text-blue-500" />}
                title="Name as per Bank"
                value={trainer.nameAsPerBank}
              />
            </div>
          </Section>

          {/* Additional Information */}
          <Section title="Additional Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard 
                title="PAN Number"
                value={trainer.pan}
                copyable
                copyToClipboard={copyToClipboard}
              />
              <DetailCard 
                title="Aadhar Number"
                value={trainer.aadhar}
                copyable
                copyToClipboard={copyToClipboard}
              />
              <DetailCard 
                title="Bank Address"
                value={trainer.bankAddress}
              />
              <DetailCard 
                title="Created At"
                value={trainer.createdAt ? new Date(trainer.createdAt.seconds * 1000).toLocaleString() : "-"}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// Reusable Section Component
const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    {children}
  </div>
);

// Reusable Detail Card Component
const DetailCard = ({ icon, title, value, copyable = false, action, copyToClipboard }) => {
  const [showCopied, setShowCopied] = React.useState(false);

  const handleCopy = () => {
    copyToClipboard(value);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1000);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors relative">
      {/* Tooltip animation style */}
      <style>
        {`
          .copied-tooltip {
            position: absolute;
            right: 0;
            top: -28px;
            background: #2563eb;
            color: #fff;
            font-size: 12px;
            padding: 2px 10px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            opacity: 0;
            transform: translateY(10px) scale(0.95);
            animation: fadeInCopied 0.3s forwards;
            z-index: 10;
          }
          @keyframes fadeInCopied {
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-0.5">{icon}</div>}
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-gray-800 font-medium">{value || "-"}</p>
          </div>
        </div>
        <div className="flex gap-1 relative">
          {copyable && (
            <div>
              <button
                onClick={handleCopy}
                className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                title="Copy to clipboard"
                style={{ position: "relative" }}
              >
                <FiCopy size={16} />
              </button>
              {showCopied && (
                <span className="copied-tooltip">Copied!</span>
              )}
            </div>
          )}
          {action && (
            <button
              onClick={action}
              className="text-gray-400 hover:text-blue-500 transition-colors p-1"
              title={`${title === 'Phone' ? 'Call' : 'Email'} trainer`}
            >
              {title === 'Phone' ? <FiPhone size={16} /> : <FiMail size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerLeadDetails;
