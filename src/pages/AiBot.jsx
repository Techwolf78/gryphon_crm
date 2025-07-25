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
} from "react-icons/fi";

const AiBot = ({ isOpen, onClose }) => {
  const [chatMessages, setChatMessages] = useState([
    { 
      type: "bot", 
      message: "🇮🇳 नमस्ते! I'm your AI assistant specialized in Indian higher education. I can help you with:\n\n• Indian college placement statistics & packages (in INR)\n• IIT/NIT/IIIT admission processes & cutoffs\n• AICTE/UGC approved institutions\n• TPO contact details for Indian colleges\n• JEE/NEET/CAT/GATE exam information\n• State quota vs All-India quota details\n\nWhat would you like to know about Indian education?",
      timestamp: new Date()
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
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

  // ✅ IMPROVED - Enhanced fallback responses with India focus
  const getSimpleResponse = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes("hello") || lowerQuestion.includes("hi") || lowerQuestion.includes("namaste")) {
      return "🇮🇳 नमस्ते! I'm your AI assistant specialized in Indian higher education. I can help you with:\n\n• Indian college placement data & salary packages (INR)\n• IIT/NIT/IIIT admission processes & cutoffs\n• AICTE/UGC approved institutions & rankings\n• TPO contact information for Indian colleges\n• JEE/NEET/CAT/GATE exam guidance\n• Reservation policies & state quota details\n\nWhat specific information about Indian education do you need?";
    }
    
    if (lowerQuestion.includes("help")) {
      return "🇮🇳 I'm here to help with Indian educational research! Try asking me about:\n\n• Specific Indian colleges (e.g., 'IIT Delhi placement statistics')\n• Admission processes (e.g., 'JEE Advanced cutoff 2025')\n• Indian technology trends (e.g., 'AI courses in Indian engineering colleges')\n• Placement packages (e.g., 'average package at NIT Trichy')\n• Contact details (e.g., 'TPO contact IIT Bombay')\n\nWhat Indian educational information do you need?";
    }
    
    if (lowerQuestion.includes("what") && lowerQuestion.includes("you")) {
      return "🇮🇳 I'm an AI assistant specialized in Indian higher education market intelligence. I focus on:\n\n• Indian colleges, universities & deemed institutions\n• NIRF rankings & NAAC accreditation status\n• Placement statistics with INR salary packages\n• Indian admission processes & cutoff trends\n• AICTE/UGC guidelines & government policies\n• TPO contacts & college administration details\n\nI'm particularly good at finding current data about Indian engineering colleges, medical colleges, management institutes, and their placement records.";
    }
    
    if (lowerQuestion.includes("college") || lowerQuestion.includes("university") || lowerQuestion.includes("iit") || lowerQuestion.includes("nit")) {
      return "🇮🇳 I can help you research Indian colleges and universities! Try asking specific questions like:\n\n• 'IIT Delhi placement statistics 2025'\n• 'NIT Trichy admission process'\n• 'Top engineering colleges in Maharashtra'\n• 'AIIMS Delhi cutoff marks'\n• 'VIT Vellore fees structure'\n• 'BITS Pilani placement packages'\n\nWhich specific Indian institution interests you?";
    }
    
    if (lowerQuestion.includes("placement") || lowerQuestion.includes("job") || lowerQuestion.includes("salary") || lowerQuestion.includes("package")) {
      return "🇮🇳 I can provide Indian placement statistics and career information! Ask me about:\n\n• College-specific placement data with INR packages\n• Top Indian recruiting companies (TCS, Infosys, Wipro, etc.)\n• Average vs highest packages at Indian colleges\n• Skills gap in Indian engineering market\n• Campus recruitment trends in India\n• TPO contact details for placement inquiries\n\nWhich Indian college or placement topic interests you?";
    }
    
    if (lowerQuestion.includes("jee") || lowerQuestion.includes("neet") || lowerQuestion.includes("cat") || lowerQuestion.includes("gate")) {
      return "🇮🇳 I can help with Indian competitive exams! Ask about:\n\n• JEE Main/Advanced cutoffs & trends\n• NEET cutoff for medical colleges\n• CAT cutoff for IIMs\n• GATE cutoff for M.Tech admissions\n• State quota vs All-India quota\n• Reservation policies (SC/ST/OBC/EWS)\n\nWhich exam or college admission process do you want to know about?";
    }
    
    // Enhanced generic responses with Indian focus
    const genericResponses = [
      "🇮🇳 I'd be happy to help you research Indian educational topics! Could you be more specific about which Indian college or exam you're interested in?",
      "🇮🇳 That's an interesting question about Indian education. Can you tell me more about what specific information you're looking for?",
      "🇮🇳 I specialize in Indian higher education research. What particular aspect of Indian colleges or exams would you like me to investigate?",
      "🇮🇳 I can help you find detailed information about Indian colleges, placements, and educational trends. What specific Indian educational data do you need?"
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

      // ✅ IMPROVED - Better loading message
      setChatMessages((prev) => [
        ...prev,
        { 
          type: "bot", 
          message: "🔍 Searching for information...", 
          isTyping: true,
          timestamp: new Date(),
          id: Date.now() + 1
        },
      ]);

      try {
        const result = await getAIResponse(userMessage);
        
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
      } catch (error) {
        console.error("Message handling error:", error);
        setChatMessages((prev) => {
          const newMessages = prev.filter(msg => !msg.isTyping);
          return [...newMessages, { 
            type: "bot", 
            message: "I encountered an error while processing your request. Please try again or rephrase your question.",
            timestamp: new Date(),
            id: Date.now() + 4
          }];
        });
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
    <div className="fixed inset-0 z-70 flex items-end justify-end p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close chat"
      />

      {/* Chat Window */}
      <div 
        className={`
          relative bg-white rounded-xl shadow-2xl border border-slate-200/50 flex flex-col
          transition-all duration-300 ease-out
          ${isMaximized 
            ? 'w-full h-full max-w-4xl max-h-[90vh]' 
            : 'w-full max-w-md h-[600px] md:w-96 md:h-[700px]'
          }
        `}
        role="dialog"
        aria-labelledby="chat-title"
        aria-describedby="chat-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <FiMessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 id="chat-title" className="text-base font-semibold text-slate-900">
                🇮🇳 Indian Education AI
              </h3>
              <p className="text-xs text-slate-500">Indian Higher Education • Ready to help</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={isMaximized ? "Minimize chat" : "Maximize chat"}
            >
              {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth">
            <div id="chat-description" className="sr-only">
              Chat conversation with AI assistant specialized in Indian higher education research
            </div>
            {chatMessages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex group ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`flex max-w-[85%] ${msg.type === "user" ? "flex-row-reverse" : "flex-row"} items-start space-x-3`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${msg.type === "user" ? "ml-3" : "mr-3"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.type === "user" 
                        ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                        : "bg-gradient-to-br from-slate-100 to-slate-200"
                    }`}>
                      {msg.type === "user" ? (
                        <FiUser className="w-4 h-4 text-white" />
                      ) : (
                        <FiMessageCircle className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`
                        relative px-4 py-3 rounded-2xl shadow-sm
                        ${
                          msg.type === "user"
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                            : msg.isTyping
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-slate-50 text-slate-800 border border-slate-200"
                        }
                        ${msg.type === "user" ? "rounded-br-md" : "rounded-bl-md"}
                      `}
                    >
                      {msg.isTyping ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm">Searching for information</span>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed">
                          {msg.message.split('\n').map((line, lineIndex) => {
                            if (line.trim().startsWith('• ')) {
                              return (
                                <div key={lineIndex} className="flex items-start mb-2">
                                  <span className="text-blue-500 mr-2 mt-1 text-xs">•</span>
                                  <span className="flex-1">
                                    {formatMessageLine(line.substring(2).trim())}
                                  </span>
                                </div>
                              );
                            } else if (line.includes('**')) {
                              return (
                                <div key={lineIndex} className="mb-2 font-medium">
                                  {formatMessageLine(line)}
                                </div>
                              );
                            } else if (line.trim() === '') {
                              return <div key={lineIndex} className="mb-2"></div>;
                            } else {
                              return (
                                <div key={lineIndex} className="mb-2">
                                  {formatMessageLine(line)}
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}

                      {/* Copy button for bot messages */}
                      {!msg.isTyping && msg.type === "bot" && (
                        <button
                          onClick={() => copyToClipboard(msg.message, msg.id)}
                          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-all duration-200"
                          aria-label="Copy message"
                        >
                          {copiedMessageId === msg.id ? (
                            <FiCheck className="w-3 h-3 text-green-600" />
                          ) : (
                            <FiCopy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-xs text-slate-400 mt-1 px-1 ${msg.type === "user" ? "text-right" : "text-left"}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 rounded-b-xl">
          <div className="flex items-end space-x-3">
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
                placeholder="Ask about IIT/NIT, placements, JEE cutoffs..."
                disabled={isLoading}
                rows="1"
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed resize-none transition-colors text-sm leading-relaxed"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                aria-label="Type your message about educational topics"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
              aria-label="Send message"
            >
              {isLoading ? (
                <FiLoader className="w-5 h-5 animate-spin" />
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-2 text-center">
            Ask about Indian colleges, IIT/NIT placements, JEE/NEET cutoffs • Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiBot;
