import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase";

// Delete specific trainer assignment
export const deleteTrainerAssignment = async (assignment, onSuccess, onError) => {
  if (!assignment || !assignment.id) {
    console.error('Invalid assignment for deletion');
    if (onError) onError('Invalid assignment for deletion');
    return;
  }

  try {
    const assignmentRef = doc(db, 'trainerAssignments', assignment.id);
    await deleteDoc(assignmentRef);
    console.log(`✅ Deleted trainer assignment: ${assignment.trainerName || assignment.trainerId} - ${assignment.date}`);

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(assignment);
    }
  } catch (error) {
    console.error('Error deleting trainer assignment:', error);
    if (onError) {
      onError('Failed to delete trainer assignment. Please try again.');
    } else {
      alert('Failed to delete trainer assignment. Please try again.');
    }
  }
};
