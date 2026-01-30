import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Brain,
  PenTool,
  Sparkles,
  Loader2,
  Save,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  RefreshCw,
  Copy,
  Check,
  GraduationCap,
  Lightbulb,
  ListChecks,
  AlertTriangle,
  Bookmark,
  Scale,
  Zap,
  Award,
  TrendingUp,
  Network,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import StudyContentCards from "@/components/estudo/StudyContentCards";
import InteractiveMindMap from "@/components/notes/InteractiveMindMap";
import StudyPomodoro from "@/components/estudo/StudyPomodoro";

const statusConfig = {
  pending: { icon: Circle, label: "Pendente", color: "text-slate-500", bg: "bg-slate-500/10" },
  studying: { icon: Clock, label: "Estudando", color: "text-amber-500", bg: "bg-amber-500/10" },
  review: { icon: Target, label: "Revisão", color: "text-blue-500", bg: "bg-blue-500/10" },
  mastered: { icon: CheckCircle2, label: "Dominado", color: "text-green-500", bg: "bg-green-500/10" }
};

const difficultyConfig = {
  easy: { label: "Fácil", color: "bg-green-500/10 text-green-400" },
  medium: { label: "Médio", color: "bg-amber-500/10 text-amber-400" },
  hard: { label: "Difícil", color: "bg-red-500/10 text-red-400" }
};

export default function EstudarTopico() {
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [mindMapData, setMindMapData] = useState(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const topics = await base44.entities.Topic.filter({ id: topicId });
      return topics[0];
    },
    enabled: !!topicId,
  });

  // Set notes from topic data
  React.useEffect(() => {
    if (topic?.notes && notes === "") {
      setNotes(topic.notes);
    }
  }, [topic]);

  const { data: subject } = useQuery({
    queryKey: ['subject', topic?.subject_id],
    queryFn: async () => {
      const subjects = await base44.entities.Subject.filter({ id: topic.subject_id });
      return subjects[0];
    },
    enabled: !!topic?.subject_id,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['topicFlashcards', topicId],
    queryFn: () => base44.entities.Flashcard.filter({ topic_id: topicId, created_by: user.email }),
    enabled: !!topicId && !!user?.email,
  });

  // Update topic mutation
  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Topic.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic', topicId] }),
  });

  // Save study session mutation
  const saveStudySessionMutation = useMutation({
    mutationFn: (minutes) => base44.entities.StudySession.create({
      topic_id: topic.id,
      subject_id: topic.subject_id,
      duration_minutes: minutes,
      pomodoros_completed: 1,
      type: 'study',
      date: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
    },
  });

  // Generate extensive study content
  const generateStudyContentMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('agent_content', {
        topic,
        subject
      });
      const result = response.data;
      
      // Save to database
      await updateTopicMutation.mutateAsync({
        id: topic.id,
        data: { study_content: result }
      });
      
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic', topicId] }),
  });

  // Generate summary
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('agent_notes', {
        action: 'summary',
        topic,
        subject
      });
      const result = response.data;
      
      await updateTopicMutation.mutateAsync({
        id: topic.id,
        data: { summary: result.summary }
      });
      
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic', topicId] }),
  });

  // Generate flashcards
  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('agent_questions', {
        action: 'flashcards',
        topic,
        subject
      });
      const result = response.data;

      for (const fc of result.flashcards || []) {
        await base44.entities.Flashcard.create({
          topic_id: topic.id,
          subject_id: topic.subject_id,
          front: fc.front,
          back: fc.back,
          difficulty: "medium"
        });
      }
      
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topicFlashcards', topicId] }),
  });

  // Generate essay proposal
  const generateEssayMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('agent_essay', {
        action: 'essay_proposal',
        topic,
        subject
      });
      const result = response.data;

      const proposal = await base44.entities.EssayProposal.create({
        title: result.title,
        theme: result.theme,
        description: result.description,
        motivating_texts: result.motivating_texts,
        instructions: result.instructions,
        exam_board: "other",
        difficulty: "medium",
        category: subject?.name || "Geral",
        is_custom: true
      });
      
      return proposal;
    },
  });

  const handleSaveNotes = async () => {
    await updateTopicMutation.mutateAsync({
      id: topic.id,
      data: { notes }
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleStatusChange = (newStatus) => {
    updateTopicMutation.mutate({
      id: topic.id,
      data: { status: newStatus }
    });
  };

  const handleGenerate = async (type) => {
    setIsGenerating(type);
    try {
      if (type === 'summary') {
        await generateSummaryMutation.mutateAsync();
      } else if (type === 'flashcards') {
        await generateFlashcardsMutation.mutateAsync();
      } else if (type === 'essay') {
        const proposal = await generateEssayMutation.mutateAsync();
        window.location.href = createPageUrl(`Redacoes?proposal=${proposal.id}`);
      }
    } finally {
      setIsGenerating(null);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(topic.summary || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateMindMap = async () => {
    setIsGeneratingMindMap(true);
    try {
      const response = await base44.functions.invoke('agent_notes', {
        action: 'mindmap',
        topic,
        subject
      });
      setMindMapData(response.data);
      setShowMindMap(true);
    } catch (error) {
      console.error("Error generating mind map:", error);
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-slate-400">Tópico não encontrado</p>
        <Link to={createPageUrl("Materias")}>
          <Button variant="outline" className="mt-4 border-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Matérias
          </Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusConfig[topic.status || 'pending'].icon;
  const studyContent = topic?.study_content;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link to={createPageUrl("Materias")} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para Matérias</span>
        </Link>

        {/* Pomodoro Timer */}
        <div className="mb-6">
          <StudyPomodoro 
            topicId={topic.id}
            topicName={topic.name}
            onSessionComplete={(minutes) => saveStudySessionMutation.mutate(minutes)}
          />
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col gap-5">
            {/* Top Row - Subject & Difficulty */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: `${subject?.color || '#f59e0b'}15`, color: subject?.color || '#f59e0b' }}
                >
                  {subject?.name || 'Matéria'}
                </span>
                <Badge className={`${difficultyConfig[topic.difficulty || 'medium'].color} text-xs`}>
                  {difficultyConfig[topic.difficulty || 'medium'].label}
                </Badge>
              </div>
              {topic.study_content && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Material salvo
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white">{topic.name}</h1>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/50 w-fit">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = (topic.status || 'pending') === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                      isActive 
                        ? `${config.bg} ${config.color}` 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium hidden sm:inline">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue="estudar" className="w-full">
          <TabsList className="w-full bg-slate-800/50 border border-slate-700/50 p-3 mb-8 rounded-2xl grid grid-cols-3 sm:grid-cols-5 gap-2 h-auto">
            <TabsTrigger value="estudar" className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-3 transition-all">
              <GraduationCap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Estudar</span>
            </TabsTrigger>
            <TabsTrigger value="resumo" className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-3 transition-all">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="mapamental" className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-3 transition-all">
              <Network className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Mapa Mental</span>
            </TabsTrigger>
            <TabsTrigger value="anotacoes" className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-3 transition-all">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Anotações</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-3 transition-all">
              <Brain className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Flashcards</span>
              {flashcards.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">{flashcards.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Estudar Tab */}
          <TabsContent value="estudar">
            <div className="space-y-6">
              {studyContent ? (
                <>
                  {/* Header with Stats */}
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                          <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Material de Estudo</h3>
                          <p className="text-slate-400 text-sm">Conteúdo salvo e disponível offline</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-6 mr-4">
                          {studyContent.key_concepts?.length > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-400">{studyContent.key_concepts.length}</p>
                              <p className="text-xs text-slate-500">Conceitos</p>
                            </div>
                          )}
                          {studyContent.exam_tips?.length > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-400">{studyContent.exam_tips.length}</p>
                              <p className="text-xs text-slate-500">Dicas</p>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => generateStudyContentMutation.mutate()} disabled={generateStudyContentMutation.isPending} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl">
                          {generateStudyContentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span className="ml-2 hidden sm:inline">Regenerar</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info Boxes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Key Concepts Box */}
                    {studyContent.key_concepts?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-blue-400" />
                          </div>
                          <h4 className="font-bold text-white">Conceitos-Chave</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {studyContent.key_concepts.map((concept, i) => (
                            <span 
                              key={i} 
                              className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Mistakes Box */}
                    {studyContent.common_mistakes?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          </div>
                          <h4 className="font-bold text-white">Erros Comuns</h4>
                        </div>
                        <ul className="space-y-2">
                          {studyContent.common_mistakes.slice(0, 3).map((mistake, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-red-400 mt-0.5">✕</span>
                              <span className="line-clamp-2">{mistake}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {/* Tips Box */}
                    {studyContent.exam_tips?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          </div>
                          <h4 className="font-bold text-white">Dicas de Prova</h4>
                        </div>
                        <ul className="space-y-2">
                          {studyContent.exam_tips.slice(0, 3).map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-green-400 mt-0.5">✓</span>
                              <span className="line-clamp-2">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </div>

                  {/* Main Content Cards */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-white">Conteúdo Teórico</h3>
                      <span className="text-xs text-slate-500">Clique nas seções para expandir</span>
                    </div>
                    <StudyContentCards 
                      content={studyContent.content} 
                      topicName={topic.name}
                      onContentUpdate={async (newContent) => {
                        const newStudyContent = { ...studyContent, content: newContent };
                        await updateTopicMutation.mutateAsync({
                          id: topic.id,
                          data: { study_content: newStudyContent }
                        });
                      }}
                    />
                  </motion.div>

                  {/* Full Lists - Expanded */}
                  {((studyContent.common_mistakes?.length > 3) || (studyContent.exam_tips?.length > 3)) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {studyContent.common_mistakes?.length > 3 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card rounded-2xl p-5 border-l-4 border-l-red-500"
                        >
                          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            Todos os Erros Comuns
                          </h4>
                          <ul className="space-y-2">
                            {studyContent.common_mistakes.map((mistake, i) => (
                              <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-red-500/5 text-sm text-slate-300">
                                <span className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-red-400">{i + 1}</span>
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {studyContent.exam_tips?.length > 3 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card rounded-2xl p-5 border-l-4 border-l-green-500"
                        >
                          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            Todas as Dicas de Prova
                          </h4>
                          <ul className="space-y-2">
                            {studyContent.exam_tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-green-500/5 text-sm text-slate-300">
                                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card rounded-3xl p-12">
                  <div className="text-center max-w-lg mx-auto">
                    <div className="relative mb-8">
                      <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mx-auto">
                        <GraduationCap className="w-16 h-16 text-amber-500" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Pronto para Estudar?</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                      Gere um material completo e aprofundado com inteligência artificial. 
                      O conteúdo será salvo automaticamente para você acessar quando quiser.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                      <Button 
                        onClick={() => generateStudyContentMutation.mutate()} 
                        disabled={generateStudyContentMutation.isPending} 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/30 px-12 py-5 h-auto rounded-2xl text-lg font-semibold"
                      >
                        {generateStudyContentMutation.isPending ? (
                          <>
                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            Gerando conteúdo...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6 mr-3" />
                            Gerar Material de Estudo
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-slate-500">⏱ Leva cerca de 10-20 segundos</p>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-10 pt-8 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-4">O QUE SERÁ GERADO:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: BookOpen, label: "Teoria Completa", desc: "7 seções" },
                          { icon: Lightbulb, label: "Conceitos-Chave", desc: "Tags rápidas" },
                          { icon: AlertTriangle, label: "Erros Comuns", desc: "Armadilhas" },
                          { icon: Target, label: "Dicas de Prova", desc: "Estratégias" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/30 text-left">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <item.icon className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{item.label}</p>
                              <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mapa Mental Tab */}
          <TabsContent value="mapamental">
            <div className="glass-card rounded-3xl overflow-hidden" style={{ minHeight: '600px' }}>
              {showMindMap && mindMapData ? (
                <InteractiveMindMap
                  initialNodes={mindMapData.nodes}
                  initialConnections={mindMapData.connections}
                  title={topic.name}
                  onSave={(data) => {
                    setMindMapData(data);
                  }}
                />
              ) : (
                <div className="text-center py-16 px-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
                    <Network className="w-10 h-10 text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Mapa Mental Interativo</h3>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Gere um mapa mental interativo com IA. Você poderá editar, reorganizar e exportar o mapa depois.
                  </p>
                  <Button 
                    onClick={handleGenerateMindMap} 
                    disabled={isGeneratingMindMap} 
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg shadow-cyan-500/25 px-8 py-3 h-auto rounded-xl"
                  >
                    {isGeneratingMindMap ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gerando Estrutura...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Gerar Mapa Mental com IA
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 mt-4">⏱ Leva cerca de 5-10 segundos</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Resumo Tab */}
          <TabsContent value="resumo">
            <div className="glass-card rounded-3xl p-8">
              {topic.summary ? (
                <div>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Resumo do Tópico</h3>
                        <p className="text-xs text-slate-500">Gerado com IA</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={handleCopySummary} className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleGenerate('summary')} disabled={isGenerating === 'summary'} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl">
                        {isGenerating === 'summary' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">Regenerar</span>
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-amber-400 prose-strong:text-amber-300 prose-li:marker:text-amber-500">
                    <ReactMarkdown>{topic.summary}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum resumo gerado</h3>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">Gere um resumo completo com IA para começar a estudar este tópico de forma eficiente</p>
                  <Button onClick={() => handleGenerate('summary')} disabled={isGenerating === 'summary'} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 px-8 py-3 h-auto rounded-xl">
                    {isGenerating === 'summary' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Gerar Resumo com IA
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Anotações Tab */}
          <TabsContent value="anotacoes">
            <div className="glass-card rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Minhas Anotações</h3>
                    <p className="text-xs text-slate-500">Suas notas pessoais sobre este tópico</p>
                  </div>
                </div>
                <Button onClick={handleSaveNotes} disabled={updateTopicMutation.isPending} className={`rounded-xl px-6 transition-all ${notesSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'} text-white shadow-lg`}>
                  {notesSaved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {notesSaved ? 'Salvo!' : 'Salvar'}
                </Button>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escreva suas anotações sobre este tópico... Use este espaço para adicionar insights, dúvidas, conexões com outros temas ou qualquer informação que ajude no seu aprendizado."
                className="bg-slate-800/30 border-slate-700/50 text-white min-h-[350px] rounded-2xl p-5 text-base leading-relaxed focus:ring-amber-500/50 focus:border-amber-500/50"
              />
            </div>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards">
            <div className="glass-card rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Flashcards do Tópico</h3>
                    <p className="text-xs text-slate-500">{flashcards.length} cartões disponíveis</p>
                  </div>
                </div>
                <Button onClick={() => handleGenerate('flashcards')} disabled={isGenerating === 'flashcards'} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 rounded-xl">
                  {isGenerating === 'flashcards' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Gerar +5 Flashcards
                </Button>
              </div>

              {flashcards.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <Brain className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum flashcard</h3>
                  <p className="text-slate-400 max-w-md mx-auto">Gere flashcards para memorização espaçada e fixe o conteúdo na memória de longo prazo</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {flashcards.map((fc, index) => (
                    <div key={fc.id} className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-500 font-bold text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-3">{fc.front}</p>
                          <div className="p-3 rounded-xl bg-slate-900/50 border-l-2 border-green-500/50">
                            <p className="text-slate-300 text-sm">{fc.back}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {flashcards.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <Link to={createPageUrl("Flashcards")}>
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl py-4 h-auto">
                      <Brain className="w-5 h-5 mr-2" />
                      Ir para Revisão de Flashcards
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
        <div className="glass-card rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Ações Rápidas</h3>
              <p className="text-xs text-slate-500">Gere conteúdo com inteligência artificial</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => handleGenerate('summary')} disabled={isGenerating === 'summary'} className="group relative overflow-hidden h-auto p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-500/40 transition-all text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <p className="font-semibold text-white mb-1">{topic.summary ? 'Regenerar' : 'Gerar'} Resumo</p>
                <p className="text-xs text-slate-400">IA cria resumo completo do tópico</p>
                {isGenerating === 'summary' && <Loader2 className="w-4 h-4 absolute top-0 right-0 animate-spin text-blue-400" />}
              </div>
            </button>

            <button onClick={() => handleGenerate('flashcards')} disabled={isGenerating === 'flashcards'} className="group relative overflow-hidden h-auto p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <p className="font-semibold text-white mb-1">Criar Flashcards</p>
                <p className="text-xs text-slate-400">+5 cartões para memorização</p>
                {isGenerating === 'flashcards' && <Loader2 className="w-4 h-4 absolute top-0 right-0 animate-spin text-purple-400" />}
              </div>
            </button>

            <button onClick={() => handleGenerate('essay')} disabled={isGenerating === 'essay'} className="group relative overflow-hidden h-auto p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 hover:border-amber-500/40 transition-all text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <PenTool className="w-6 h-6 text-amber-400" />
                </div>
                <p className="font-semibold text-white mb-1">Proposta de Redação</p>
                <p className="text-xs text-slate-400">Tema relacionado ao tópico</p>
                {isGenerating === 'essay' && <Loader2 className="w-4 h-4 absolute top-0 right-0 animate-spin text-amber-400" />}
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
