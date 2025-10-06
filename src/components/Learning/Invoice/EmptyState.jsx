import React from "react";

function EmptyState({ icon: IconComponent, title, message }) {
  return (
    <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
      <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-sm border">
        <IconComponent className="w-full h-full text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-3">
        {title}
      </h3>
      {message && (
        <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      )}
    </div>
  );
}

export default EmptyState;
