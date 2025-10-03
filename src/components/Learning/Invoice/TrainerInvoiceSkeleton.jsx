import React from "react";
import { FiSearch, FiFilter, FiRefreshCw } from "react-icons/fi";

const TrainerInvoiceSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="h-8 bg-white/20 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-blue-400/50 rounded w-64 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Filters Section Skeleton */}
        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 mb-2">
            {/* Search Skeleton */}
            <div className="flex-1 max-w-md">
              <div className="h-3 bg-gray-300 rounded w-12 mb-1 animate-pulse"></div>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <div className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-lg bg-white">
                  <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Filters Button Skeleton */}
            <div className="relative">
              <div className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-lg">
                <FiFilter className="w-3 h-3 mr-1 text-gray-400" />
                <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
              </div>
            </div>

            {/* Controls Skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-3 bg-gray-300 rounded w-24 animate-pulse"></div>
              <div className="relative inline-flex items-center h-5 w-9 rounded-full bg-gray-300">
                <div className="inline-block h-4 w-4 bg-white rounded-full transform translate-x-0.5"></div>
              </div>
              <div className="h-3 bg-gray-300 rounded w-6 animate-pulse"></div>

              <div className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
              </div>

              <div className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                <FiRefreshCw className="w-4 h-4 mr-1 text-gray-400" />
                <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Content Skeleton */}
        <div className="p-1 sm:p-2">
          <div className="space-y-2">
            {/* Skeleton for Phase 1 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Phase Header Skeleton */}
              <div className="bg-gray-50 p-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-300 rounded w-32 animate-pulse"></div>
                  <div className="bg-gray-300 text-xs font-medium px-2.5 py-1 rounded-full ml-2 w-16 h-5 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
              </div>

              {/* Table Skeleton */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Skeleton Rows */}
                    {[...Array(3)].map((_, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-2 sm:px-4 py-2">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-300 rounded-full animate-pulse"></div>
                            <div className="ml-4 space-y-1">
                              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gray-300 rounded w-20 animate-pulse"></div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-28 animate-pulse"></div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-24 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-2">
                            <div className="h-6 bg-gray-300 rounded w-full animate-pulse"></div>
                            <div className="flex gap-2">
                              <div className="h-6 bg-gray-300 rounded flex-1 animate-pulse"></div>
                              <div className="h-6 bg-gray-300 rounded flex-1 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Skeleton for Phase 2 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Phase Header Skeleton */}
              <div className="bg-gray-50 p-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-300 rounded w-32 animate-pulse"></div>
                  <div className="bg-gray-300 text-xs font-medium px-2.5 py-1 rounded-full ml-2 w-16 h-5 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
              </div>

              {/* Table Skeleton */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                      </th>
                      <th className="px-2 sm:px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Skeleton Rows */}
                    {[...Array(2)].map((_, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-2 sm:px-4 py-2">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-300 rounded-full animate-pulse"></div>
                            <div className="ml-4 space-y-1">
                              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gray-300 rounded w-20 animate-pulse"></div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-28 animate-pulse"></div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                              <div className="h-3 bg-gray-300 rounded w-24 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="space-y-2">
                            <div className="h-6 bg-gray-300 rounded w-full animate-pulse"></div>
                            <div className="flex gap-2">
                              <div className="h-6 bg-gray-300 rounded flex-1 animate-pulse"></div>
                              <div className="h-6 bg-gray-300 rounded flex-1 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerInvoiceSkeleton;