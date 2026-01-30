import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GenerateQuestionsDialog({
  open,
  onOpenChange,
  subjects = [],
  topics = [],
  onGenerate,
  isLoading,
  selectedPattern = null
}) {
  const [formData, setFormData] = useState({
    subject_id: "",
    topic_id: "",
    customTopic: "",
    count: "5",
    difficulty: "medium"
  });

  React.useEffect(() => {
    if (selectedPattern?.extracted_patterns) {
      const topics = selectedPattern.extracted_patterns.common_topics;
      const firstTopic = topics && topics.length > 0 ? topics[0] : selectedPattern.exam_name;
      setFormData(prev => ({ 
        ...prev, 
        customTopic: firstTopic,
        subject_id: "",
        topic_id: ""
      }));
    }
  }, [selectedPattern]);

  const filteredTopics = formData.subject_id 
    ? topics.filter(t => t.subject_id === formData.subject_id)
    : [];

  const selectedTopic = topics.find(t => t.id === formData.topic_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    const topicName = selectedTopic?.name || formData.customTopic;
    if (!topicName) return;
    
    onGenerate({
      topic: topicName,
      subject_id: formData.subject_id,
      topic_id: formData.topic_id,
      count: formData.count,
      difficulty: formData.difficulty,
      pattern: selectedPattern
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Gerar Questões com IA
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Pattern Info */}
          {selectedPattern && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-medium text-purple-300">
                  Baseado em: {selectedPattern.exam_name}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                A IA vai gerar questões seguindo o padrão desta prova
              </p>
            </div>
          )}
          {/* Subject Selection */}
          {subjects.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Matéria</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value, topic_id: "" }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione uma matéria" className="truncate" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2 max-w-full">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color || '#f59e0b' }} />
                        <span className="truncate block">{subject.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Topic Selection or Custom Input */}
          <div className="space-y-2">
            <Label className="text-slate-300">Tópico</Label>
            {formData.subject_id && filteredTopics.length > 0 ? (
              <Select
                value={formData.topic_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, topic_id: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione um tópico" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
                  {filteredTopics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.customTopic}
                onChange={(e) => setFormData(prev => ({ ...prev, customTopic: e.target.value }))}
                placeholder="Ex: Direito Constitucional - Princípios Fundamentais"
                className="bg-slate-800 border-slate-700 text-white"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Quantidade</Label>
              <Select
                value={formData.count}
                onValueChange={(value) => setFormData(prev => ({ ...prev, count: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="3">3 questões</SelectItem>
                  <SelectItem value="5">5 questões</SelectItem>
                  <SelectItem value="10">10 questões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Dificuldade</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isLoading || (!formData.topic_id && !formData.customTopic)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
