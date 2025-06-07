import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-gray-800">


      {/* Hero Section */}
      <section className="flex items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-gray-900">
            Build Smarter with <span className="text-blue-600">Gryphon CRM</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            A modern CRM for Gryphon Academy. Streamline your operations with vibrant design,
            smooth animations, and an intuitive user experience.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Features</h2>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
            <div className="bg-blue-50 p-6 rounded shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-blue-700">Lead Management</h3>
              <p className="mt-2 text-gray-600">Track and manage prospects with intelligent automation.</p>
            </div>
            <div className="bg-blue-50 p-6 rounded shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-blue-700">Analytics Dashboard</h3>
              <p className="mt-2 text-gray-600">Gain real-time insights with customizable dashboards.</p>
            </div>
            <div className="bg-blue-50 p-6 rounded shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-blue-700">Collaboration Tools</h3>
              <p className="mt-2 text-gray-600">Work together with your team seamlessly inside the CRM.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-gray-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6 text-left">
            <div className="bg-white p-6 rounded shadow">
              <h4 className="font-semibold text-lg">Is Gryphon CRM free to use?</h4>
              <p className="text-gray-600 mt-1">Yes, we offer a free tier with core features. Premium plans are also available.</p>
            </div>
            <div className="bg-white p-6 rounded shadow">
              <h4 className="font-semibold text-lg">Can I use Gryphon CRM on mobile?</h4>
              <p className="text-gray-600 mt-1">Absolutely! Our platform is fully responsive and works across all devices.</p>
            </div>
            <div className="bg-white p-6 rounded shadow">
              <h4 className="font-semibold text-lg">Is my data secure?</h4>
              <p className="text-gray-600 mt-1">Yes, we use industry-standard encryption and cloud security best practices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-center py-6 border-t mt-10">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} Gryphon CRM. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
