import React, { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import bgImage from "../../public/home/bg.avif";
import { FaArrowRight } from "react-icons/fa";
import logo from "../../src/assets/sync-black.png"; // Updated logo path
import emgageLogo from "../../src/assets/emgage.png";

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
        className="min-h-[90vh] md:min-h-[80vh] flex items-center justify-center text-gray-800 px-4 sm:px-6 py-10 sm:py-16 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <section className="text-center relative z-10 max-w-6xl px-4">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-transparent bg-clip-text drop-shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(to right, #6086fc 0%, white 40%, white 60%, #6086fc 100%)",
            }}
          >
            From Chaos to Clarity — Instantly.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-gray-100 tracking-wide text-center max-w-5xl mx-auto"
          >
            Your all-in-one solution for managing leads, trainings, placements,
           marketing, and more — effortlessly.
            <br className="hidden sm:block" />
            Empower your team with smart tools, connected workflows, and a truly
            unified experience.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
          >
            {/* SYNC Button */}
            <Link
              to="/login"
              className="relative inline-flex items-center justify-center w-full sm:w-32 h-12 bg-gray-100 text-gray-800 font-medium rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] group border border-gray-200/30"
            >
              <span className="z-10 flex items-center justify-center gap-2">
                <img 
                  src={logo} 
                  alt="SYNC Logo" 
                  className="h-5 w-auto" // Slightly smaller logo
                />
                <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1 text-gray-700" />
              </span>
              <span className="absolute right-0 w-1.5 h-full rounded-r-full bg-gray-200/50 blur-md opacity-70" />
            </Link>

            {/* Emgage Button */}
            <a
              href="https://ess.emgage.work/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center justify-center w-full sm:w-32 h-12 bg-gray-100 text-gray-800 font-medium rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] group border border-gray-200/30"
            >
              <span className="z-10 flex items-center justify-center gap-2">
                <img 
                  src={emgageLogo} 
                  alt="Emgage Logo" 
                  className="h-5 w-auto" // Slightly smaller logo
                />
                <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1 text-gray-700" />
              </span>
              <span className="absolute right-0 w-1.5 h-full rounded-r-full bg-gray-200/50 blur-md opacity-70" />
            </a>
          </motion.div>
        </section>
      </div>
    </>
  );
};

export default Home;