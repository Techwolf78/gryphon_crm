import React from "react";
import TrainerLeadDetails from "../Learning/TrainerLeadDetails";

const TrainerDetailsModal = ({
  trainer,
  isOpen,
  onClose
}) => {
  if (!isOpen || !trainer) return null;

  return (
    <TrainerLeadDetails
      trainer={trainer}
      onClose={onClose}
    />
  );
};

export default TrainerDetailsModal;
