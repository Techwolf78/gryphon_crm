import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GenerateTrainerInvoice from '../components/Learning/GenerateTrainerInvoice';
import ContractInvoiceTable from '../components/Learning/ContractInvoices/ContractInvoiceTable';
import { FileText, File, Shield } from 'lucide-react';

const Accountant = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('accounts_activeTab') || 'trainer-invoice';
    } catch {
      return 'trainer-invoice';
    }
  });
  const tabs = [
    { id: 'trainer-invoice', label: 'Trainer Invoice', icon: <FileText size={16} /> },
    { id: 'contract-invoices', label: 'Contract Invoices', icon: <File size={16} /> },
    { id: 'admin', label: 'Audit Logs', icon: <Shield size={16} />, isRoute: true },
  ];
  const containerRef = useRef(null);
  const tabRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useEffect(() => {
    try {
      localStorage.setItem('accounts_activeTab', activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  useEffect(() => {
    const updateIndicator = () => {
      const index = tabs.findIndex(t => t.id === activeTab);
      const el = tabRefs.current[index];
      const containerEl = containerRef.current;
      if (el && containerEl) {
        const left = el.offsetLeft - containerEl.offsetLeft;
        setIndicator({ left, width: el.offsetWidth });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  return (
    <div className="bg-white rounded-md shadow-sm">
      <div className="bg-white border border-gray-100 rounded-md shadow-sm">
        <div className="flex items-center justify-between gap-2 px-2 pt-2 pb-1">
          <div>
            <h1 className="text-2xl font-semibold text-blue-800">Accounts Dashboard</h1>
            <p className="text-md text-gray-500">Invoices and contract management</p>
          </div>
          <div className="relative">
            <div ref={containerRef} className="flex border-b border-gray-200 justify-center gap-2">
            {tabs.map((t, idx) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => {
                  if (t.isRoute) {
                    navigate('/dashboard/accounts/admin');
                  } else {
                    setActiveTab(t.id);
                  }
                }}
                className={`flex-none px-4 py-2 flex items-center gap-2 justify-center text-sm font-medium rounded-md transition-all duration-150 ${
                  activeTab === t.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                ref={(el) => (tabRefs.current[idx] = el)}
              >
                <span className={`text-sm ${activeTab === t.id ? 'text-blue-600' : 'text-gray-500'}`}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
            <div
              className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-150 ease-out rounded"
              style={{ width: indicator.width ? `${indicator.width}px` : 0, left: indicator.left ? `${indicator.left}px` : 0 }}
            />
          </div>
        </div>
        <div className="p-1">

          {activeTab === 'trainer-invoice' && <GenerateTrainerInvoice />}
          {activeTab === 'contract-invoices' && <ContractInvoiceTable />}
        </div>
      </div>
    </div>
  );
};

export default Accountant;