import React, { useState, useEffect } from "react";

const MouPreviewModal = ({ show, onClose, mouFileUrl }) => {
  const [fileError, setFileError] = useState(false);

  useEffect(() => {
    if (!show) return;
    
    // Reset error state when modal opens
    setFileError(false);
    
    // Check if the file exists when the modal opens
    if (mouFileUrl) {
      checkFileAccessibility(mouFileUrl);
    }
  }, [show, mouFileUrl]);

  const checkFileAccessibility = (url) => {
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          setFileError(true);
        }
      })
      .catch(() => {
        setFileError(true);
      });
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '80%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0 }}>MOU File Preview</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        {!mouFileUrl ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#6c757d', marginBottom: '10px' }}>No file to preview</p>
            <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              No MOU file has been uploaded for this record.
            </p>
          </div>
        ) : fileError ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#dc3545', marginBottom: '10px' }}>Problem accessing the file</p>
            <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              The MOU file exists but cannot be displayed. Please contact the administrator.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <iframe 
              src={mouFileUrl}
              style={{ 
                width: '100%', 
                height: '500px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              frameBorder="0"
              title="MOU Preview"
              onError={() => setFileError(true)}
            />
          </div>
        )}
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '20px',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          {mouFileUrl && !fileError && (
            <button
              onClick={() => window.open(mouFileUrl, "_blank")}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Open in New Tab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MouPreviewModal;