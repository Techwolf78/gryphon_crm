import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase";

// Delete specific trainer assignment
export const deleteTrainerAssignment = async (assignment, onSuccess, onError) => {
  if (!assignment || !assignment.id) {

    if (onError) onError('Invalid assignment for deletion');
    return;
  }

  try {
    const assignmentRef = doc(db, 'trainerAssignments', assignment.id);
    await deleteDoc(assignmentRef);

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(assignment);
    }
  } catch (error) {

    if (onError) {
      onError('Failed to delete trainer assignment. Please try again.');
    } else {
      alert('Failed to delete trainer assignment. Please try again.');
    }
  }
};
