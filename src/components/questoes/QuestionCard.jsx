import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Pencil, Trash2, MoreVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const difficultyConfig = {
  easy: { label: "Fácil", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  medium: { label: "Médio", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  hard: { label: "Difícil", color: "bg-red-500/10 text-red-400 border-red-500/20" }
};

export default function QuestionCard({ 
  question, 
  index,
  subject,
  topic,
  onEdit, 
  onDelete,
  onPractice
}) {
  const successRate = question.times_answered > 0
    ? Math.round((question.times_correct / question.times_answered) * 100)
    : null;

  const difficulty = difficultyConfig[question.difficulty] || difficultyConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-card rounded-2xl p-5 hover:border-slate-700/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          question.difficulty === 'easy'
            ? 'bg-green-500/10 text-green-400'
            : question.difficulty === 'hard'
              ? 'bg-red-500/10 text-red-400'
              : 'bg-amber-500/10 text-amber-400'
        }`}>
          <HelpCircle className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {subject && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: `${subject.color}50`,
                  color: subject.color,
                  backgroundColor: `${subject.color}10`
                }}
              >
                {subject.name}
              </Badge>
            )}
            {topic && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {topic.name}
              </Badge>
            )}
            <Badge className={`text-xs border ${difficulty.color}`}>
              {difficulty.label}
            </Badge>
          </div>

          {/* Question text */}
          <p className="text-white line-clamp-2 mb-2">{question.question}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{question.options?.length || 4} alternativas</span>
            {question.times_answered > 0 && (
              <>
                <span>•</span>
                <span>{question.times_answered} tentativas</span>
                <span>•</span>
                <span className={successRate >= 70 ? 'text-green-400' : successRate >= 40 ? 'text-amber-400' : 'text-red-400'}>
                  {successRate}% acerto
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700">
            <DropdownMenuItem 
              onClick={() => onPractice(question)}
              className="text-white hover:bg-slate-700 cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" />
              Praticar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onEdit(question)}
              className="text-white hover:bg-slate-700 cursor-pointer"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={() => onDelete(question.id)}
              className="text-red-400 hover:bg-red-500/20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
