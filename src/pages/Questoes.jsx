import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  BookOpen,
  BarChart3,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import QuestionFilters from "@/components/questoes/QuestionFilters";
import QuestionCard from "@/components/questoes/QuestionCard";
import QuestionFormDialog from "@/components/questoes/QuestionFormDialog";
import GenerateQuestionsDialog from "@/components/questoes/GenerateQuestionsDialog";
import ExamPatternsDialog from "@/components/questoes/ExamPatternsDialog";

export default function Questoes() {
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPatternsDialog, setShowPatternsDialog] = useState(false);
  const [showPracticeDialog, setShowPracticeDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    subject_id: "",
    topic_id: "",
    difficulty: ""
  });
  const [practiceState, setPracticeState] = useState({
    currentIndex: 0,
    selectedAnswer: null,
    showResult: false,
    questions: [],
    results: []
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', user?.email],
    queryFn: () => base44.entities.Question.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  // CRUD Mutations
  const createQuestionMutation = useMutation({
    mutationFn: (data) => base44.entities.Question.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setShowFormDialog(false);
      setEditingQuestion(null);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Question.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setShowFormDialog(false);
      setEditingQuestion(null);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => base44.entities.Question.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  // Generate questions with AI
  const generateQuestionsMutation = useMutation({
    mutationFn: async ({ topic, subject_id, topic_id, count, difficulty, pattern }) => {
      const difficultyMap = {
        easy: "fáceis",
        medium: "de dificuldade média",
        hard: "difíceis"
      };

      let prompt = `Você é um especialista em elaboração de questões de concursos públicos.

TAREFA: Crie ${count} questões ${difficultyMap[difficulty]} de múltipla escolha sobre "${topic}".`;

      // Add pattern-based instructions
      if (pattern?.extracted_patterns) {
        const p = pattern.extracted_patterns;
        prompt += `\n\n🎯 IMPORTANTE: Você DEVE seguir RIGOROSAMENTE o padrão da prova "${pattern.exam_name}".`;
        
        if (p.question_style) {
          prompt += `\n\n📝 ESTILO DAS QUESTÕES:\n${p.question_style}`;
        }
        
        if (p.typical_structures?.length > 0) {
          prompt += `\n\n📐 ESTRUTURA TÍPICA:\n${p.typical_structures.map(s => `- ${s}`).join('\n')}`;
        }
        
        if (p.frequent_terms?.length > 0) {
          prompt += `\n\n🔑 TERMOS E EXPRESSÕES FREQUENTES:\nUse vocabulário similar a: ${p.frequent_terms.slice(0, 8).join(', ')}`;
        }
        
        if (p.question_examples?.length > 0) {
          prompt += `\n\n📚 EXEMPLOS REAIS DESTA PROVA PARA VOCÊ IMITAR:`;
          p.question_examples.slice(0, 2).forEach((ex, i) => {
            prompt += `\n\n--- Exemplo ${i + 1} ---\n${ex.question}`;
            if (ex.options && ex.options.length > 0) {
              ex.options.forEach((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                const correct = ex.correct_answer === letter ? ' ✓ CORRETA' : '';
                prompt += `\n${letter}) ${opt}${correct}`;
              });
            }
          });
          prompt += `\n\n⚡ REPLIQUE o estilo, estrutura, complexidade e formato destes exemplos nas questões que você criar.`;
        }
      } else {
        prompt += `\n\nAs questões devem ser no estilo de bancas como CESPE, FCC, FGV.`;
      }
      
      prompt += `\n\nCada questão deve ter:
        - Enunciado claro e objetivo
        - 4 alternativas (A, B, C, D)
        - Apenas uma alternativa correta
        - Explicação detalhada da resposta correta`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        letter: { type: "string" },
                        text: { type: "string" },
                        is_correct: { type: "boolean" }
                      }
                    }
                  },
                  explanation: { type: "string" }
                }
              }
            }
          }
        }
      });

      for (const q of result.questions || []) {
        await base44.entities.Question.create({
          question: q.question,
          type: "multiple_choice",
          options: q.options,
          correct_answer: q.options?.find(o => o.is_correct)?.letter,
          explanation: q.explanation,
          difficulty,
          subject_id: subject_id || undefined,
          topic_id: topic_id || undefined
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setShowGenerateDialog(false);
    },
  });

  const recordAttemptMutation = useMutation({
    mutationFn: async ({ questionId, selectedAnswer, isCorrect }) => {
      await base44.entities.QuestionAttempt.create({
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        date: new Date().toISOString()
      });

      const question = questions.find(q => q.id === questionId);
      await base44.entities.Question.update(questionId, {
        times_answered: (question.times_answered || 0) + 1,
        times_correct: (question.times_correct || 0) + (isCorrect ? 1 : 0)
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filters.search && !q.question.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.subject_id && q.subject_id !== filters.subject_id) {
        return false;
      }
      if (filters.topic_id && q.topic_id !== filters.topic_id) {
        return false;
      }
      if (filters.difficulty && q.difficulty !== filters.difficulty) {
        return false;
      }
      return true;
    });
  }, [questions, filters]);

  // Handlers
  const handleSubmitQuestion = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingQuestion) {
        await updateQuestionMutation.mutateAsync({ id: editingQuestion.id, data });
      } else {
        await createQuestionMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async (data) => {
    setIsGenerating(true);
    try {
      await generateQuestionsMutation.mutateAsync(data);
      setSelectedPattern(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUsePattern = (pattern) => {
    setSelectedPattern(pattern);
    setShowPatternsDialog(false);
    setShowGenerateDialog(true);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setShowFormDialog(true);
  };

  const handlePracticeSingle = (question) => {
    setPracticeState({
      currentIndex: 0,
      selectedAnswer: null,
      showResult: false,
      questions: [question],
      results: []
    });
    setShowPracticeDialog(true);
  };

  const startPractice = (questionsToUse = filteredQuestions) => {
    setPracticeState({
      currentIndex: 0,
      selectedAnswer: null,
      showResult: false,
      questions: [...questionsToUse].sort(() => Math.random() - 0.5).slice(0, 10),
      results: []
    });
    setShowPracticeDialog(true);
  };

  const handleAnswer = (letter) => {
    setPracticeState(prev => ({ ...prev, selectedAnswer: letter }));
  };

  const confirmAnswer = () => {
    const currentQ = practiceState.questions[practiceState.currentIndex];
    const isCorrect = practiceState.selectedAnswer === currentQ.correct_answer;
    
    recordAttemptMutation.mutate({
      questionId: currentQ.id,
      selectedAnswer: practiceState.selectedAnswer,
      isCorrect
    });

    setPracticeState(prev => ({
      ...prev,
      showResult: true,
      results: [...prev.results, { questionId: currentQ.id, isCorrect }]
    }));
  };

  const nextQuestion = () => {
    if (practiceState.currentIndex < practiceState.questions.length - 1) {
      setPracticeState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false
      }));
    } else {
      setShowPracticeDialog(false);
    }
  };

  // Stats
  const totalAttempts = questions.reduce((acc, q) => acc + (q.times_answered || 0), 0);
  const totalCorrect = questions.reduce((acc, q) => acc + (q.times_correct || 0), 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Helper to get subject/topic for a question
  const getSubject = (subjectId) => subjects.find(s => s.id === subjectId);
  const getTopic = (topicId) => topics.find(t => t.id === topicId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Questões</h1>
          <p className="text-slate-400">
            {questions.length} questões • {accuracy}% de acerto geral
          </p>
        </div>
        <div className="flex gap-2">
          {filteredQuestions.length > 0 && (
            <Button
              onClick={() => startPractice()}
              variant="outline"
              className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Praticar
            </Button>
          )}
          <Button
            onClick={() => setShowPatternsDialog(true)}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Brain className="w-4 h-4 mr-2" />
            Analisar Provas
          </Button>
          <Button
            onClick={() => { setSelectedPattern(null); setShowGenerateDialog(true); }}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar com IA
          </Button>
          <Button
            onClick={() => { setEditingQuestion(null); setShowFormDialog(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {questions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{questions.length}</p>
                <p className="text-xs text-slate-500">Total de Questões</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalAttempts}</p>
                <p className="text-xs text-slate-500">Respostas</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{accuracy}%</p>
                <p className="text-xs text-slate-500">Taxa de Acerto</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      {questions.length > 0 && (
        <QuestionFilters
          filters={filters}
          onFiltersChange={setFilters}
          subjects={subjects}
          topics={topics}
        />
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhuma questão ainda</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Crie questões manualmente ou use a IA para gerar automaticamente.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setShowGenerateDialog(true)}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar com IA
            </Button>
            <Button
              onClick={() => setShowFormDialog(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Questão
            </Button>
          </div>
        </motion.div>
      ) : filteredQuestions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-8 text-center"
        >
          <p className="text-slate-400">Nenhuma questão encontrada com os filtros aplicados.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                subject={getSubject(question.subject_id)}
                topic={getTopic(question.topic_id)}
                onEdit={handleEdit}
                onDelete={(id) => deleteQuestionMutation.mutate(id)}
                onPractice={handlePracticeSingle}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialogs */}
      <QuestionFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        question={editingQuestion}
        subjects={subjects}
        topics={topics}
        onSubmit={handleSubmitQuestion}
        isLoading={isSubmitting}
      />

      <GenerateQuestionsDialog
        open={showGenerateDialog}
        onOpenChange={(open) => {
          setShowGenerateDialog(open);
          if (!open) setSelectedPattern(null);
        }}
        subjects={subjects}
        topics={topics}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
        selectedPattern={selectedPattern}
      />

      <ExamPatternsDialog
        open={showPatternsDialog}
        onOpenChange={setShowPatternsDialog}
        onUsePattern={handleUsePattern}
      />

      {/* Practice Dialog */}
      {showPracticeDialog && practiceState.questions.length > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>Questão {practiceState.currentIndex + 1} de {practiceState.questions.length}</span>
                <span>{practiceState.results.filter(r => r.isCorrect).length} corretas</span>
              </div>
              <Progress 
                value={((practiceState.currentIndex + 1) / practiceState.questions.length) * 100} 
                className="h-2 bg-slate-800" 
              />
            </div>

            <div className="space-y-6">
              <p className="text-lg text-white">
                {practiceState.questions[practiceState.currentIndex].question}
              </p>

              <div className="space-y-3">
                {practiceState.questions[practiceState.currentIndex].options?.map((option) => {
                  const isSelected = practiceState.selectedAnswer === option.letter;
                  const isCorrect = option.is_correct;
                  const showFeedback = practiceState.showResult;

                  return (
                    <button
                      key={option.letter}
                      onClick={() => !practiceState.showResult && handleAnswer(option.letter)}
                      disabled={practiceState.showResult}
                      className={`w-full p-4 rounded-xl text-left transition-all flex items-start gap-3 ${
                        showFeedback
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-500/50'
                            : isSelected
                              ? 'bg-red-500/20 border-red-500/50'
                              : 'bg-slate-800/50 border-slate-700/50'
                          : isSelected
                            ? 'bg-amber-500/20 border-amber-500/50'
                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                      } border`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-medium ${
                        showFeedback
                          ? isCorrect
                            ? 'bg-green-500 text-white'
                            : isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          : isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-700 text-slate-300'
                      }`}>
                        {option.letter}
                      </span>
                      <span className="flex-1 text-white">{option.text}</span>
                      {showFeedback && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {practiceState.showResult && practiceState.questions[practiceState.currentIndex].explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700"
                >
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-amber-500">Explicação: </span>
                    {practiceState.questions[practiceState.currentIndex].explanation}
                  </p>
                </motion.div>
              )}

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPracticeDialog(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Sair
                </Button>
                {!practiceState.showResult ? (
                  <Button
                    onClick={confirmAnswer}
                    disabled={!practiceState.selectedAnswer}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Confirmar Resposta
                  </Button>
                ) : (
                  <Button
                    onClick={nextQuestion}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {practiceState.currentIndex < practiceState.questions.length - 1 ? (
                      <>
                        Próxima
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      "Finalizar"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
