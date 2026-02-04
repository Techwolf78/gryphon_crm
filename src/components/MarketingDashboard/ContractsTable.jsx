import React from "react";

const ContractsTable = ({ contracts = [], onDelete, onUpdate, onEdit, onView }) => {

  if (!contracts || contracts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">No contracts yet. Add a contract using the form.</div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <table className="min-w-full table-auto border-collapse max-w-full">
        <thead>
          <tr className="text-left bg-gray-50">
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700">Project Code</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700 w-64">College</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700">Service</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700">Total Cost</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700 w-24">Start Date</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700 w-24">End Date</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700 hidden md:table-cell">Status</th>
            <th className="px-1 py-3 border-b text-sm font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {contracts.map((c) => {
            const today = new Date();
            const endDate = new Date(c.raw?.contractEndDate);
            const diffTime = endDate - today;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            let status = "new";
            if (diffDays <= 90 && diffDays >= 0) {
              status = "renewal";
            }

            return (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-1 py-3 align-top border-b">
                <div className="font-medium text-gray-900 text-sm truncate">{c.title || "Untitled"}</div>
              </td>

              <td className="px-1 py-3 align-top border-b w-64">
                <div className="text-sm text-gray-700 wrap-break-word">{c.client || "—"}</div>
              </td>

              <td className="px-1 py-3 align-top border-b">
                <div className="text-sm text-gray-700">
                  <div>{c.raw?.course || "—"}</div>
                  <div className="text-xs text-gray-500">{c.raw?.deliveryType || ""}</div>
                </div>
              </td>

              <td className="px-1 py-3 align-top border-b">
                <div className="text-sm text-gray-700">₹{c.raw?.totalCost ? c.raw.totalCost.toLocaleString('en-IN') : "—"}</div>
              </td>

              <td className="px-1 py-3 align-top border-b w-24">
                <div className="text-sm text-gray-700">{c.startDate || "—"}</div>
              </td>

              <td className="px-1 py-3 align-top border-b w-24">
                <div className="text-sm text-gray-700">{c.endDate || "—"}</div>
              </td>

              <td className="px-1 py-3 align-top border-b hidden md:table-cell">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  status === 'new' ? 'bg-green-100 text-green-800' :
                  status === 'renewal' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              </td>

              <td className="px-1 py-3 align-top border-b">
                <div className="flex items-center gap-2">
                  <button onClick={()=>onView && onView(c)} className="px-3 py-1 rounded-md bg-green-50 text-green-600 border border-green-100 text-sm">View</button>
                  <button onClick={()=>onEdit && onEdit(c)} className="px-3 py-1 rounded-md bg-white border border-gray-200 text-sm">Edit</button>
                  <button onClick={()=>onDelete && onDelete(c.id)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm">Delete</button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ContractsTable;
