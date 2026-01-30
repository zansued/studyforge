import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ActiveRecallReview({ note, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [isComplete, setIsComplete] = useState(false);

  const cues = note.cornell_cues || [];
  const currentCue = cues[currentIndex];
  const progress = ((currentIndex) / cues.length) * 100;

  const handleResponse = (correct) => {
    const newResults = [...results, { cue: currentCue, correct }];
    setResults(newResults);
    setShowAnswer(false);

    if (currentIndex + 1 >= cues.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults([]);
    setIsComplete(false);
  };

  const correctCount = results.filter(r => r.correct).length;
  const score = cues.length > 0 ? Math.round((correctCount / cues.length) * 100) : 0;

  if (cues.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Sem perguntas para revisar</h3>
        <p className="text-slate-400 text-sm">
          Adicione perguntas/cues na sua anotação Cornell para usar a revisão ativa.
        </p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
          score >= 80 ? 'bg-green-500/20' : score >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'
        }`}>
          <Trophy className={`w-10 h-10 ${
            score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
          }`} />
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">Revisão Completa!</h3>
        <p className="text-slate-400 mb-6">
          Você acertou <span className="text-white font-medium">{correctCount}</span> de{" "}
          <span className="text-white font-medium">{cues.length}</span> perguntas
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          <span className={`text-4xl font-bold ${
            score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {score}%
          </span>
        </div>

        {/* Results breakdown */}
        <div className="space-y-2 max-w-md mx-auto mb-8">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg flex items-center gap-3 ${
                result.correct ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              {result.correct ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="text-sm text-slate-300 text-left">{result.cue.cue}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleRestart}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revisar Novamente
          </Button>
          <Button
            onClick={() => onComplete(score)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Concluir
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Progresso</span>
          <span className="text-white">{currentIndex + 1} / {cues.length}</span>
        </div>
        <Progress value={progress} className="h-2 bg-slate-800" />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="glass-card rounded-2xl p-8 min-h-[250px] flex flex-col"
        >
          {/* Question */}
          <div className="flex-1">
            <p className="text-xs text-amber-400 uppercase tracking-wide mb-3">Pergunta</p>
            <h3 className="text-xl font-semibold text-white">{currentCue.cue}</h3>
          </div>

          {/* Answer */}
          <AnimatePresence>
            {showAnswer && currentCue.answer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6 mt-6 border-t border-slate-700"
              >
                <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Resposta</p>
                <p className="text-slate-300">{currentCue.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      {!showAnswer ? (
        <Button
          onClick={() => setShowAnswer(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white"
        >
          <Eye className="w-4 h-4 mr-2" />
          Revelar Resposta
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button
            onClick={() => handleResponse(false)}
            variant="outline"
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Errei
          </Button>
          <Button
            onClick={() => handleResponse(true)}
            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Acertei
          </Button>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Tente lembrar a resposta antes de revelar. A dificuldade é o que fortalece a memória!
      </p>
    </div>
  );
}
