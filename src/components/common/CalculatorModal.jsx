import React from 'react';
import Captcha from './Captcha';
import './CalculatorModal.css'; // Reuse the CSS for modal styling

const CalculatorModal = ({ onClose }) => {
  const handleVerify = () => {
    onClose(); // Close the modal after verification
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Verify You Are Human</h2>
        <Captcha onVerify={handleVerify} siteKey="0x4AAAAAACKk8LLVAxXiubXe" disabled={window.location.hostname === 'localhost'} />
      </div>
    </div>
  );
};

export default CalculatorModal;