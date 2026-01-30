import React, { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const EMPTY_OPTION = { letter: "", text: "", is_correct: false };

export default function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  subjects = [],
  topics = [],
  onSubmit,
  isLoading
}) {
  const [formData, setFormData] = useState({
    question: "",
    subject_id: "",
    topic_id: "",
    difficulty: "medium",
    explanation: "",
    options: [
      { letter: "A", text: "", is_correct: true },
      { letter: "B", text: "", is_correct: false },
      { letter: "C", text: "", is_correct: false },
      { letter: "D", text: "", is_correct: false },
    ]
  });

  useEffect(() => {
    if (question) {
      setFormData({
        question: question.question || "",
        subject_id: question.subject_id || "",
        topic_id: question.topic_id || "",
        difficulty: question.difficulty || "medium",
        explanation: question.explanation || "",
        options: question.options?.length > 0 
          ? question.options 
          : [
              { letter: "A", text: "", is_correct: true },
              { letter: "B", text: "", is_correct: false },
              { letter: "C", text: "", is_correct: false },
              { letter: "D", text: "", is_correct: false },
            ]
      });
    } else {
      setFormData({
        question: "",
        subject_id: "",
        topic_id: "",
        difficulty: "medium",
        explanation: "",
        options: [
          { letter: "A", text: "", is_correct: true },
          { letter: "B", text: "", is_correct: false },
          { letter: "C", text: "", is_correct: false },
          { letter: "D", text: "", is_correct: false },
        ]
      });
    }
  }, [question, open]);

  const filteredTopics = formData.subject_id 
    ? topics.filter(t => t.subject_id === formData.subject_id)
    : [];

  const handleOptionChange = (index, field, value) => {
    setFormData(prev => {
      const newOptions = [...prev.options];
      if (field === 'is_correct') {
        // Only one can be correct
        newOptions.forEach((opt, i) => {
          opt.is_correct = i === index;
        });
      } else {
        newOptions[index] = { ...newOptions[index], [field]: value };
      }
      return { ...prev, options: newOptions };
    });
  };

  const addOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const nextLetter = letters[formData.options.length] || String(formData.options.length + 1);
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { letter: nextLetter, text: "", is_correct: false }]
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    setFormData(prev => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      // Re-letter
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      newOptions.forEach((opt, i) => {
        opt.letter = letters[i] || String(i + 1);
      });
      // Ensure at least one is correct
      if (!newOptions.some(o => o.is_correct)) {
        newOptions[0].is_correct = true;
      }
      return { ...prev, options: newOptions };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctAnswer = formData.options.find(o => o.is_correct)?.letter || 'A';
    onSubmit({
      ...formData,
      type: "multiple_choice",
      correct_answer: correctAnswer
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {question ? "Editar Questão" : "Nova Questão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Subject and Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Matéria</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value, topic_id: "" }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color || '#f59e0b' }} />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tópico</Label>
              <Select
                value={formData.topic_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, topic_id: value }))}
                disabled={!formData.subject_id}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white disabled:opacity-50">
                  <SelectValue placeholder={formData.subject_id ? "Selecione" : "Escolha uma matéria"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-48">
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {filteredTopics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label className="text-slate-300">Enunciado</Label>
            <Textarea
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Digite o enunciado da questão..."
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              required
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-slate-300">Dificuldade</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="easy">Fácil</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="hard">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Alternativas</Label>
              {formData.options.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOptionChange(index, 'is_correct', true)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-medium transition-all ${
                      option.is_correct
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.is_correct ? <CheckCircle2 className="w-5 h-5" /> : option.letter}
                  </button>
                  <Input
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`Alternativa ${option.letter}`}
                    className="bg-slate-800 border-slate-700 text-white flex-1"
                    required
                  />
                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Clique na letra para marcar a alternativa correta</p>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label className="text-slate-300">Explicação</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Explique por que a resposta está correta..."
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
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
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : question ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
