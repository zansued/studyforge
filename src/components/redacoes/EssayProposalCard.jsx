import React from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const boardLabels = {
  enem: "ENEM",
  fcc: "FCC",
  cespe: "CESPE",
  fgv: "FGV",
  vunesp: "VUNESP",
  other: "Outro"
};

const difficultyColors = {
  easy: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20"
};

const difficultyLabels = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil"
};

export default function EssayProposalCard({ proposal, index = 0, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl p-6 hover:border-slate-700/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {boardLabels[proposal.exam_board] || "Geral"}
            </Badge>
            <Badge className={`text-xs border ${difficultyColors[proposal.difficulty || 'medium']}`}>
              {difficultyLabels[proposal.difficulty || 'medium']}
            </Badge>
          </div>
          <h3 className="font-semibold text-white mb-1 line-clamp-1">{proposal.title}</h3>
          <p className="text-sm text-slate-400 line-clamp-2">{proposal.theme}</p>
          
          {proposal.motivating_texts?.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <BookOpen className="w-3 h-3" />
              <span>{proposal.motivating_texts.length} textos motivadores</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => onSelect(proposal)}
        className="w-full mt-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20"
      >
        Escrever Redação
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}
