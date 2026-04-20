import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { BrainCircuit, X, Send, ChevronUp } from 'lucide-react';
import Markdown from 'react-markdown';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'msg-init', role: 'model', content: 'Hola. Soy la Inteligencia Central de AnunciaMarket. ¿Cómo puedo ayudarte a optimizar tu ecosistema hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination State
  const [displayLimit, setDisplayLimit] = useState(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const scrollToBottom = () => {
    if (isAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  const loadMoreMessages = () => {
    setDisplayLimit(prev => Math.min(prev + 10, messages.length));
    setIsAutoScroll(false);
  };

  const visibleMessages = messages.slice(-displayLimit);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsAutoScroll(true);

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Map history explicitly for Gemini (limit to last 20 messages for context window efficiency)
      const contextMessages = messages.slice(-20).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      contextMessages.push({ role: 'user', parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contextMessages,
        config: {
          systemInstruction: 'Eres el asistente de IA oficial de AnunciaMarket, integrado en su plataforma web. Eres extremadamente elegante, profesional, conciso y usas un tono industrial, futurista y orientado al negocio (ventas, conversiones, orquestación autónoma, rendimiento simbiótico). Responde siempre en español. No seas excesivamente conversacional; sé táctico.',
          temperature: 0.7,
        }
      });

      const reply = response.text || 'La señal fue interrumpida. Por favor, intenta de nuevo.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: reply }]);
    } catch (error) {
      console.error('Error with AI:', error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: '[Error de Red Simbiótica] No pude procesar tu solicitud.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence initial={false}>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#0A0A0B] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shadow-lg shadow-[#D4AF37]/10 z-50 group hover:border-[#D4AF37] transition-all"
          >
            <BrainCircuit className="w-6 h-6 text-[#D4AF37] group-hover:animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 w-[340px] h-[480px] bg-[#0A0A0B] border border-white/10 flex flex-col z-50 shadow-2xl overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#161618]">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-white text-[12px] font-bold tracking-[1px] uppercase">Agente Cognitivo</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              onScroll={() => setIsAutoScroll(false)}
            >
              {messages.length > displayLimit && (
                <div className="flex justify-center mb-2">
                  <button 
                    onClick={loadMoreMessages}
                    className="text-[10px] uppercase tracking-[1px] text-[#D4AF37] opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#161618] border border-[#D4AF37]/20 px-3 py-1.5 rounded-full"
                  >
                    <ChevronUp className="w-3 h-3" /> Cargar Historial
                  </button>
                </div>
              )}

              {visibleMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] text-[13px] leading-[1.5] p-3 ${
                      msg.role === 'user' 
                        ? 'bg-[#D4AF37] text-black rounded-tl-md rounded-tr-md rounded-bl-md' 
                        : 'bg-[#161618] border border-white/5 text-white/90 rounded-tr-md rounded-tl-none rounded-br-md rounded-bl-md prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-2 prose-pre:rounded prose-a:text-[#D4AF37] max-w-full'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#161618] border border-white/5 text-white/50 text-[13px] p-3 rounded-tr-md rounded-tl-none rounded-br-md rounded-bl-md flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-[#0D0D0F]">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Iniciar directiva..."
                  className="flex-1 bg-transparent border border-white/10 rounded-none px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 flex items-center justify-center bg-[#D4AF37] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
