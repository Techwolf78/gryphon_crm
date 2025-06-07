import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

useEffect(() => {
  if (user) {
    // Redirect based on role
    if (user.role === 'admin') {
      navigate('/dashboard');
    } else if (user.role === 'sales') {
      navigate('/dashboard/sales');
    } else if (user.role === 'placement') {
      navigate('/dashboard/placement');
    } else if (user.role === 'learning') {
      navigate('/dashboard/learning-development');
    } else if (user.role === 'marketing') {
      navigate('/dashboard/digital-marketing');
    } else {
      navigate('/'); // fallback or guest landing page
    }
  }
}, [user, navigate]);


const handleLogin = async (e) => {
  e.preventDefault();
  setErr('');
  try {
    await login(email, password);
    // Don't navigate here, useEffect will handle redirect
  } catch (error) {
    console.error('Login failed:', error);
    setErr('Invalid credentials');
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
          Log in to Gryphon CRM
        </h2>

        {err && (
          <p className="text-red-600 bg-red-100 px-4 py-2 rounded mb-4 text-sm text-center">
            {err}
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
        >
          Log In
        </button>

        <p className="mt-6 text-sm text-center text-gray-600">
          Need an account? Contact your Gryphon admin.
        </p>
      </form>
    </div>
  );
};

export default Login;
