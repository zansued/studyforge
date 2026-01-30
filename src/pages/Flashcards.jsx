import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Loader2,
  Sparkles,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Flashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [sessionCards, setSessionCards] = useState([]);
  const [sessionStats, setSessionStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards', user?.email],
    queryFn: () => base44.entities.Flashcard.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Flashcard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });

  // Get cards due for review
  const dueCards = flashcards.filter(fc => {
    if (!fc.next_review) return true;
    return new Date(fc.next_review) <= new Date();
  });

  const startStudySession = () => {
    setSessionCards([...dueCards]);
    setCurrentIndex(0);
    setStudyMode(true);
    setSessionStats({ easy: 0, medium: 0, hard: 0 });
    setIsFlipped(false);
  };

  const handleResponse = (quality) => {
    const card = sessionCards[currentIndex];
    
    // Update stats
    const qualityMap = { 0: 'hard', 1: 'medium', 2: 'easy' };
    setSessionStats(prev => ({
      ...prev,
      [qualityMap[quality]]: prev[qualityMap[quality]] + 1
    }));

    // Calculate new interval using SM-2 algorithm
    let { ease_factor = 2.5, interval_days = 1, repetitions = 0 } = card;

    if (quality < 1) {
      // Hard - reset
      repetitions = 0;
      interval_days = 1;
    } else {
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions++;
    }

    // Update ease factor
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (2 - quality) * (0.08 + (2 - quality) * 0.02)));

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval_days);

    updateFlashcardMutation.mutate({
      id: card.id,
      data: {
        ease_factor,
        interval_days,
        repetitions,
        next_review: nextReview.toISOString(),
        last_reviewed: new Date().toISOString()
      }
    });

    // Move to next card
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // Session complete
      setStudyMode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Study mode
  if (studyMode && sessionCards.length > 0) {
    const currentCard = sessionCards[currentIndex];
    const progress = ((currentIndex + 1) / sessionCards.length) * 100;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>{currentIndex + 1} de {sessionCards.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
        </div>

        {/* Flashcard */}
        <motion.div
          className="perspective-1000"
          style={{ perspective: "1000px" }}
        >
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative cursor-pointer"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <div
              className={`glass-card rounded-3xl p-8 min-h-[300px] flex flex-col items-center justify-center text-center ${
                isFlipped ? 'invisible' : 'visible'
              }`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-500" />
                <span className="text-xs text-slate-500">Pergunta</span>
              </div>
              <p className="text-xl font-medium text-white">{currentCard.front}</p>
              <p className="text-sm text-slate-500 mt-6">Clique para virar</p>
            </div>

            {/* Back */}
            <div
              className={`absolute inset-0 glass-card rounded-3xl p-8 min-h-[300px] flex flex-col items-center justify-center text-center ${
                isFlipped ? 'visible' : 'invisible'
              }`}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500" />
                <span className="text-xs text-slate-500">Resposta</span>
              </div>
              <p className="text-xl font-medium text-white">{currentCard.back}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Response Buttons */}
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4 mt-8"
          >
            <Button
              onClick={() => handleResponse(0)}
              className="flex-1 max-w-[140px] h-16 flex-col gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            >
              <ThumbsDown className="w-5 h-5" />
              <span className="text-xs">Difícil</span>
            </Button>
            <Button
              onClick={() => handleResponse(1)}
              className="flex-1 max-w-[140px] h-16 flex-col gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
            >
              <Meh className="w-5 h-5" />
              <span className="text-xs">Médio</span>
            </Button>
            <Button
              onClick={() => handleResponse(2)}
              className="flex-1 max-w-[140px] h-16 flex-col gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
            >
              <ThumbsUp className="w-5 h-5" />
              <span className="text-xs">Fácil</span>
            </Button>
          </motion.div>
        )}

        {/* Exit Button */}
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => setStudyMode(false)}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Sair da Sessão
          </Button>
        </div>
      </div>
    );
  }

  // Session Complete Screen
  if (!studyMode && sessionStats.easy + sessionStats.medium + sessionStats.hard > 0) {
    const total = sessionStats.easy + sessionStats.medium + sessionStats.hard;
    
    return (
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sessão Completa!</h2>
          <p className="text-slate-400 mb-8">Você revisou {total} cartões</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-green-500/10">
              <p className="text-2xl font-bold text-green-400">{sessionStats.easy}</p>
              <p className="text-xs text-slate-500">Fáceis</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-400">{sessionStats.medium}</p>
              <p className="text-xs text-slate-500">Médios</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10">
              <p className="text-2xl font-bold text-red-400">{sessionStats.hard}</p>
              <p className="text-xs text-slate-500">Difíceis</p>
            </div>
          </div>

          <Button
            onClick={() => setSessionStats({ easy: 0, medium: 0, hard: 0 })}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Voltar aos Flashcards
          </Button>
        </motion.div>
      </div>
    );
  }

  // Main Flashcards View
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Flashcards</h1>
          <p className="text-slate-400">
            {flashcards.length} cartões • {dueCards.length} para revisar
          </p>
        </div>
        {dueCards.length > 0 && (
          <Button
            onClick={startStudySession}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Brain className="w-5 h-5 mr-2" />
            Iniciar Revisão ({dueCards.length})
          </Button>
        )}
      </motion.div>

      {/* Empty State or Cards */}
      {flashcards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum flashcard ainda
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Crie flashcards a partir de suas anotações ou tópicos de estudo usando a IA.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {flashcards.slice(0, 12).map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-5 hover:border-slate-700/50 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      card.difficulty === 'easy' 
                        ? 'bg-green-500/10 text-green-400'
                        : card.difficulty === 'hard'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {card.difficulty === 'easy' ? 'Fácil' : card.difficulty === 'hard' ? 'Difícil' : 'Médio'}
                    </span>
                  </div>
                  {card.next_review && (
                    <span className="text-xs text-slate-500">
                      {new Date(card.next_review) <= new Date() ? 'Revisar' : 'OK'}
                    </span>
                  )}
                </div>
                <p className="text-white font-medium mb-2 line-clamp-2">{card.front}</p>
                <p className="text-sm text-slate-400 line-clamp-2">{card.back}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
