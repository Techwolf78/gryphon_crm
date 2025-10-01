import React from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const SendRequestModal = ({ trainer, onClose, onRequestSent }) => {
  const { user } = useAuth();
  console.log('SendRequestModal rendering for', trainer?.name);

  const handleSend = async () => {
    try {
      await addDoc(collection(db, 'trainer_delete_requests'), {
        trainerId: trainer.id,
        trainerName: trainer.name,
        requesterId: user.uid,
        requesterName: user.displayName || user.email,
        status: 'pending',
        createdAt: new Date()
      });
      onRequestSent();
    } catch (err) {
      console.error('Failed to send request:', err);
      toast.error('Failed to send request. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">Send Delete Request</h2>
        <p>Are you sure you want to send a request to delete trainer {trainer.name}?</p>
        <div className="flex justify-end mt-4 space-x-2">
          <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={handleSend} className="px-4 py-2 bg-blue-500 text-white rounded">Send Request</button>
        </div>
      </div>
    </div>
  );
};

export default SendRequestModal;