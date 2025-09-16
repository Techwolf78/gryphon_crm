import React from "react";
import TrainerLeadDetails from "../Learning/TrainerLeadDetails";

const TrainerDetailsModal = ({
  showTrainerDetails,
  selectedTrainer,
  setShowTrainerDetails
}) => {
  if (!showTrainerDetails || !selectedTrainer) return null;

  return (
    <TrainerLeadDetails
      trainer={selectedTrainer}
      onClose={() => setShowTrainerDetails(false)}
    />
  );
};

export default TrainerDetailsModal;
