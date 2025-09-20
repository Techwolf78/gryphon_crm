import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, query, orderBy, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';

const ContractInvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // First fetch from contractInvoices collection where approved is true
      const q = query(
        collection(db, 'contractInvoices'), 
        where('approved', '==', true),
        orderBy('billingDate', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'pending',
        amount: doc.data().amountRaised || doc.data().netPayableAmount || doc.data().totalCost || 0,
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
      const invoiceRef = doc(db, 'contractInvoices', invoice.id);
      await updateDoc(invoiceRef, {
        status: 'approved',
        approvedDate: new Date().toISOString().split('T')[0],
        approvedBy: 'Current User',
      });
      
      // Update local state
      setInvoices(invoices.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'approved' } : inv
      ));
      
      alert('Invoice status updated to approved!');
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert('Failed to approve invoice. Please try again.');
    }
  };

  const handleReject = async (invoice) => {
    const remarks = prompt('Please provide rejection remarks:');
    if (!remarks) return;
    
    try {
      const invoiceRef = doc(db, 'contractInvoices', invoice.id);
      await updateDoc(invoiceRef, {
        status: 'rejected',
        rejectedDate: new Date().toISOString().split('T')[0],
        rejectedBy: 'Current User',
        rejectionRemarks: remarks,
      });
      
      // Update local state
      setInvoices(invoices.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'rejected' } : inv
      ));
      
      alert('Invoice status updated to rejected!');
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
      <h2 className="text-xl font-semibold mb-4">Approved Contract Invoices</h2>
      <p className="text-gray-600 mb-4">Only invoices that have been approved are shown here.</p>
      
      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No approved invoices found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Bill Number</th>
                <th className="px-4 py-2 border">College</th>
                <th className="px-4 py-2 border">Amount</th>
                <th className="px-4 py-2 border">Installment</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td className="px-4 py-2 border">{invoice.billNumber || invoice.projectCode || invoice.id}</td>
                  <td className="px-4 py-2 border">{invoice.collegeName || 'N/A'}</td>
                  <td className="px-4 py-2 border">₹{invoice.amount.toLocaleString()}</td>
                  <td className="px-4 py-2 border">{invoice.installment || 'N/A'}</td>
                  <td className="px-4 py-2 border">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      invoice.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : invoice.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => handleApprove(invoice)}
                      className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                      disabled={invoice.status === 'approved'}
                    >
                      {invoice.status === 'approved' ? 'Approved' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(invoice)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      disabled={invoice.status === 'rejected'}
                    >
                      {invoice.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContractInvoicesTab;