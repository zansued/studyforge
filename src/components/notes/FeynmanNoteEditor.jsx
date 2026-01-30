import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Loader2,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function FeynmanNoteEditor({ 
  note, 
  onChange, 
  onAnalyze,
  isGenerating 
}) {
  const [content, setContent] = useState(note?.content || "");
  const [explanation, setExplanation] = useState(note?.feynman_explanation || "");
  const [gaps, setGaps] = useState(note?.feynman_gaps || []);

  const handleContentChange = (value) => {
    setContent(value);
    onChange({ content: value, feynman_explanation: explanation, feynman_gaps: gaps });
  };

  const handleExplanationChange = (value) => {
    setExplanation(value);
    onChange({ content, feynman_explanation: value, feynman_gaps: gaps });
  };

  return (
    <div className="space-y-4">
      {/* Feynman Info */}
      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <p className="text-xs text-purple-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          <span>
            <strong>Técnica Feynman:</strong> Explique o conceito como se estivesse ensinando uma criança. 
            Se não conseguir simplificar, você encontrou uma lacuna no seu conhecimento.
          </span>
        </p>
      </div>

      {/* Step 1: Study */}
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          1. Estude e Anote o Conceito
        </Label>
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Anote tudo o que você sabe sobre o tema. Inclua definições, fórmulas, exemplos..."
          className="bg-slate-800/50 border-slate-700 text-white min-h-[150px] resize-none"
        />
      </div>

      {/* Step 2: Explain */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" />
            2. Explique com Suas Palavras (Para uma Criança)
          </Label>
        </div>
        <Textarea
          value={explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          placeholder="Agora explique o conceito de forma simples, usando analogias e exemplos do dia a dia. Evite jargões técnicos..."
          className="bg-slate-800/50 border-slate-700 text-white min-h-[150px] resize-none"
        />
      </div>

      {/* Step 3: Analyze */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            3. Identifique Lacunas no Conhecimento
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onAnalyze}
            disabled={isGenerating || (!content && !explanation)}
            className="text-amber-400 hover:text-amber-300 h-7 text-xs"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Analisar com IA
              </>
            )}
          </Button>
        </div>

        {gaps.length > 0 ? (
          <div className="space-y-2">
            {gaps.map((gap, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">{gap}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-center">
            <p className="text-sm text-slate-500">
              Clique em "Analisar com IA" para identificar lacunas no seu conhecimento
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <h4 className="text-sm font-medium text-white mb-2">💡 Dicas para a Técnica Feynman:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Use analogias e metáforas do cotidiano</li>
          <li>• Evite termos técnicos - use linguagem simples</li>
          <li>• Se travar em algum ponto, volte ao material de estudo</li>
          <li>• Desenhar diagramas ajuda a visualizar conceitos</li>
        </ul>
      </div>
    </div>
  );
}
