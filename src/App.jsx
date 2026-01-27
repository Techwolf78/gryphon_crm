import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import SessionManager from "./components/SessionManager";
import ErrorBoundary from "./components/ErrorBoundary";
import ConnectionStatus from "./components/ConnectionStatus";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy load all page components
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Sales = React.lazy(() => import("./pages/Sales"));
const Placement = React.lazy(() => import("./pages/Placement"));
const LearningDevelopment = React.lazy(() =>
  import("./pages/LearningDevelopment")
);
const DigitalMarketing = React.lazy(() => import("./pages/Marketing"));
const Footer = React.lazy(() => import("./pages/footer"));
const UpdateProfile = React.lazy(() => import("./components/UpdateProfile"));
const Help = React.lazy(() => import("./pages/Help"));
const TrainersDashboard = React.lazy(() =>
  import("./components/Learning/TrainersDashboard")
);
const LearningAdminAuditLogs = React.lazy(() =>
  import("./components/Learning/LearningAdminAuditLogs")
);
const PlacementAdminAuditLogs = React.lazy(() =>
  import("./components/Placement/PlacementAdminAuditLogs")
);
const HR = React.lazy(() => import("./pages/HR"));
const CA = React.lazy(() => import("./pages/CA"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Roadmap = React.lazy(() => import("./pages/Roadmap"));
const PublicInvoiceDetails = React.lazy(() =>
  import("./pages/PublicInvoiceDetails")
);
const Maintenance = React.lazy(() => import("./pages/Maintenance"));
const UploadStudentData = React.lazy(() => import("./components/Placement/AddJd/UploadStudentData")); // ✅ Space removed
const Purchase = React.lazy(() => import("./pages/Purchase"));
const Accountant = React.lazy(() => import("./pages/Accountant"));
const TrainerInvoiceAuditLogs = React.lazy(() => import("./components/Learning/Invoice/TrainerInvoiceAuditLogs"));

// Lazy load Intro page
const Intro = React.lazy(() => import("./pages/Intro"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading...</h2>
      <p className="text-gray-500">Please wait while we load the page</p>
    </div>
  </div>
);

const AppContent = () => {
  const location = useLocation();

  // Maintenance mode - show maintenance page for all routes
  const isMaintenanceMode = false;

  // Routes where navbar should not appear
  const hideNavbarRoutes = ['/404', '/upload-student-data'];

  // Component to handle dashboard redirection based on user department
  const DashboardOrRedirect = () => {
    return <Dashboard />;
  };  if (isMaintenanceMode) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Maintenance />
      </Suspense>
    );
  }

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      <SessionManager />
      <ConnectionStatus />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/invoice/*" element={<PublicInvoiceDetails />} />
          
          {/* Public route for college data upload */}
          <Route path="/upload-student-data" element={<UploadStudentData />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOrRedirect />} />
            <Route path="profile" element={<UpdateProfile />} />
            <Route path="admin" element={<Admin />} />
            <Route path="sales" element={<Sales />} />
            <Route path="placement" element={<Placement />} />
            <Route path="placement/admin" element={<PlacementAdminAuditLogs />} />
            <Route path="help" element={<Help />} />
            <Route path="learning-development">
              <Route index element={<LearningDevelopment />} />
              <Route path="trainers" element={<TrainersDashboard />} />
              <Route path="admin" element={<LearningAdminAuditLogs />} />
            </Route>
            <Route path="marketing">
              <Route index element={<DigitalMarketing />} />
              <Route path="roadmap" element={<Roadmap />} />
            </Route>
            <Route path="hr" element={<HR />} />
            <Route path="ca" element={<CA />} />
            <Route path="purchase" element={<Purchase />} />
            <Route path="accounts/*" element={<Accountant />} />
            <Route path="accounts/admin" element={<TrainerInvoiceAuditLogs />} />
            <Route path="intro" element={<Intro />} />
          </Route>

          {/* Add the 404 route - catch all unmatched routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {/* Show footer only on home page and upload page */}
      {(location.pathname === "/" || location.pathname === "/upload-student-data") && (
        <Suspense fallback={<div>Loading footer...</div>}>
          <Footer />
        </Suspense>
      )}
    </>
  );
};

const App = () => (
  <>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <Router basename="">
            <AppContent />
          </Router>
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
  </>
);
 
export default App;


