import React from "react";

const MouPreviewModal = ({ show, onClose, mouFileUrl }) => {
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
        
        {mouFileUrl ? (
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
            />
          </div>
        ) : (
          <p>No MOU file available</p>
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
          <button
            onClick={() => window.open(mouFileUrl, "_blank")}
            disabled={!mouFileUrl}
            style={{
              padding: '8px 16px',
              backgroundColor: mouFileUrl ? '#007bff' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: mouFileUrl ? 'pointer' : 'not-allowed'
            }}
          >
            Open in New Tab
          </button>
        </div>
      </div>
    </div>
  );
};

export default MouPreviewModal;