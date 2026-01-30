import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  BookOpen,
  Scale,
  FileText,
  Trash2,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";

export default function ChatIA() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState("general");
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const contextOptions = [
    { value: "general", label: "Geral - Concursos", icon: BookOpen },
    { value: "law", label: "Legislação e Leis", icon: Scale },
    { value: "study", label: "Minhas Matérias", icon: FileText },
  ];

  const getSystemPrompt = () => {
    const subjectNames = subjects.map(s => s.name).join(", ");
    const topicNames = topics.slice(0, 20).map(t => t.name).join(", ");

    const basePrompt = `Você é um assistente especializado em concursos públicos brasileiros. Responda de forma clara, objetiva e didática. Use exemplos quando apropriado. Formate suas respostas usando markdown para melhor legibilidade.`;

    switch (selectedContext) {
      case "law":
        return `${basePrompt}

CONTEXTO ESPECIAL: O usuário quer tirar dúvidas sobre LEGISLAÇÃO e LEIS.
- Cite artigos de lei quando relevante
- Explique termos jurídicos de forma simples
- Mencione jurisprudência importante quando aplicável
- Destaque pontos que costumam cair em provas`;

      case "study":
        return `${basePrompt}

CONTEXTO ESPECIAL: O usuário está estudando para concursos e tem as seguintes matérias cadastradas:
Matérias: ${subjectNames || "Nenhuma matéria cadastrada ainda"}
Alguns tópicos: ${topicNames || "Nenhum tópico cadastrado ainda"}

Relacione suas respostas com o conteúdo de estudo do usuário quando possível.`;

      default:
        return `${basePrompt}

Você pode ajudar com:
- Explicação de conceitos e teorias
- Dúvidas sobre legislação
- Estratégias de estudo
- Resolução de questões
- Dicas para provas`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
      ).join('\n\n');

      const prompt = `${getSystemPrompt()}

${conversationHistory ? `HISTÓRICO DA CONVERSA:\n${conversationHistory}\n\n` : ''}PERGUNTA DO USUÁRIO:
${userMessage.content}

Responda de forma completa e útil:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: selectedContext === "law" || selectedContext === "general"
      });

      const assistantMessage = { role: "assistant", content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestedQuestions = [
    "Quais são os princípios da Administração Pública?",
    "Explique a diferença entre atos administrativos vinculados e discricionários",
    "Como funciona o regime jurídico dos servidores públicos?",
    "Quais são as modalidades de licitação?"
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            Chat com IA
          </h1>
          <p className="text-slate-400 text-sm">Tire suas dúvidas sobre concursos, leis e conteúdos</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedContext} onValueChange={setSelectedContext}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {contextOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearChat}
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 glass-card rounded-2xl p-4 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Como posso ajudar?
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-md">
                Pergunte sobre leis, conceitos, estratégias de estudo ou qualquer dúvida sobre concursos públicos.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-amber-500/20 text-white'
                        : 'bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-0.5">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-slate-400 text-sm">Pensando...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[50px] max-h-32"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 self-end"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Pressione Enter para enviar • Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
