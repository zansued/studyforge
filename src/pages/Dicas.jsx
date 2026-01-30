import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Sparkles,
  Quote,
  RefreshCw,
  Loader2,
  Target,
  Brain,
  Clock,
  BookOpen,
  Heart,
  Zap,
  Trophy,
  Star,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const motivationalQuotes = [
  { quote: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { quote: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { quote: "Não espere por oportunidades extraordinárias. Agarre ocasiões comuns e as torne grandes.", author: "Orison Swett Marden" },
  { quote: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon" },
  { quote: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { quote: "Acredite que você pode, assim você já está no meio do caminho.", author: "Theodore Roosevelt" },
  { quote: "Grandes realizações não são feitas por impulso, mas por uma soma de pequenas realizações.", author: "Vincent Van Gogh" },
  { quote: "O segredo do sucesso é a constância do propósito.", author: "Benjamin Disraeli" },
  { quote: "Não importa quão devagar você vá, desde que não pare.", author: "Confúcio" },
  { quote: "A diferença entre o ordinário e o extraordinário é aquele pequeno extra.", author: "Jimmy Johnson" },
  { quote: "Você não precisa ser perfeito para começar, mas precisa começar para ser perfeito.", author: "Zig Ziglar" },
  { quote: "O conhecimento é a única coisa que ninguém pode tirar de você.", author: "B.B. King" },
];

const tipCategories = [
  { id: "estudos", label: "Técnicas de Estudo", icon: BookOpen, color: "blue" },
  { id: "memorização", label: "Memorização", icon: Brain, color: "purple" },
  { id: "gestão", label: "Gestão do Tempo", icon: Clock, color: "amber" },
  { id: "provas", label: "Dia da Prova", icon: Target, color: "green" },
  { id: "motivação", label: "Motivação", icon: Heart, color: "pink" },
  { id: "saúde", label: "Saúde Mental", icon: Zap, color: "cyan" },
];

const colorClasses = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: "bg-blue-500/20" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", icon: "bg-purple-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "bg-amber-500/20" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: "bg-green-500/20" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400", icon: "bg-pink-500/20" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", icon: "bg-cyan-500/20" },
};

export default function Dicas() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [generatedTips, setGeneratedTips] = useState([]);
  const [dailyQuote, setDailyQuote] = useState(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('dailyQuote');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) return parsed.quote;
    }
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    localStorage.setItem('dailyQuote', JSON.stringify({ date: today, quote: randomQuote }));
    return randomQuote;
  });

  const generateTipsMutation = useMutation({
    mutationFn: async (category) => {
      const categoryLabel = tipCategories.find(c => c.id === category)?.label || category;
      
      const response = await base44.functions.invoke('agent_coach', { 
        category: categoryLabel 
      });
      
      setGeneratedTips(response.data.tips || []);
      return response.data;
    },
  });

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setGeneratedTips([]);
    generateTipsMutation.mutate(categoryId);
  };

  const refreshQuote = () => {
    const newQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setDailyQuote(newQuote);
    localStorage.setItem('dailyQuote', JSON.stringify({ date: new Date().toDateString(), quote: newQuote }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Dicas de Aprovação</h1>
        <p className="text-slate-400">Motivação e estratégias para sua jornada rumo à aprovação</p>
      </motion.div>

      {/* Daily Motivation Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Quote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Frase do Dia</h2>
                <p className="text-xs text-slate-500">Sua dose diária de motivação</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshQuote}
              className="text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>

          <blockquote className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-4">
            "{dailyQuote.quote}"
          </blockquote>
          <p className="text-amber-500 font-medium">— {dailyQuote.author}</p>
        </div>
      </motion.div>

      {/* Quick Stats / Encouragement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        <div className="glass-card rounded-2xl p-5 text-center">
          <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-2xl font-bold text-white mb-1">Foco</p>
          <p className="text-xs text-slate-400">Mantenha seus objetivos claros</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <Star className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <p className="text-2xl font-bold text-white mb-1">Consistência</p>
          <p className="text-xs text-slate-400">Estudar pouco todo dia é melhor</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <Zap className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <p className="text-2xl font-bold text-white mb-1">Resiliência</p>
          <p className="text-xs text-slate-400">Erros são parte do aprendizado</p>
        </div>
      </motion.div>

      {/* Tip Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Dicas por Categoria
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tipCategories.map((category) => {
            const Icon = category.icon;
            const colors = colorClasses[category.color];
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`p-4 rounded-2xl border transition-all text-left group ${
                  isSelected 
                    ? `${colors.bg} ${colors.border} border-2` 
                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <p className={`font-medium ${isSelected ? colors.text : 'text-white'}`}>
                  {category.label}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles className={`w-3 h-3 ${colors.text}`} />
                  <span className="text-xs text-slate-500">Gerar dicas</span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Generated Tips */}
      <AnimatePresence mode="wait">
        {selectedCategory && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${colorClasses[tipCategories.find(c => c.id === selectedCategory)?.color || 'amber'].icon} flex items-center justify-center`}>
                  {React.createElement(tipCategories.find(c => c.id === selectedCategory)?.icon || Lightbulb, {
                    className: `w-5 h-5 ${colorClasses[tipCategories.find(c => c.id === selectedCategory)?.color || 'amber'].text}`
                  })}
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {tipCategories.find(c => c.id === selectedCategory)?.label}
                  </h3>
                  <p className="text-xs text-slate-500">Dicas geradas por IA</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateTipsMutation.mutate(selectedCategory)}
                disabled={generateTipsMutation.isPending}
                className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl"
              >
                {generateTipsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="ml-2">Regenerar</span>
              </Button>
            </div>

            {generateTipsMutation.isPending ? (
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Gerando dicas personalizadas...</p>
              </div>
            ) : generatedTips.length > 0 ? (
              <div className="space-y-4">
                {generatedTips.map((tip, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-500 font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-2">{tip.title}</h4>
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">{tip.content}</p>
                        {tip.actionable && (
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-300">{tip.actionable}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Motivation */}
      {!selectedCategory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-8"
        >
          <p className="text-slate-500 text-sm">
            Selecione uma categoria acima para receber dicas personalizadas ✨
          </p>
        </motion.div>
      )}
    </div>
  );
}
