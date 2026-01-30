import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function EssayCorrectionResult({ essay, onRewrite }) {
  const [expandedCompetency, setExpandedCompetency] = useState(null);
  
  const maxScore = essay.exam_board === 'enem' ? 1000 : 100;
  const scorePercentage = (essay.total_score / maxScore) * 100;
  
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (percentage) => {
    if (percentage >= 80) return 'from-green-500/20 to-green-600/10';
    if (percentage >= 60) return 'from-amber-500/20 to-amber-600/10';
    return 'from-red-500/20 to-red-600/10';
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-card rounded-3xl p-8 bg-gradient-to-br ${getScoreBg(scorePercentage)}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{essay.title}</h2>
              <p className="text-sm text-white/60">Correção concluída</p>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2 mb-4">
          <span className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`}>
            {essay.total_score}
          </span>
          <span className="text-2xl text-white/40 mb-2">/ {maxScore}</span>
        </div>

        <Progress 
          value={scorePercentage} 
          className="h-3 bg-white/10" 
        />

        <p className="text-sm text-white/60 mt-4">
          {scorePercentage >= 80 
            ? 'Excelente desempenho! Continue assim.' 
            : scorePercentage >= 60 
              ? 'Bom trabalho! Há pontos a melhorar.' 
              : 'Precisa de mais prática. Veja as sugestões abaixo.'}
        </p>
      </motion.div>

      {/* Competencies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Avaliação por Competência
        </h3>

        <div className="space-y-3">
          {essay.competencies?.map((comp, index) => {
            const percentage = (comp.score / comp.max_score) * 100;
            const isExpanded = expandedCompetency === index;

            return (
              <Collapsible
                key={index}
                open={isExpanded}
                onOpenChange={() => setExpandedCompetency(isExpanded ? null : index)}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 cursor-pointer transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{comp.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${getScoreColor(percentage)}`}>
                          {comp.score}/{comp.max_score}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2 bg-slate-700" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2">
                    <p className="text-sm text-slate-300">{comp.feedback}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </motion.div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Pontos Fortes
          </h3>
          <ul className="space-y-2">
            {essay.strengths?.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-green-400 mt-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Improvements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Pontos a Melhorar
          </h3>
          <ul className="space-y-2">
            {essay.improvements?.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 mt-1">•</span>
                {improvement}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* General Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Feedback Geral
        </h3>
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
          {essay.general_feedback}
        </p>
      </motion.div>

      {/* Rewrite Suggestions */}
      {essay.rewrite_suggestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6 border-purple-500/20"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            Sugestões para Reescrita
          </h3>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mb-6">
            {essay.rewrite_suggestions}
          </p>
          <Button
            onClick={onRewrite}
            className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reescrever Redação
          </Button>
        </motion.div>
      )}
    </div>
  );
}
