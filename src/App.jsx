import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Sales from "./pages/Sales";
import Placement from "./pages/Placement";
import LearningDevelopment from "./pages/LearningDevelopment";
import DigitalMarketing from "./pages/Marketing";
import Footer from "./pages/footer";
import UpdateProfile from "./components/UpdateProfile";
import Help from "./pages/Help";

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} /> {/* /dashboard */}
       
          <Route path="profile" element={<UpdateProfile />} />
          <Route path="admin" element={<Admin />} />
          <Route path="sales" element={<Sales />} />
          <Route path="placement" element={<Placement />} />
             <Route path="help" element={<Help />} />
          <Route
            path="learning-development"
            element={<LearningDevelopment />}
          />
          <Route path="marketing" element={<DigitalMarketing />} />
        </Route>
      </Routes>

      {location.pathname === "/" && <Footer />}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <Router >
      <AppContent />
    </Router>
  </AuthProvider>
);

export default App;
