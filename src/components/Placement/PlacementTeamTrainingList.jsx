import React, { useState } from "react";
import JDForm from "./JDForm"; // ✅ Ensure the path is correct
import MyButton from "./MyButton"; // ✅ Optional button component

function PlacementTeamTrainingList() {
  const [showJDForm, setShowJDForm] = useState(false);

  return (
    <div className="p-6">
      {/* Header and Add JD Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-800">
          Training & Closure Details (Placement View)
        </h2>
        <button
          onClick={() => setShowJDForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          + Add Job Description
        </button>
      </div>

      {/* Optional Button Demo */}
      <div className="mb-4">
        <MyButton />
      </div>

      {/* Sample Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Project Code</th>
              <th className="p-2 border">College</th>
              <th className="p-2 border">Course</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="odd:bg-white even:bg-gray-50">
              <td className="p-2 border">PRJ101</td>
              <td className="p-2 border">College A</td>
              <td className="p-2 border">MBA</td>
              <td className="p-2 border">---</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* JD Modal */}
      {showJDForm && (
        <JDForm show={showJDForm} onClose={() => setShowJDForm(false)} />
      )}
    </div>
  );
}

export default PlacementTeamTrainingList;
