import React, { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import bgImage from '../../public/home/bg.avif';
import faqBg from '../../public/home/faq-bg.avif';
import img1 from '../../public/home/1.png';
import img2 from '../../public/home/2.png';
import img3 from '../../public/home/3.png';
import img4 from '../../public/home/4.png';
import { FaArrowRight } from "react-icons/fa";

import emgage from '../../public/home/emgage.png'
import grm from '../../public/home/grm.jpg'
const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <>
      {/* Hero Section */}
      <div
        className="min-h-[90vh] flex items-center justify-center text-gray-800 px-4 py-10 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <section className="text-center relative z-10 max-w-full">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="text-7xl md:text-7xl font-extrabold leading-tight bg-gradient-to-r from-[#6086fc] via-white to-[#6086fc] text-transparent bg-clip-text drop-shadow-lg"
          >
            “From Chaos to Clarity — Instantly.”
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-6 text-lg text-gray-100 tracking-wide text-center"
          >
            Your all-in-one solution for managing leads, lessons, projects, payroll, and more — effortlessly.
            <br />
            Empower your team with smart tools, connected workflows, and a truly unified experience.
          </motion.p>
    <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 1.2, duration: 0.8 }}
  className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
>
  {/* Get Started Button */}
  

<Link
  to="/login"
  className="relative inline-flex items-center justify-center w-44 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.8)] group"
>
  <span className="z-10 flex items-center gap-2">
    Get Started
    <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
  </span>
  <span className="absolute right-0 w-2 h-full rounded-r-full bg-purple-500 blur-xl opacity-80" />
</Link>


  {/* Emgage Button */}
  <a
    href="https://ess.emgage.work/"
    target="_blank"
    rel="noopener noreferrer"
    className="relative inline-flex items-center justify-center w-44 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-full shadow-lg transition-all duration-300 hover:shadow-[0_0_10px_rgba(139,92,246,0.7)] hover:scale-105"
  >
      {/* <img src={emgage} alt="Emgage" className="w-5 h-5 object-contain mr-2" /> */}
    <span className="z-10">Emgage HRMS</span>
    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 transition-opacity duration-300 hover:opacity-20" />
  </a>
</motion.div>



        </section>
      </div>

      {/* Features Section */}
      <section id="features" className="py-12 px-4 bg-white text-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-12 text-[#083F68]">Features</h2>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {[img1, img2, img3, img4].map((img, idx) => {
              const titles = [
                "Lead Management",
                "Analytics Dashboard",
                "Collaboration Tools",
                "Client Support"
              ];
              const desc = [
                "Track and manage prospects with intelligent automation.",
                "Gain real-time insights with customizable dashboards.",
                "Work together with your team seamlessly inside the CRM.",
                "Enjoy personalized assistance for any of your concerns."
              ];
              return (
                <div
                  key={idx}
                  className="group bg-gradient-to-br from-[#083F68] to-[#0d4e7a] text-white p-4 rounded shadow-md transition-all duration-300 flex flex-col items-center text-center hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] hover:-translate-y-1"
                >
                  <div
                    className="w-28 h-28 mb-4 flex items-center justify-center bg-white 
                      rounded-tl-[40px] rounded-br-[40px] 
                      rounded-tr-none rounded-bl-none
                      group-hover:rounded-full 
                      transition-all duration-500 ease-in-out"
                  >
                    <img src={img} alt={titles[idx]} className="w-20 h-20 object-contain" />
                  </div>
                  <h3 className="text-xl font-semibold">{titles[idx]}</h3>
                  <p className="mt-2 text-white/90">{desc[idx]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="relative px-4 py-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${faqBg})` }}
      >
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h2 className="text-4xl font-bold mb-10 text-center text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: "Is Gryphon CRM free to use?",
                answer: "Yes, we offer a free tier with core features. Premium plans are also available."
              },
              {
                question: "Can I use Gryphon CRM on mobile?",
                answer: "Absolutely! Our platform is fully responsive and works across all devices."
              },
              {
                question: "Is my data secure?",
                answer: "Yes, we use industry-standard encryption and cloud security best practices."
              }
            ].map((item, index) => (
              <div
                key={index}
                className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 transition-all duration-300 hover:bg-white/20 hover:shadow-lg cursor-pointer overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">{item.question}</h3>
                  <svg
                    className="w-5 h-5 text-white/80 transition-transform duration-300 group-hover:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-300 group-hover:max-h-40 mt-0 group-hover:mt-3">
                  <p className="text-white/80">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
