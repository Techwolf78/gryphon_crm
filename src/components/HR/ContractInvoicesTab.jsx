import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ContractInvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'trainingForms'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'pending',
        amount: doc.data().netPayableAmount || doc.data().totalCost || 0,
      }));
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching contract invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleApprove = async (invoice) => {
    try {
      const { id, ...invoiceData } = invoice;
      const invoiceRef = doc(db, 'contractInvoices', id);
      await setDoc(invoiceRef, {
        ...invoiceData,
        status: 'approved',
        approvedDate: new Date().toISOString().split('T')[0],
        approvedBy: 'Current User',
      });
      setInvoices(invoices.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'approved' } : inv
      ));
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert('Failed to approve invoice. Please try again.');
    }
  };

  const handleReject = async (invoice) => {
    const remarks = prompt('Please provide rejection remarks:');
    if (!remarks) return;
    try {
      const { id, ...invoiceData } = invoice;
      const invoiceRef = doc(db, 'contractInvoices', id);
      await setDoc(invoiceRef, {
        ...invoiceData,
        status: 'rejected',
        rejectedDate: new Date().toISOString().split('T')[0],
        rejectedBy: 'Current User',
        rejectionRemarks: remarks,
      });
      setInvoices(invoices.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'rejected' } : inv
      ));
    } catch (error) {
      console.error('Error rejecting invoice:', error);
      alert('Failed to reject invoice. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Contract Invoices</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Invoice ID</th>
              <th className="px-4 py-2 border">College</th>
              <th className="px-4 py-2 border">Amount</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="px-4 py-2 border">{invoice.projectCode || invoice.id}</td>
                <td className="px-4 py-2 border">{invoice.collegeName || 'N/A'}</td>
                <td className="px-4 py-2 border">₹{invoice.amount.toLocaleString()}</td>
                <td className="px-4 py-2 border">{invoice.status}</td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => handleApprove(invoice)}
                    className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                    disabled={invoice.status === 'approved'}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(invoice)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    disabled={invoice.status === 'rejected'}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractInvoicesTab;