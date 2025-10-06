import React from "react";

function Header() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Trainer Invoice</h1>
          <p className="text-blue-100 opacity-90">
            Generate and manage invoices for trainers
          </p>
        </div>
      </div>
    </div>
  );
}

export default Header;
