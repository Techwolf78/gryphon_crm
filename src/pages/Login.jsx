import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";
 
export default function LoginPage() {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
 
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);
 
  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/dashboard");
      else if (user.role === "sales") navigate("/dashboard/sales");
      else if (user.role === "placement") navigate("/dashboard/placement");
      else if (user.role === "learning") navigate("/dashboard/learning-development");
      else if (user.role === "marketing") navigate("/dashboard/marketing");
      else navigate("/");
    }
  }, [user, navigate]);
 
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gryphon(?:academy)?\.co\.in$/;
 
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Email must include '@'";
    else if (!emailRegex.test(email))
      newErrors.email = "Use valid Gryphon email";
 
    const passwordErrors = [];
    if (!password) passwordErrors.push("Password is required");
    else {
      if (password.length < 8) passwordErrors.push("At least 8 characters");
      if (!/[A-Z]/.test(password)) passwordErrors.push("One uppercase");
      if (!/\d/.test(password)) passwordErrors.push("One number");
      if (!/[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]/.test(password))
        passwordErrors.push("One special character");
    }
 
    if (passwordErrors.length > 0)
      newErrors.password = passwordErrors.join(", ");
    return newErrors;
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const newErrors = validate();
    setErrors(newErrors);
 
    if (Object.keys(newErrors).length === 0) {
      try {
        await login(email, password);
        setLoginError("");
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberedPassword", password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
      } catch (error) {
        console.error("Login failed:", error);
        setLoginError("Invalid credentials");
      }
    }
  };
 
  const ResetPassword = ({ onBack }) => {
    const [resetEmail, setResetEmail] = useState("");
    return (
      <div className="flex justify-center items-center py-10 bg-white font-sans h-[75vh]">
        <div className="w-full max-w-sm bg-white shadow-2xl rounded-xl p-8">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#1C398E] mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a6 6 0 00-6 6v2H3a1 1 0 000 2h1v5a2 2 0 002 2h8a2 2 0 002-2v-5h1a1 1 0 000-2h-1V8a6 6 0 00-6-6zm0 2a4 4 0 014 4v2H6V8a4 4 0 014-4zm-3 8a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
            <label className="text-sm text-gray-600 w-full text-left mb-1 mt-4">
              Email
            </label>
            <div className="flex items-center border border-gray-300 rounded w-full px-3 py-2 mb-4">
              <FaEnvelope className="text-gray-400 mr-2" />
              <input
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
            <button className="w-full bg-[#1C398E] text-white font-semibold py-2 rounded mb-3">
              Send Reset Instructions
            </button>
            <button
              onClick={onBack}
              className="text-blue-700 hover:underline text-sm mt-2"
            >
              Back to Log In
            </button>
          </div>
        </div>
      </div>
    );
  };
 
  if (showResetPassword)
    return <ResetPassword onBack={() => setShowResetPassword(false)} />;
 
  return (
    <div className="py-6 flex items-center justify-center bg-white font-sans relative overflow-hidden">

      <div className="w-[60%] h-[70vh]  rounded-xl flex relative shadow-lg overflow-hidden bg-white z-10">

        <div className="w-1/2 relative flex items-start justify-center pt-20 overflow-hidden bg-transparent">
          <div className="absolute w-[650px] h-[650px] rounded-full top-[-250px] left-[-250px] z-0 bg-[radial-gradient(circle_at_top_left,_#3886FF_0%,_#1C398E_60%,_#0f1e47_100%)]"></div>
          <div className="absolute w-[130px] h-[130px] rounded-full top-[250px] left-[250px] z-20 shadow-xl bg-gradient-to-br from-[#3886FF] via-[#2952B0] to-[#1C398E]"></div>
          <div className="absolute w-[350px] h-[350px] rounded-full bottom-[-200px] left-[-150px] z-10 bg-[linear-gradient(135deg,_#1C398E,_#2952B0,_#0f1e47)]"></div>
          <div className="z-30 text-white text-left max-w-[350px]">
            <h1 className="text-5xl font-bold mb-2">WELCOME</h1>
            <h2 className="text-lg font-bold mb-4">TO GRYPHON CRM</h2>
            <p className="text-sm leading-relaxed">
              Manage customer relationships, track sales, and streamline your
              business all in one place.
            </p>
          </div>
        </div>
 
        <div className="w-1/2 flex items-center justify-center px-20 z-40 bg-white relative">
          <form onSubmit={handleSubmit} className="w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Log in</h2>
            <p className="text-sm text-gray-500 mb-4">
              Welcome back! Please enter your details.
            </p>
 
            {loginError && (
              <p className="text-red-600 bg-red-100 px-4 py-2 rounded mb-4 text-sm text-center">
                {loginError}
              </p>
            )}
 
            <div className="mb-4">
              <div className="flex items-center border border-blue-800 rounded w-full pl-3 pr-4 py-3">
                <FaEnvelope className="text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, email: true }))
                  }
                  className="flex-1 outline-none text-sm"
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email}</p>
              )}
            </div>
 
            <div className="mb-4">
              <div className="flex items-center border border-blue-800 rounded w-full pl-3 pr-4 py-3">
                <FaLock className="text-gray-400 mr-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, password: true }))
                  }
                  className="flex-1 outline-none text-sm"
                />
                <span
                  className="text-blue-800 cursor-pointer ml-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {touched.password && errors.password && (
                <p className="text-red-600 text-xs mt-1">{errors.password}</p>
              )}
            </div>
 
            <div className="flex justify-between items-center mb-4 text-sm">
              <label className="flex items-center space-x-2 text-gray-600">
                <input
                  type="checkbox"
                  className="accent-blue-800"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="text-blue-800 hover:underline"
                onClick={() => setShowResetPassword(true)}
              >
                Forgot Password?
              </button>
            </div>
 
            <button
              type="submit"
              className="bg-[#1C398E] hover:bg-blue-800 text-white py-3 rounded w-full font-semibold mb-4 cursor-pointer"
            >
              Log in
            </button>
 
            <p className="text-sm text-center text-gray-500">
              Don’t have an account?{" "}
              <a href="#" className="text-blue-800 font-medium">
                Contact Admin
              </a>
            </p>
          </form>
 
          <div className="absolute w-[200px] h-[200px] bg-gradient-to-br from-[#1C398E] to-[#3886FF] rounded-full bottom-[-90px] right-[-100px] z-0"></div>
        </div>
      </div>
    </div>
  );
}
 
 