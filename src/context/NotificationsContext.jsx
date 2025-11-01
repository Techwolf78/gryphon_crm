import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [ticketAlerts, setTicketAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch ticket alerts
  useEffect(() => {
    if (!user?.email) return;

    const fetchTicketAlerts = async () => {
      try {
        const q = query(
          collection(db, "tickets"),
          where("createdBy", "==", user.email),
          where("status", "==", "resolved")
        );
        const snapshot = await getDocs(q);
        const alerts = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(ticket => !ticket.dismissedBy || !ticket.dismissedBy.includes(user.email));
        setTicketAlerts(alerts);
      } catch (error) {
        console.error("Error fetching ticket alerts:", error);
      }
    };

    fetchTicketAlerts();
  }, [user?.email]);

  const dismissAlert = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, {
        dismissedBy: arrayUnion(user.email)
      });
      setTicketAlerts(prev => prev.filter(alert => alert.id !== ticketId));
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <NotificationsContext.Provider value={{
      ticketAlerts,
      dismissAlert,
      isModalOpen,
      openModal,
      closeModal
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};