import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Sales from './pages/Sales';
import Placement from './pages/Placement';
import LearningDevelopment from './pages/LearningDevelopment';
import DigitalMarketing from './pages/DigitalMarketing';
import Footer from './pages/footer';
import UpdateProfile from './components/UpdateProfile'; 

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<UpdateProfile />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="admin" element={<Admin />} />
          <Route path="sales" element={<Sales />} />
          <Route path="placement" element={<Placement />} />
          <Route path="learning-development" element={<LearningDevelopment />} />
          <Route path="digital-marketing" element={<DigitalMarketing />} />
        </Route>
      </Routes>

      {(location.pathname === '/' || location.pathname === '/login') && <Footer />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
