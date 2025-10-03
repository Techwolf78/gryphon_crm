import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import MsalProviderWrapper from "./context/MsalProviderWrapper";
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
import SessionManager from "./components/SessionManager";
import TrainersDashboard from "./components/Learning/TrainersDashboard";
import HR from "./pages/HR";
import CA from "./pages/CA";
import NotFound from "./pages/NotFound"; // Import the new component
import Roadmap from "./pages/Roadmap";
 
const AppContent = () => {
  const location = useLocation();
 
  return (
    <>
      {location.pathname !== "/404" && <Navbar />}
      <SessionManager />
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
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<UpdateProfile />} />
          <Route path="admin" element={<Admin />} />
          <Route path="sales" element={<Sales />} />
          <Route path="placement" element={<Placement />} />
          <Route path="help" element={<Help />} />
          <Route path="learning-development">
            <Route index element={<LearningDevelopment />} />
            <Route path="trainers" element={<TrainersDashboard />} />
          </Route>
          <Route path="marketing">
            <Route index element={<DigitalMarketing />} />
            <Route path="roadmap" element={<Roadmap />} />
          </Route>
          <Route path="hr" element={<HR />} />
          <Route path="ca" element={<CA />} />
        </Route>
       
        {/* Add the 404 route - catch all unmatched routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {location.pathname === "/" && <Footer />}
    </>
  );
};
 
const App = () => (
  <MsalProviderWrapper>
    <AuthProvider>
      <Router basename="/">
        <AppContent />
      </Router>
    </AuthProvider>
  </MsalProviderWrapper>
);
 
export default App;
 
