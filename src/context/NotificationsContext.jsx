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
        // Query tickets created by user
        const q1 = query(
          collection(db, "tickets"),
          where("createdBy", "==", user.email),
          where("status", "==", "resolved")
        );
        const snapshot1 = await getDocs(q1);
        const alerts1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Query tickets raised on behalf of user
        const q2 = query(
          collection(db, "tickets"),
          where("onBehalfOf", "==", user.email),
          where("status", "==", "resolved")
        );
        const snapshot2 = await getDocs(q2);
        const alerts2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Combine and filter out dismissed
        const allAlerts = [...alerts1, ...alerts2];
        const uniqueAlerts = allAlerts.filter((alert, index, self) =>
          index === self.findIndex(a => a.id === alert.id)
        ).filter(ticket => !ticket.dismissedBy || !ticket.dismissedBy.includes(user.email));

        setTicketAlerts(uniqueAlerts);
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