// ✅ FIXED - AiBot Component with Correct API Endpoint

import React, { useState, useRef, useEffect } from "react";
import {
  FiMessageSquare,
  FiX,
  FiSend,
  FiLoader,
  FiUser,
  FiMessageCircle,
  FiMaximize2,
  FiMinimize2,
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiSettings,
  FiZap,
} from "react-icons/fi";

const AiBot = ({ isOpen, onClose }) => {
  const [chatMessages, setChatMessages] = useState([
    { 
      type: "bot", 
      message: "नमस्ते! I'm SYNC AI assistant specialized in Indian higher education. I can help you with:\n\n• Indian college placement statistics & packages (in INR)\n• IIT/NIT/IIIT admission processes & cutoffs\n• AICTE/UGC approved institutions\n• TPO contact details for Indian colleges\n• JEE/NEET/CAT/GATE exam information\n• State quota vs All-India quota details\n\nWhat would you like to know about Indian education?",
      timestamp: new Date(),
      id: 1
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true); // ✅ CHANGED: Default to maximized
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  // ✅ FIXED - Correct API endpoint without .js extension
  const getAIResponse = async (question) => {
    try {
      console.log("Sending request to API:", question); // Debug log
      
      const response = await fetch(
        "https://ask-ai-mu-blue.vercel.app/api/ask-ai", // ✅ FIXED: Removed .js
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: question
          }),
        }
      );

      console.log("API Response status:", response.status); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Result:", result); // Debug log
      
      if (result && result.response) {
        // ✅ IMPROVED - Better handling of the AI response format
        let aiResponse = result.response;
        
        // Remove markdown formatting for cleaner display
        aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
        aiResponse = aiResponse.replace(/🤖\s*\*\*AI Summary for:.*?\*\*\s*/g, ''); // Remove AI header
        aiResponse = aiResponse.replace(/---[\s\S]*?$/g, ''); // Remove source info section
        
        return {
          response: aiResponse.trim() || "I found some information but couldn't format it properly. Please try rephrasing your question.",
          sourceUrl: result.sourceUrl,
          hasContent: result.hasScrapedContent
        };
      }
      
      return { 
        response: "I'm sorry, I couldn't find any relevant information for your question. Please try asking about specific colleges, placement statistics, or educational topics.", 
        sourceUrl: null,
        hasContent: false 
      };
    } catch (error) {
      console.error("AI API Error:", error);
      return { 
        response: `I'm experiencing technical difficulties connecting to my knowledge base. Please try again in a moment. (Error: ${error.message})`, 
        sourceUrl: null,
        hasContent: false 
      };
    }
  };

  // ✅ IMPROVED - Enhanced fallback responses
  const getSimpleResponse = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes("hello") || lowerQuestion.includes("hi") || lowerQuestion.includes("namaste")) {
      return "नमस्ते! I'm SYNC AI assistant specialized in Indian higher education. I can help you with:\n\n• Indian college placement data & salary packages (INR)\n• IIT/NIT/IIIT admission processes & cutoffs\n• AICTE/UGC approved institutions & rankings\n• TPO contact information for Indian colleges\n• JEE/NEET/CAT/GATE exam guidance\n• Reservation policies & state quota details\n\nWhat specific information about Indian education do you need?";
    }
    
    if (lowerQuestion.includes("help")) {
      return " I'm SYNC AI assistant here to help with Indian educational research! Try asking me about:\n\n• Specific Indian colleges (e.g., 'IIT Delhi placement statistics')\n• Admission processes (e.g., 'JEE Advanced cutoff 2025')\n• Indian technology trends (e.g., 'AI courses in Indian engineering colleges')\n• Placement packages (e.g., 'average package at NIT Trichy')\n• Contact details (e.g., 'TPO contact IIT Bombay')\n\nWhat Indian educational information do you need?";
    }
    
    if (lowerQuestion.includes("what") && lowerQuestion.includes("you")) {
      return " I'm SYNC AI assistant specialized in Indian higher education market intelligence. I focus on:\n\n• Indian colleges, universities & deemed institutions\n• NIRF rankings & NAAC accreditation status\n• Placement statistics with INR salary packages\n• Indian admission processes & cutoff trends\n• AICTE/UGC guidelines & government policies\n• TPO contacts & college administration details\n\nI'm particularly good at finding current data about Indian engineering colleges, medical colleges, management institutes, and their placement records.";
    }
    
    const genericResponses = [
      " I'm SYNC AI assistant and I'd be happy to help you research Indian educational topics! Could you be more specific about which Indian college or exam you're interested in?",
      " That's an interesting question about Indian education. I'm SYNC AI assistant - can you tell me more about what specific information you're looking for?",
      " I'm SYNC AI assistant and I specialize in Indian higher education research. What particular aspect of Indian colleges or exams would you like me to investigate?",
      " I'm SYNC AI assistant and I can help you find detailed information about Indian colleges, placements, and educational trends. What specific Indian educational data do you need?"
    ];
    
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  };

  const formatMessageLine = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    let formattedText = text.replace(boldRegex, '<strong class="font-semibold text-slate-900">$1</strong>');
    
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    formattedText = formattedText.replace(linkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline decoration-blue-600/30 hover:decoration-blue-700 transition-colors">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const clearChat = () => {
    setChatMessages([
      { 
        type: "bot", 
        message: " Chat cleared! I'm SYNC AI assistant - how can I help you with Indian education today?",
        timestamp: new Date(),
        id: Date.now()
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isLoading) {
      const userMessage = inputMessage.trim();
      
      setChatMessages((prev) => [
        ...prev,
        { 
          type: "user", 
          message: userMessage,
          timestamp: new Date(),
          id: Date.now()
        },
      ]);
      
      setInputMessage("");
      setIsLoading(true);
      setIsTyping(true);

      setChatMessages((prev) => [
        ...prev,
        { 
          type: "bot", 
          message: "🔍 Analyzing your query and searching for relevant information...", 
          isTyping: true,
          timestamp: new Date(),
          id: Date.now() + 1
        },
      ]);

      try {
        // ✅ NEW - Check for simple responses first
        const lowerQuestion = userMessage.toLowerCase();
        const simpleKeywords = ['hello', 'hi', 'namaste', 'help', 'what are you', 'who are you'];
        const isSimpleQuery = simpleKeywords.some(keyword => lowerQuestion.includes(keyword));
        
        if (isSimpleQuery) {
          // Use simple response for greetings and basic questions
          const simpleResponse = getSimpleResponse(userMessage);
          
          setTimeout(() => {
            setChatMessages((prev) => {
              const newMessages = prev.filter(msg => !msg.isTyping);
              return [...newMessages, { 
                type: "bot", 
                message: simpleResponse,
                timestamp: new Date(),
                id: Date.now() + 3
              }];
            });
            setIsTyping(false);
          }, 1000);
        } else {
          // Use AI API for complex queries
          const result = await getAIResponse(userMessage);
          
          setTimeout(() => {
            setChatMessages((prev) => {
              const newMessages = prev.filter(msg => !msg.isTyping);
              
              let responseMessage = result.response;
              
              // ✅ ADD SOURCE LINK if available
              if (result.sourceUrl && result.hasContent) {
                responseMessage += `\n\n🔗 **Source:** [View Details](${result.sourceUrl})`;
              }
              
              return [...newMessages, { 
                type: "bot", 
                message: responseMessage,
                timestamp: new Date(),
                id: Date.now() + 3,
                sourceUrl: result.sourceUrl
              }];
            });
            setIsTyping(false);
          }, 1000);
        }
      } catch (error) {
        console.error("Message handling error:", error);
        // ✅ FALLBACK - Use simple response if API fails
        const fallbackResponse = getSimpleResponse(userMessage);
        
        setChatMessages((prev) => {
          const newMessages = prev.filter(msg => !msg.isTyping);
          return [...newMessages, { 
            type: "bot", 
            message: fallbackResponse || "I encountered an error while processing your request. Please try again or rephrase your question.",
            timestamp: new Date(),
            id: Date.now() + 4
          }];
        });
        setIsTyping(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4 md:p-6">
      {/* Enhanced Backdrop with blur */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-blue-900/30 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close chat"
      />

      {/* Enhanced Chat Window */}
      <div 
        className={`
          relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col
          transition-all duration-500 ease-out transform
          ${isMaximized 
            ? 'w-full h-full max-w-5xl max-h-[95vh] scale-100' 
            : 'w-full max-w-md h-[600px] md:w-96 md:h-[700px] hover:shadow-3xl'
          }
          ring-1 ring-slate-200/50
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
        }}
        role="dialog"
        aria-labelledby="chat-title"
        aria-describedby="chat-description"
      >
        {/* Enhanced Header - NOW COMPACT/STICKY */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-2 border-b border-slate-200/50 bg-gradient-to-r from-white/80 via-slate-50/80 to-white/80 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md ring-1 ring-white/50">
                <FiZap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 border border-white rounded-full shadow-sm">
                <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h3 id="chat-title" className="text-sm font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                SYNC AI Assistant
              </h3>
              <p className="text-xs text-slate-500 font-medium">AI Research Assistant • Online • {isMaximized ? 'Maximized' : 'Compact'} View</p>
            </div>
          </div>
          <div className="flex items-center space-x-0.5">
            <button
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm group"
              aria-label="Clear chat"
              title="Clear conversation"
            >
              <FiRefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-300" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm"
              aria-label={isMaximized ? "Switch to compact view" : "Switch to maximized view"}
              title={isMaximized ? "Compact View" : "Maximize View"}
            >
              {isMaximized ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-200 hover:shadow-sm"
              aria-label="Close chat"
              title="Close chat"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>

        {/* Enhanced Messages Area - Adjusted for compact header */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto pt-2 pb-3 px-3 space-y-2 scroll-smooth custom-scrollbar">
            <div id="chat-description" className="sr-only">
              Chat conversation with SYNC AI assistant specialized in Indian higher education research
            </div>
            {chatMessages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex group ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                } animate-fadeIn`}
              >
                <div className={`flex max-w-[85%] ${msg.type === "user" ? "flex-row-reverse" : "flex-row"} items-start space-x-2`}>
                  {/* Compact Avatar */}
                  <div className={`flex-shrink-0 ${msg.type === "user" ? "ml-2" : "mr-2"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ring-1 ring-white ${
                      msg.type === "user" 
                        ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                        : "bg-gradient-to-br from-slate-100 to-slate-200"
                    }`}>
                      {msg.type === "user" ? (
                        <FiUser className="w-3 h-3 text-white" />
                      ) : (
                        <FiZap className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </div>

                  {/* Compact Message Content */}
                  <div className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`
                        relative px-3 py-2 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md
                        ${
                          msg.type === "user"
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-1 ring-blue-200"
                            : msg.isTyping
                            ? "bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-800 border border-blue-200/50 backdrop-blur-sm"
                            : "bg-gradient-to-br from-white to-slate-50/50 text-slate-800 border border-slate-200/50 backdrop-blur-sm"
                        }
                        ${msg.type === "user" ? "rounded-br-sm" : "rounded-bl-sm"}
                      `}
                    >
                      {msg.isTyping ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-xs font-medium">AI is thinking...</span>
                        </div>
                      ) : (
                        <div className="text-xs leading-relaxed">
                          {msg.message.split('\n').map((line, lineIndex) => {
                            if (line.trim().startsWith('• ')) {
                              return (
                                <div key={lineIndex} className="flex items-start mb-1">
                                  <span className="text-blue-500 mr-1.5 mt-0.5 text-xs font-bold">•</span>
                                  <span className="flex-1">
                                    {formatMessageLine(line.substring(2).trim())}
                                  </span>
                                </div>
                              );
                            } else if (line.includes('**')) {
                              return (
                                <div key={lineIndex} className="mb-1 font-semibold">
                                  {formatMessageLine(line)}
                                </div>
                              );
                            } else if (line.trim() === '') {
                              return <div key={lineIndex} className="mb-1"></div>;
                            } else {
                              return (
                                <div key={lineIndex} className="mb-1">
                                  {formatMessageLine(line)}
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}

                      {/* Compact Copy button */}
                      {!msg.isTyping && msg.type === "bot" && (
                        <button
                          onClick={() => copyToClipboard(msg.message, msg.id)}
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-white border border-slate-200 rounded-full shadow-lg hover:bg-slate-50 transition-all duration-200 hover:scale-110"
                          aria-label="Copy message"
                        >
                          {copiedMessageId === msg.id ? (
                            <FiCheck className="w-2.5 h-2.5 text-green-600" />
                          ) : (
                            <FiCopy className="w-2.5 h-2.5 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Compact Timestamp */}
                    <div className={`text-xs text-slate-400 mt-1 px-1 font-medium ${msg.type === "user" ? "text-right" : "text-left"}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Compact Input Area */}
        <div className="border-t border-slate-200/50 bg-gradient-to-r from-white/80 via-slate-50/40 to-white/80 backdrop-blur-sm p-3 rounded-b-2xl">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about IIT/NIT placements, JEE cutoffs, college rankings..."
                disabled={isLoading}
                rows="1"
                className="w-full px-3 py-2 pr-10 border border-slate-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:bg-slate-100/50 disabled:cursor-not-allowed resize-none transition-all duration-200 text-xs leading-relaxed bg-white/80 backdrop-blur-sm placeholder-slate-400 shadow-sm hover:shadow-md"
                style={{ minHeight: '36px', maxHeight: '100px' }}
                aria-label="Type your message about educational topics"
              />
              {/* Character count indicator */}
              <div className="absolute bottom-1 right-2 text-xs text-slate-400">
                {inputMessage.length > 100 && `${inputMessage.length}/500`}
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl disabled:shadow-sm transform hover:scale-105 disabled:hover:scale-100 ring-2 ring-blue-200/50"
              aria-label="Send message"
            >
              {isLoading ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiSend className="w-4 h-4 transform transition-transform hover:translate-x-0.5" />
              )}
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-2 text-center font-medium bg-slate-50/50 rounded-lg py-1.5 px-2">
            🔍 Live web research • AI analysis • Press <kbd className="bg-white px-1 py-0.5 rounded border text-xs">Enter</kbd> to send
          </div>
        </div>
      </div>

      {/* Custom CSS for animations and scrollbar */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }
        kbd {
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default AiBot;
