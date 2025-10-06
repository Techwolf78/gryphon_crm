import React from "react";

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <Icon className="mx-auto text-4xl text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-1">
        {title}
      </h3>
      {message && <p className="text-gray-500">{message}</p>}
    </div>
  );
}

export default EmptyState;
