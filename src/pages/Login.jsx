import React, { useState, useEffect, useContext } from "react";
import { setAuthPersistence } from '../firebase'; // Add this import
import { useNavigate, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaInfoCircle } from "react-icons/fa";



export default function LoginPage() {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [errorModal, setErrorModal] = useState({
    show: false,
    errors: {
      email: [],  // Will store email-specific errors
      password: [] // Will store password-specific errors
    }
  });
  // Check for caps lock
  const handleKeyDown = (e) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.showLogoutToast) {
      setErrorModal({
        show: true,
        errors: {
          email: [],
          password: ["Logged out successfully!"]
        }
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  useEffect(() => {
    if (user) {
      const roleRoutes = {
        admin: "/dashboard",
        sales: "/dashboard/sales",
        placement: "/dashboard/placement",
        learning: "/dashboard/learning-development",
        marketing: "/dashboard/marketing",
      };
      navigate(roleRoutes[user.role] || "/");
    }
  }, [user, navigate]);

  const validate = () => {
    const errors = {
      email: [],
      password: []
    };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gryphon(?:academy)?\.co\.in$/;

    // Validate email
    if (!email.trim()) {
      errors.email.push("• Email is required");
    }
    if (email.trim() && !email.includes("@")) {
      errors.email.push("• Email must include '@'");
    }
    if (email.trim() && email.includes("@") && !emailRegex.test(email)) {
      errors.email.push("• Use valid Gryphon email");
    }

    // Validate password
    if (!password) {
      errors.password.push("• Password is required");
    }
    if (password && password.length < 8) {
      errors.password.push("• At least 8 characters");
    }
    if (password && !/[A-Z]/.test(password)) {
      errors.password.push("• One uppercase letter");
    }
    if (password && !/\d/.test(password)) {
      errors.password.push("• One number");
    }
    if (password && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.password.push("• One special character");
    }

    return errors;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validationErrors = validate();

    // Show modal if there are any errors
    if (validationErrors.email.length > 0 || validationErrors.password.length > 0) {
      setErrorModal({
        show: true,
        errors: validationErrors
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorModal({
        show: true,
        errors: {
          email: [],
          password: ["Invalid email or password. Please try again."]
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const ErrorModal = () => (
    <div className="fixed inset-0  bg-black/30 backdrop-blur-md backdrop-saturate-150 backdrop-contrast-75 transition-all  duration-300 flex items-center justify-center z-54">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800">Please fix these issues</h3>
          </div>
          <button
            onClick={() => setErrorModal({ show: false, errors: { email: [], password: [] } })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          {/* Always show email errors section if there are any */}
          {errorModal.errors.email.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
              <h4 className="font-medium text-red-700 mb-2">Email Issues</h4>
              <div className="space-y-1 text-red-600">
                {errorModal.errors.email.map((error, index) => (
                  <p key={`email-${index}`}>{error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Always show password errors section if there are any */}
          {errorModal.errors.password.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
              <h4 className="font-medium text-red-700 mb-2">Password Requirements</h4>
              <div className="space-y-1 text-red-600">
                {errorModal.errors.password.map((error, index) => (
                  <p key={`password-${index}`}>{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setErrorModal({ show: false, errors: { email: [], password: [] } })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
  const ContactModal = () => (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Password Reset Assistance
          </h3>
          <button
            onClick={() => setShowContactModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-gray-600">
            For password reset requests, please contact the IT Team or email us
            at:
          </p>
          <div className="bg-blue-50 p-4 rounded-md">
            <a
              href="mailto:connect@gryphonacademy.co.in"
              className="text-blue-600 font-medium break-all"
            >
              connect@gryphonacademy.co.in
            </a>
          </div>
          <p className="text-sm text-gray-500">
            Our team will assist you with resetting your password.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowContactModal(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center bg-gray-50 font-sans h-[80vh]">
      {/* Add ErrorModal */}
      {errorModal.show && <ErrorModal />}

      {showContactModal && <ContactModal />}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left Side - Branding */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#1C398E] to-[#3886FF] text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-white/10"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-white/10"></div>

          <div className="relative z-10 max-w-md mx-auto md:mx-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">SYNC</h1>
            <p className="text-sm md:text-base leading-relaxed opacity-90">
              Manage corporate relationships, track sales, and streamline your
              business processes all in one integrated platform.
            </p>

            <div className="mt-12 hidden md:block">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm">Multi-department dashboards</span>
              </div>
              <div className="flex items-center mt-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm">
                  Sales, L&D, Placement & Marketing
                </span>
              </div>
              <div className="flex items-center mt-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm">
                  Role-specific data visualization
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center md:text-left mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Login</h2>
              <p className="text-gray-600">
                Welcome back! Please enter your credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="name@gryphon.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash className="text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FaEye className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {capsLockOn && (
                  <div className="mt-1 text-sm text-yellow-600 flex items-center">
                    <FaInfoCircle className="mr-1" /> Caps Lock is on
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-[#1C398E] to-[#3886FF] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-opacity disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <a
                href="mailto:connect@gryphonacademy.co.in"
                className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline"
              >
                Contact Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}