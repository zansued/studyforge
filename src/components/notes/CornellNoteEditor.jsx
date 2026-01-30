import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2,
  HelpCircle,
  Lightbulb,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function CornellNoteEditor({ 
  note, 
  onChange, 
  onGenerateCues,
  onGenerateSummary,
  isGenerating 
}) {
  const [content, setContent] = useState(note?.content || "");
  const [cues, setCues] = useState(note?.cornell_cues || []);
  const [summary, setSummary] = useState(note?.cornell_summary || "");

  const handleContentChange = (value) => {
    setContent(value);
    onChange({ content: value, cornell_cues: cues, cornell_summary: summary });
  };

  const handleCuesChange = (newCues) => {
    setCues(newCues);
    onChange({ content, cornell_cues: newCues, cornell_summary: summary });
  };

  const handleSummaryChange = (value) => {
    setSummary(value);
    onChange({ content, cornell_cues: cues, cornell_summary: value });
  };

  const addCue = () => {
    const newCues = [...cues, { cue: "", answer: "" }];
    handleCuesChange(newCues);
  };

  const updateCue = (index, field, value) => {
    const newCues = [...cues];
    newCues[index] = { ...newCues[index], [field]: value };
    handleCuesChange(newCues);
  };

  const removeCue = (index) => {
    const newCues = cues.filter((_, i) => i !== index);
    handleCuesChange(newCues);
  };

  return (
    <div className="space-y-4">
      {/* Cornell Layout Info */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          <span>
            <strong>Sistema Cornell:</strong> Anote na coluna principal, crie perguntas na coluna de cues, 
            e resuma no final para revisão eficiente.
          </span>
        </p>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cues Column */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Palavras-Chave / Perguntas
            </Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onGenerateCues}
              disabled={isGenerating || !content}
              className="text-amber-400 hover:text-amber-300 h-7 text-xs"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Gerar com IA
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {cues.map((cue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 group"
              >
                <div className="flex items-start gap-2">
                  <Input
                    value={cue.cue}
                    onChange={(e) => updateCue(index, 'cue', e.target.value)}
                    placeholder="Pergunta ou palavra-chave"
                    className="bg-transparent border-0 p-0 h-auto text-amber-400 font-medium focus-visible:ring-0 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCue(index)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <Textarea
                  value={cue.answer || ""}
                  onChange={(e) => updateCue(index, 'answer', e.target.value)}
                  placeholder="Resposta breve (opcional)"
                  className="bg-transparent border-0 p-0 min-h-[40px] text-slate-400 focus-visible:ring-0 text-xs mt-1 resize-none"
                />
              </motion.div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCue}
            className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Cue
          </Button>
        </div>

        {/* Notes Column */}
        <div className="lg:col-span-2 space-y-3">
          <Label className="text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Anotações Principais
          </Label>
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Escreva suas anotações aqui. Seja detalhado e organize por tópicos..."
            className="bg-slate-800/50 border-slate-700 text-white min-h-[300px] resize-none"
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-green-400" />
            Resumo (para revisão)
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onGenerateSummary}
            disabled={isGenerating || !content}
            className="text-green-400 hover:text-green-300 h-7 text-xs"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Resumir com IA
              </>
            )}
          </Button>
        </div>
        <Textarea
          value={summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          placeholder="Resuma os pontos principais em poucas palavras para revisão rápida..."
          className="bg-slate-800/50 border-slate-700 text-white min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}
