import React, { useState, useEffect } from 'react';
import TrainingForm from '../components/Sales/ClosureForm/TrainingForm';

function SalesClientOnboarding() {
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    // Initialize with empty lead data when component mounts
    setSelectedLead({});
  }, []);

  return (
    <div className="p-4">
      <TrainingForm 
        show={true} // Always show the form
        onClose={() => {}} // Empty function since we can't close it now
        lead={selectedLead} 
        users={{}} // Pass your actual users data here
      />
    </div>
  );
}

export default SalesClientOnboarding;