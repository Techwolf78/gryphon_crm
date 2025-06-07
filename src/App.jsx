import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Dashboard from './pages/Dashboard'; // ✅ Import this
import Admin from './pages/Admin';
import Sales from './pages/Sales';
import Placement from './pages/Placement';
import LearningDevelopment from './pages/LearningDevelopment';
import DigitalMarketing from './pages/DigitalMarketing';

function App() {
  return (
    <AuthProvider>
      <Router>
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
            <Route index element={<Dashboard />} /> {/* ✅ This handles /dashboard */}
            <Route path="admin" element={<Admin />} />
            <Route path="sales" element={<Sales />} />
            <Route path="placement" element={<Placement />} />
            <Route path="learning-development" element={<LearningDevelopment />} />
            <Route path="digital-marketing" element={<DigitalMarketing />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
