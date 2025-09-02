import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="text-9xl font-bold text-indigo-100">404</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>
            
            <Link 
              to="/" 
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-6 py-3 transition duration-300 ease-in-out transform hover:-translate-y-1"
            >
              Go Back Home
            </Link>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 text-center">
            Need help? Email us at:{" "}
            <a 
              href="mailto:connect@gryphonacademy.co.in" 
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              connect@gryphonacademy.co.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;