import React from "react";
import { motion } from "framer-motion";
import { FileText, Calendar, CheckCircle2, Clock, Edit3, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  draft: { label: "Rascunho", icon: Edit3, color: "bg-slate-500/10 text-slate-400" },
  submitted: { label: "Enviada", icon: Clock, color: "bg-amber-500/10 text-amber-400" },
  corrected: { label: "Corrigida", icon: CheckCircle2, color: "bg-green-500/10 text-green-400" }
};

const boardLabels = {
  enem: "ENEM",
  fcc: "FCC",
  cespe: "CESPE",
  fgv: "FGV",
  vunesp: "VUNESP",
  other: "Outro"
};

export default function EssayHistoryCard({ essay, index = 0, onView, onEdit, onDelete }) {
  const status = statusConfig[essay.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const maxScore = essay.exam_board === 'enem' ? 1000 : 100;
  const scorePercentage = essay.total_score ? (essay.total_score / maxScore) * 100 : 0;

  const getScoreColor = () => {
    if (!essay.total_score) return 'text-slate-500';
    if (scorePercentage >= 80) return 'text-green-400';
    if (scorePercentage >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl p-5 hover:border-slate-700/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          essay.status === 'corrected' 
            ? 'bg-purple-500/10' 
            : 'bg-slate-800/50'
        }`}>
          <FileText className={`w-6 h-6 ${
            essay.status === 'corrected' ? 'text-purple-400' : 'text-slate-500'
          }`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${status.color} border-0`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            {essay.exam_board && (
              <Badge variant="outline" className="text-xs">
                {boardLabels[essay.exam_board]}
              </Badge>
            )}
            {essay.version > 1 && (
              <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                v{essay.version}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-white mb-1 line-clamp-1" title={essay.title}>{essay.title}</h3>
          <p className="text-sm text-slate-400 line-clamp-1 mb-2" title={essay.theme}>{essay.theme}</p>
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(essay.created_date), "dd MMM yyyy", { locale: ptBR })}
            </span>
            <span>{essay.word_count || 0} palavras</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {essay.status === 'corrected' && essay.total_score && (
            <div className="text-right">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>
                {essay.total_score}
              </span>
              <span className="text-sm text-slate-500">/{maxScore}</span>
            </div>
          )}
          
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {essay.status === 'draft' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(essay)}
                className="text-slate-400 hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(essay.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => onView(essay)}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
