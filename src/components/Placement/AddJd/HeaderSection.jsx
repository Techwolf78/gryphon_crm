import React from "react";
import {
  AcademicCapIcon,
  OfficeBuildingIcon,
  BookOpenIcon,
} from "@heroicons/react/outline";

const HeaderSection = ({ college, company, course }) => {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-4">
          Student Data Submission Portal
        </h1>
        <p className="text-blue-100 mb-6">
          Upload student information for placement process
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center">
              <AcademicCapIcon className="h-6 w-6 mr-3" />
              <div>
                <p className="text-sm text-blue-100">College</p>
                <p className="font-semibold truncate">
                  {college || "Not specified"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center">
              <OfficeBuildingIcon className="h-6 w-6 mr-3" />
              <div>
                <p className="text-sm text-blue-100">Company</p>
                <p className="font-semibold truncate">
                  {company || "Not specified"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center">
              <BookOpenIcon className="h-6 w-6 mr-3" />
              <div>
                <p className="text-sm text-blue-100">Course</p>
                <p className="font-semibold truncate">
                  {course || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderSection;
