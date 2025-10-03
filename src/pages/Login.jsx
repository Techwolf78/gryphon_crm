import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export default function LoginPage() {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // "success" or "error"
  const [fieldErrors, setFieldErrors] = useState({
    email: [],
    password: []
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  // Check for caps lock
  const handleKeyDown = (e) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  // Real-time validation
  const validateField = (fieldName, value) => {
    const errors = [];

    if (fieldName === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@gryphon(?:academy)?\.co\.in$/;
      if (!value.trim()) {
        errors.push("Email is required");
      } else if (!value.includes("@")) {
        errors.push("Email must include '@'");
      } else if (!emailRegex.test(value)) {
        errors.push("Please use a valid Gryphon email address");
      }
    }

    if (fieldName === 'password') {
      if (!value) {
        errors.push("Password is required");
      } else {
        if (value.length < 8) errors.push("At least 8 characters required");
        if (!/[A-Z]/.test(value)) errors.push("One uppercase letter required");
        if (!/\d/.test(value)) errors.push("One number required");
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) errors.push("One special character required");
      }
    }

    return errors;
  };

  const handleFieldChange = (fieldName, value) => {
    if (fieldName === 'email') setEmail(value);
    if (fieldName === 'password') setPassword(value);

    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage("");
      setMessageType("success");
    }

    // Validate field if it has been touched
    if (touched[fieldName]) {
      const errors = validateField(fieldName, value);
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: errors
      }));
    }
  };

  const handleFieldBlur = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    const value = fieldName === 'email' ? email : password;
    const errors = validateField(fieldName, value);
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errors
    }));
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
      setSuccessMessage("You have been logged out successfully!");
      setMessageType("success");
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
      email: validateField('email', email),
      password: validateField('password', password)
    };
    setFieldErrors(errors);
    setTouched({ email: true, password: true });
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");

    const validationErrors = validate();

    // Check if there are any errors
    if (validationErrors.email.length > 0 || validationErrors.password.length > 0) {
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
      // Login failed - error handled through UI feedback

      let errorMessage = "Login failed. Please try again.";

      // Handle Firebase authentication errors
      switch (error.code) {
        case "auth/user-not-found":
          setFieldErrors(prev => ({
            ...prev,
            email: ["No account found with this email address"]
          }));
          break;
        case "auth/wrong-password":
          setFieldErrors(prev => ({
            ...prev,
            password: ["Incorrect password. Please try again."]
          }));
          break;
        case "auth/invalid-email":
          setFieldErrors(prev => ({
            ...prev,
            email: ["Invalid email format"]
          }));
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled. Please contact admin.";
          break;
        default:
          errorMessage = "Login failed. Please check your credentials and try again.";
      }

      if (!errorMessage.includes("email") && !errorMessage.includes("password")) {
        setSuccessMessage(""); // Clear any success message
        setMessageType("error");
        // Show general error as message (now properly styled as error)
        setSuccessMessage(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setFieldErrors(prev => ({
        ...prev,
        email: ["Please enter your email address first"]
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      // Note: This would need to be implemented with Firebase Auth sendPasswordResetEmail
      // For now, showing the contact modal as fallback
      setShowPasswordReset(true);
    } catch {
      // Password reset failed - error handled through UI feedback
      setSuccessMessage("Failed to send reset email. Please contact IT support.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const PasswordResetModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <FaInfoCircle className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-xl font-bold text-gray-800">Reset Password</h3>
          </div>
          <button
            onClick={() => setShowPasswordReset(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Password reset functionality is not yet implemented. Please contact IT support for assistance.
          </p>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">Contact Information:</p>
            <a
              href="mailto:connect@gryphonacademy.co.in"
              className="text-blue-600 font-medium hover:text-blue-800 break-all"
            >
              connect@gryphonacademy.co.in
            </a>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowPasswordReset(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const getFieldStatus = (fieldName) => {
    if (!touched[fieldName]) return 'default';
    if (fieldErrors[fieldName].length > 0) return 'error';
    if (fieldName === 'email' && email.trim()) return 'success';
    if (fieldName === 'password' && password && fieldErrors.password.length === 0) return 'success';
    return 'default';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-4">
      {showPasswordReset && <PasswordResetModal />}

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Branding */}
        <div className="lg:w-1/2 bg-gradient-to-br from-[#1C398E] to-[#3886FF] text-white p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-white/10"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-white/10"></div>

          <div className="relative z-10 max-w-lg mx-auto lg:mx-0">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">SYNC</h1>
            <p className="text-base lg:text-lg leading-relaxed opacity-90 mb-6">
              Manage corporate relationships, track sales, and streamline your
              business processes all in one integrated platform.
            </p>

            <div className="space-y-3 hidden lg:block">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 flex-shrink-0">
                  <FaCheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm lg:text-base">Multi-department dashboards</span>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 flex-shrink-0">
                  <FaCheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm lg:text-base">Sales, L&D, Placement & Marketing</span>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 flex-shrink-0">
                  <FaCheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm lg:text-base">Role-specific data visualization</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-1/2 p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-600">Please sign in to your account</p>
            </div>

            {successMessage && (
              <div className={`${
                messageType === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              } rounded-lg p-3 flex items-start`}>
                {messageType === 'error' ? (
                  <FaExclamationTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <FaCheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  messageType === 'error' ? 'text-red-800' : 'text-green-800'
                }`}>{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className={`w-5 h-5 ${getFieldStatus('email') === 'error' ? 'text-red-400' : getFieldStatus('email') === 'success' ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@gryphon.co.in"
                    value={email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                      getFieldStatus('email') === 'error'
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : getFieldStatus('email') === 'success'
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    aria-invalid={getFieldStatus('email') === 'error'}
                    aria-describedby={fieldErrors.email.length > 0 ? "email-error" : undefined}
                  />
                  {getFieldStatus('email') === 'success' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FaCheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
                {fieldErrors.email.length > 0 && (
                  <div id="email-error" className="mt-2 flex items-start">
                    <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-red-600 text-sm space-y-1">
                      {fieldErrors.email.map((error, index) => (
                        <p key={`email-${index}`}>{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className={`w-5 h-5 ${getFieldStatus('password') === 'error' ? 'text-red-400' : getFieldStatus('password') === 'success' ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    onKeyDown={handleKeyDown}
                    className={`block w-full pl-10 pr-12 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                      getFieldStatus('password') === 'error'
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : getFieldStatus('password') === 'success'
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    aria-invalid={getFieldStatus('password') === 'error'}
                    aria-describedby={fieldErrors.password.length > 0 ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FaEyeSlash className={`w-5 h-5 ${getFieldStatus('password') === 'error' ? 'text-red-400' : 'text-gray-400'}`} />
                    ) : (
                      <FaEye className={`w-5 h-5 ${getFieldStatus('password') === 'error' ? 'text-red-400' : 'text-gray-400'}`} />
                    )}
                  </button>
                </div>
                {capsLockOn && (
                  <div className="mt-2 text-yellow-600 flex items-center text-sm">
                    <FaInfoCircle className="mr-2 flex-shrink-0" />
                    Caps Lock is on
                  </div>
                )}
                {fieldErrors.password.length > 0 && (
                  <div id="password-error" className="mt-2 flex items-start">
                    <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-red-600 text-sm space-y-1">
                      {fieldErrors.password.map((error, index) => (
                        <p key={`password-${index}`}>{error}</p>
                      ))}
                    </div>
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
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#1C398E] to-[#3886FF] hover:from-[#1C398E]/90 hover:to-[#3886FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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

            <div className="text-center text-sm text-gray-500">
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