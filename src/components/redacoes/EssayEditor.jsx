import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Save, 
  Send, 
  FileText, 
  BookOpen, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function EssayEditor({ 
  proposal, 
  initialContent = "", 
  initialTitle = "",
  onSave, 
  onSubmit, 
  isSaving,
  isSubmitting,
  essayId
}) {
  // Generate a unique storage key for this essay
  const storageKey = essayId 
    ? `essay_draft_${essayId}` 
    : proposal?.id 
      ? `essay_draft_proposal_${proposal.id}` 
      : 'essay_draft_free';

  // Try to recover from localStorage first
  const getInitialContent = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use saved content if it's more recent or if there's no initial content
        if (!initialContent || parsed.content?.length > initialContent.length) {
          return parsed.content || initialContent;
        }
      } catch (e) {}
    }
    return initialContent;
  };

  const getInitialTitle = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!initialTitle && parsed.title) {
          return parsed.title;
        }
      } catch (e) {}
    }
    return initialTitle || `Redação: ${proposal?.title || 'Tema Livre'}`;
  };

  const [title, setTitle] = useState(getInitialTitle);
  const [content, setContent] = useState(getInitialContent);
  const [showTexts, setShowTexts] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = content.split('\n').filter(line => line.trim()).length;

  // Auto-save to localStorage every 5 seconds when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) {
        localStorage.setItem(storageKey, JSON.stringify({
          title,
          content,
          savedAt: new Date().toISOString()
        }));
        setLastSaved(new Date());
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title, storageKey]);

  // Clear localStorage after successful save to database
  const handleSaveSuccess = () => {
    localStorage.removeItem(storageKey);
  };

  useEffect(() => {
    if (!initialTitle && proposal?.title && !localStorage.getItem(storageKey)) {
      setTitle(`Redação: ${proposal.title}`);
    }
  }, [proposal, initialTitle, storageKey]);

  const handleSave = async () => {
    await onSave({ title, content, wordCount });
    handleSaveSuccess();
  };

  const handleSubmit = async () => {
    await onSubmit({ title, content, wordCount });
    handleSaveSuccess();
  };

  const isValidLength = wordCount >= 200 && wordCount <= 3000;

  return (
    <div className="space-y-6">
      {/* Proposal Info */}
      {proposal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{proposal.title}</h2>
              <p className="text-slate-400">{proposal.theme}</p>
            </div>
          </div>

          {proposal.description && (
            <p className="text-sm text-slate-300 mb-4">{proposal.description}</p>
          )}

          {proposal.motivating_texts?.length > 0 && (
            <Collapsible open={showTexts} onOpenChange={setShowTexts}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-slate-400 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Textos Motivadores ({proposal.motivating_texts.length})
                  </span>
                  {showTexts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                {proposal.motivating_texts.map((text, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    {text.title && (
                      <h4 className="font-medium text-white mb-2">{text.title}</h4>
                    )}
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{text.content}</p>
                    {text.source && (
                      <p className="text-xs text-slate-500 mt-2 italic">{text.source}</p>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {proposal.instructions && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-200">
                <strong>Instruções:</strong> {proposal.instructions}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="mb-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da redação"
            className="bg-slate-800/50 border-slate-700 text-white text-lg font-medium"
          />
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva sua redação aqui..."
          className="bg-slate-800/50 border-slate-700 text-white min-h-[400px] text-base leading-relaxed resize-none"
        />

        {/* Stats Bar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-4 text-sm">
            <span className={`${wordCount < 200 ? 'text-amber-400' : wordCount > 3000 ? 'text-red-400' : 'text-slate-400'}`}>
              {wordCount} palavras
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{lineCount} linhas</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{content.length} caracteres</span>
            {lastSaved && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-green-500 text-xs">✓ Salvo automaticamente</span>
              </>
            )}
          </div>

          {!isValidLength && content.length > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{wordCount < 200 ? 'Mínimo 200 palavras' : 'Máximo 3000 palavras'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || !isValidLength}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Corrigindo...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar para Correção
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
