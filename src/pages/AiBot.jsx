import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { FiUser, FiZap, FiSend, FiX, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import remarkBreaks from "remark-breaks";

const AiBot = ({ isOpen, onClose }) => {
  const [chatMessages, setChatMessages] = useState([
    {
      type: "bot",
      message:
        "Welcome! Ask about any college, program, or partnership.",
      id: 1,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "delivered"
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandRing, setExpandRing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const cannedResponses = [
    // Greetings
    { keywords: ["hi", "hello", "hey", "hey there", "hiya", "yo", "sup", "greetings"], replies: ["Hello!", "Hi there!", "Hey! How can I help?", "Greetings!", "Hey, welcome!"] },
    { keywords: ["good morning", "morning"], reply: "Good morning! How can I help you?" },
    { keywords: ["good afternoon", "afternoon"], reply: "Good afternoon! How can I assist you?" },
    { keywords: ["good evening", "evening"], reply: "Good evening! How can I help you?" },
    { keywords: ["good night", "night"], reply: "Good night! Have a great day ahead." },

    // Gratitude
    { keywords: ["thank you", "thanks", "thx", "thank u", "much appreciated", "thanks a lot", "cheers", ], replies: ["You're welcome! 😊", "Glad I could help!", "Anytime!", "No problem!"] },

    // Confirmation
    { keywords: ["ok", "okay", "alright", "fine", "sure", "sounds good", "got it", "roger", "understood", "noted", "yup", "yes"], reply: "Okay! Let me know if you have any questions." },

    // Farewell
    { keywords: ["bye", "goodbye", "see you", "see ya", "later", "take care", "farewell"], replies: ["Goodbye! Have a great day!", "See you soon!", "Take care!", "Bye!"] },

    // Welcome/Politeness
    { keywords: ["welcome", "no problem", "no worries", "my pleasure", "anytime"], reply: "Glad to help!" },

    // Bot Info
    { keywords: ["who are you", "what is your name", "your name", "who made you", "who created you"], reply: "I'm your Sales AI Assistant, here to help with college and partnership insights." },

    // Status/Feelings
    { keywords: ["how are you", "how's it going", "how do you do", "how are you doing"], reply: "I'm just a bot, but I'm here to help you!" },

    // Help/Support
    { keywords: ["help", "support", "assist", "need help", "can you help", "i need help"], reply: "How can I assist you today?" },

    // Apologies
    { keywords: ["sorry", "apologies", "my bad", "pardon"], reply: "No worries! How can I help you?" },

    // Jokes
    { keywords: ["tell me a joke", "joke", "make me laugh"], replies: [
      "Why did the computer go to the doctor? Because it had a virus!",
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "Why was the math book sad? Because it had too many problems."
    ]},

    // Compliments
    { keywords: ["great", "awesome", "cool", "nice", "well done", "good job"], reply: "Thank you! 😊" },

    // Waiting
    { keywords: ["wait", "hold on", "just a sec", "give me a moment"], reply: "Sure, take your time!" },

    // Agreement
    { keywords: ["agree", "i agree", "sounds good to me"], reply: "Glad we're on the same page!" },

    // Disagreement
    { keywords: ["disagree", "i disagree", "not really"], reply: "That's okay! Let me know how I can help." },

    // Confusion
    { keywords: ["what", "huh", "confused", "don't get it"], reply: "Let me know what you need help with!" },

    // Thanks for info
    { keywords: ["thanks for info", "thanks for the information", "thanks for your help"], reply: "You're welcome! If you have more questions, just ask." },
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    const userMsg = inputMessage.trim();
    const now = new Date();

    setChatMessages((prev) => [
      ...prev,
      {
        type: "user",
        message: userMsg,
        id: Date.now(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "sent"
      },
    ]);
    setInputMessage("");

    // Check for canned responses
    const canned = cannedResponses.find(({ keywords }) =>
      keywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(userMsg))
    );
    if (canned) {
      const reply = Array.isArray(canned.replies)
        ? canned.replies[Math.floor(Math.random() * canned.replies.length)]
        : canned.reply;
      setChatMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message: reply,
          id: Date.now() + 1,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "delivered"
        },
      ]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://openai-api-flame.vercel.app/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "bot",
            message: data.reply,
            id: Date.now() + 1,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "delivered"
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "bot",
            message: data.error || "Sorry, no response.",
            id: Date.now() + 2,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "delivered"
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message:
            "Error: Could not reach AI service. Please check your connection or try again later.",
          id: Date.now() + 3,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "delivered"
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus(); // Focus input after bot response
      }, 100);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-9999 flex items-end justify-end p-4 md:p-6">
      <div
        className="absolute inset-0 bg-linear-to-br from-slate-900/40 via-slate-800/30 to-blue-900/40 backdrop-blur-lg transition-all duration-300"
        onClick={onClose}
        aria-label="Close chat"
        tabIndex={0}
        role="button"
      />
      <div
        className={`
          relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-3xl border border-white/30 flex flex-col
          w-full
          ${isExpanded ? "h-[95vh] max-w-3xl md:w-[800px]" : "h-[600px] max-w-md md:w-96 md:h-[700px]"}
          hover:shadow-4xl ring-2 ring-blue-100/40
          transition-all duration-300
        `}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,247,250,0.98) 100%)",
        }}
        role="dialog"
        aria-labelledby="chat-title"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-slate-200/60 bg-linear-to-r from-white/90 via-slate-50/90 to-white/90 backdrop-blur-md rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-linear-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-200/40 animate-fadeIn">
                <FiZap className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h3
                id="chat-title"
                className="text-base font-extrabold bg-linear-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent tracking-tight"
              >
                Gryphon Sales AI Assistant
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                College & Partnership Insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setIsExpanded((v) => !v);
                setExpandRing(true);
                setTimeout(() => setExpandRing(false), 600); // Ring lasts 600ms
              }}
              className={`p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-all duration-200 hover:shadow-md focus:outline-none ${expandRing ? "ring-2 ring-blue-400" : ""}`}
              aria-label={isExpanded ? "Shrink chat" : "Expand chat"}
              title={isExpanded ? "Shrink chat" : "Expand chat"}
            >
              {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/80 rounded-xl transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close chat"
              title="Close chat"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto pt-3 pb-4 px-4 space-y-3 scroll-smooth custom-scrollbar">
            {chatMessages.map((msg, idx) => (
              <React.Fragment key={msg.id || idx}>
                <div
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                  style={{ animation: 'fadeIn 0.4s cubic-bezier(0.4,0,0.2,1)' }}
                >
                  <div
                    className={`flex max-w-[85%] ${msg.type === "user" ? "flex-row-reverse" : "flex-row"} items-start space-x-3`}
                  >
                    <div className={`shrink-0 ${msg.type === "user" ? "ml-2" : "mr-2"}`}>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-100/40 ${
                          msg.type === "user"
                            ? "bg-linear-to-br from-blue-500 to-blue-700"
                            : "bg-linear-to-br from-slate-100 to-slate-200"
                        } transition-all duration-200`}
                      >
                        {msg.type === "user" ? (
                          <span className="font-bold text-xs text-white">U</span>
                        ) : (
                          <FiZap className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                    <div className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`
                          relative px-4 py-2 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl
                          ${
                            msg.type === "user"
                              ? "bg-linear-to-br from-blue-500 to-blue-700 text-white ring-2 ring-blue-200"
                              : "bg-linear-to-br from-white to-slate-50/70 text-slate-800 border border-slate-200/60 backdrop-blur-md"
                          }
                          ${msg.type === "user" ? "rounded-br-md" : "rounded-bl-md"}
                          group
                        `}
                      >
                        <div className="text-sm leading-relaxed font-medium">
                          {msg.type === "bot" ? (
                            <ReactMarkdown
                              children={msg.message}
                              remarkPlugins={[remarkBreaks]}
                              skipHtml={false}
                              components={{
                                ul: (props) => (
                                  <ul style={{ marginLeft: 18, marginBottom: 10 }} {...props} />
                                ),
                                ol: (props) => (
                                  <ol style={{ marginLeft: 18, marginBottom: 10 }} {...props} />
                                ),
                                li: (props) => (
                                  <li style={{ marginBottom: 6 }} {...props} />
                                ),
                                h3: (props) => (
                                  <h3
                                    style={{
                                      fontWeight: "bold",
                                      marginTop: 10,
                                      marginBottom: 6,
                                    }}
                                    {...props}
                                  />
                                ),
                                p: (props) => (
                                  <p style={{ marginBottom: 10 }} {...props} />
                                ),
                                a: (props) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#2563eb",
                                      textDecoration: "underline",
                                      transition: "color 0.2s",
                                    }}
                                    className="hover:text-blue-700 focus:text-blue-700"
                                  />
                                ),
                              }}
                            />
                          ) : (
                            msg.message
                          )}
                        </div>
                      </div>
                      {/* Time outside message box */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold">
                          {msg.time}
                        </span>
                        {msg.type === "user" && (
                          <span className="text-xs text-blue-300">
                            {msg.status === "sent" ? "✓" : msg.status === "delivered" ? "✓✓" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {loading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex max-w-[85%] flex-row items-start space-x-3">
                  <div className="shrink-0 mr-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-100/40 bg-linear-to-br from-slate-100 to-slate-200">
                      <FiZap className="w-4 h-4 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="relative px-4 py-2 rounded-2xl shadow-lg bg-linear-to-br from-white to-slate-50/70 text-slate-800 border border-slate-200/60 backdrop-blur-md rounded-bl-md">
                      <div className="text-sm leading-relaxed font-medium">Thinking...</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="border-t border-slate-200/60 bg-linear-to-r from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md p-4 rounded-b-3xl">
          <form
            className="flex items-end space-x-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            aria-label="Send message form"
          >
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your question about a college, program, or partnership..."
                className="w-full px-4 py-2 pr-12 border border-slate-300/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 resize-none transition-all duration-200 text-sm leading-relaxed bg-white/90 backdrop-blur-md placeholder-slate-400 shadow-md hover:shadow-lg"
                style={{ minHeight: "40px", maxHeight: "120px" }}
                aria-label="Type your message"
                disabled={loading}
                autoFocus
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
                <FiSend className="w-5 h-5" />
              </span>
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="shrink-0 w-10 h-10 bg-linear-to-r from-blue-500 to-blue-700 text-white rounded-xl hover:from-blue-600 hover:to-blue-800 transition-all duration-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-xl hover:shadow-2xl disabled:shadow-md transform hover:scale-105 disabled:hover:scale-100 ring-2 ring-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Send message"
            >
              <FiSend className="w-5 h-5 transform transition-transform hover:translate-x-0.5" />
            </button>
          </form>
        </div>
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #a5b4fc 0%, #38bdf8 100%);
            border-radius: 8px;
            transition: background 0.2s;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
          }
        `}</style>
      </div>
    </div>
  );
};

export default AiBot;
