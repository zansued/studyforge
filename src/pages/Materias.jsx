import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Target,
  FileText,
  Trash2,
  Pencil,
  Download,
  MoreVertical,
  ExternalLink,
  Wand2,
  ListTree,
  Filter,
  GripVertical,
  Split
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import SubjectFormDialog from "@/components/materias/SubjectFormDialog";
import TopicFormDialog from "@/components/materias/TopicFormDialog";
import ImportFromEditalDialog from "@/components/materias/ImportFromEditalDialog";

export default function Materias() {
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandingSubjectId, setExpandingSubjectId] = useState(null);
  const [subdividingTopicId, setSubdividingTopicId] = useState(null);
  const [showExpandDialog, setShowExpandDialog] = useState(false);
  const [subjectToExpand, setSubjectToExpand] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const editalId = urlParams.get('edital');
  const [filterEditalId, setFilterEditalId] = useState(editalId || "all");
  const [localSubjects, setLocalSubjects] = useState([]);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: querySubjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: async () => {
      // Sort must be a string, array is not supported by SDK
      const subjects = await base44.entities.Subject.filter({ created_by: user.email }, 'order', 1000);
      // Secondary sort client-side if needed
      return subjects.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    enabled: !!user?.email,
  });

  const allSubjects = useMemo(() => querySubjects || [], [querySubjects]);

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }, '-created_date', 5000),
    enabled: !!user?.email,
  });

  const { data: editais = [] } = useQuery({
    queryKey: ['editais', user?.email],
    queryFn: () => base44.entities.Edital.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Filter subjects based on selected edital
  const subjects = useMemo(() => {
    // Compare as strings to prevent type mismatch issues
    return filterEditalId === "all" 
      ? allSubjects 
      : allSubjects.filter(s => String(s.edital_id) === String(filterEditalId));
  }, [allSubjects, filterEditalId]);

  const displayedTopicsCount = useMemo(() => {
    const subjectIds = new Set(subjects.map(s => s.id));
    return topics.filter(t => subjectIds.has(t.subject_id)).length;
  }, [subjects, topics]);

  const orphanTopics = useMemo(() => {
    if (loadingSubjects || loadingTopics) return [];
    const allSubjectIds = new Set(allSubjects.map(s => s.id));
    return topics.filter(t => !allSubjectIds.has(t.subject_id));
  }, [allSubjects, topics, loadingSubjects, loadingTopics]);

  const cleanOrphansMutation = useMutation({
    mutationFn: async (orphans) => {
      // Delete in batches to avoid overwhelming the server
      const batchSize = 20;
      for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        await Promise.all(batch.map(t => base44.entities.Topic.delete(t.id)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      alert("Tópicos órfãos limpos com sucesso!");
    },
  });

  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  const updateSubjectOrderMutation = useMutation({
    mutationFn: async (updatedSubjects) => {
      // Update order for all subjects that changed position
      // We update all of them to ensure consistency
      for (let i = 0; i < updatedSubjects.length; i++) {
        await base44.entities.Subject.update(updatedSubjects[i].id, { order: i });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localSubjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalSubjects(items);
    updateSubjectOrderMutation.mutate(items);
  };



  // Subject mutations
  const createSubjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Subject.create({ ...data, progress: 0, created_by: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowSubjectDialog(false);
      setEditingSubject(null);
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowSubjectDialog(false);
      setEditingSubject(null);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id) => {
      const subjectTopics = topics.filter(t => t.subject_id === id);
      for (const topic of subjectTopics) {
        await base44.entities.Topic.delete(topic.id);
      }
      await base44.entities.Subject.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const deleteAllSubjectsMutation = useMutation({
    mutationFn: async (subjectsToDelete) => {
      for (const subject of subjectsToDelete) {
        const subjectTopics = topics.filter(t => t.subject_id === subject.id);
        for (const topic of subjectTopics) {
          await base44.entities.Topic.delete(topic.id);
        }
        await base44.entities.Subject.delete(subject.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  // Topic mutations
  const createTopicMutation = useMutation({
    mutationFn: (data) => base44.entities.Topic.create({ ...data, created_by: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowTopicDialog(false);
      setEditingTopic(null);
      setSelectedSubject(null);
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Topic.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowTopicDialog(false);
      setEditingTopic(null);
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id) => base44.entities.Topic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  });

  // Import from edital
  const importFromEditalMutation = useMutation({
    mutationFn: async ({ edital, subjects: subjectsToImport }) => {
      const subjectColors = [
        "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", 
        "#ef4444", "#06b6d4", "#f97316", "#ec4899"
      ];

      // Process subjects sequentially to avoid potential rate limits on subject creation
      for (let i = 0; i < subjectsToImport.length; i++) {
        const subj = subjectsToImport[i];
        const subject = await base44.entities.Subject.create({
          edital_id: edital.id,
          name: subj.name,
          weight: subj.weight || 1,
          priority: subj.priority?.toLowerCase() || "medium",
          color: subjectColors[i % subjectColors.length],
          progress: 0,
          created_by: user.email
        });

        // Use bulkCreate for topics to significantly reduce API calls and avoid rate limits
        if (subj.topics && subj.topics.length > 0) {
          const topicsData = subj.topics.map(topicName => ({
            subject_id: subject.id,
            name: typeof topicName === 'object' ? topicName.name : topicName,
            status: "pending",
            difficulty: "medium",
            created_by: user.email
          }));
          await base44.entities.Topic.bulkCreate(topicsData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowImportDialog(false);
    },
  });

  const generateContentMutation = useMutation({
  mutationFn: async ({ topic, type }) => {
    let functionName = 'agent_content_generator';
    if (type === 'summary') functionName = 'agent_notes';
    if (type === 'flashcards') functionName = 'agent_questions';

    const response = await base44.functions.invoke(functionName, {
      action: type,
      topic,
      subject: subjects.find(s => s.id === topic.subject_id)
    });
    const result = response.data;

    if (type === 'summary') {
      await base44.entities.Topic.update(topic.id, { summary: result.summary, notes: result.key_points?.join('\n• ') || '' });
    } else if (type === 'flashcards') {
      for (const fc of result.flashcards || []) {
        await base44.entities.Flashcard.create({ topic_id: topic.id, subject_id: topic.subject_id, front: fc.front, back: fc.back, difficulty: "medium", created_by: user.email });
      }
    }
    return result;
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      setShowGenerateDialog(false);
      setSelectedTopic(null);
    },
  });

  // Expand topics with AI - subdivide a topic into multiple subtopics
  const expandTopicsMutation = useMutation({
  mutationFn: async ({ subject, existingTopics }) => {
    const response = await base44.functions.invoke('agent_structure', {
      action: 'expand_topics',
      subject,
      existingTopics
    });
      const result = response.data;

      if (result.topics && result.topics.length > 0) {
        // Create new expanded topics using bulkCreate
        const topicsToCreate = result.topics.map(newTopic => ({
          subject_id: subject.id,
          name: newTopic.name,
          status: "pending",
          difficulty: newTopic.difficulty || "medium",
          created_by: user.email
        }));

        await base44.entities.Topic.bulkCreate(topicsToCreate);

        // Delete old topics
        for (const topic of existingTopics) {
          await base44.entities.Topic.delete(topic.id);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setExpandingSubjectId(null);
      setShowExpandDialog(false);
      setSubjectToExpand(null);
    },
    onError: (error) => {
      console.error("Error expanding topics:", error);
      setExpandingSubjectId(null);
      alert("Erro ao expandir tópicos.");
    }
  });

  const subdivideTopicMutation = useMutation({
  mutationFn: async ({ topic, subject }) => {
    const response = await base44.functions.invoke('agent_structure', {
      action: 'subdivide_topic',
      topic,
      subject
    });
      const result = response.data;
      
      if (result.subtopics && result.subtopics.length > 0) {
        // Create new subtopics using bulkCreate for performance
        const topicsToCreate = result.subtopics.map(subtopic => ({
          subject_id: subject.id,
          name: subtopic.name,
          status: "pending",
          difficulty: subtopic.difficulty || "medium",
          created_by: user.email
        }));
        
        await base44.entities.Topic.bulkCreate(topicsToCreate);
        
        // Delete original topic only after creating new ones
        await base44.entities.Topic.delete(topic.id);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setSubdividingTopicId(null);
    },
    onError: (error) => {
      console.error("Error subdividing topic:", error);
      setSubdividingTopicId(null);
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      const details = error.response?.data?.details || "";
      alert(`Erro ao subdividir tópico: ${msg} ${details ? `(${details})` : ''}`);
    }
  });

  const getTopicsForSubject = (subjectId) => topics.filter(t => t.subject_id === subjectId);

  const calculateProgress = (subjectId) => {
    const subjectTopics = getTopicsForSubject(subjectId);
    if (subjectTopics.length === 0) return 0;
    const mastered = subjectTopics.filter(t => t.status === 'mastered').length;
    return Math.round((mastered / subjectTopics.length) * 100);
  };

  const priorityColors = { high: "bg-red-500/10 text-red-400 border-red-500/20", medium: "bg-amber-500/10 text-amber-400 border-amber-500/20", low: "bg-green-500/10 text-green-400 border-green-500/20" };
  const priorityLabels = { high: "Alta", medium: "Média", low: "Baixa" };
  const statusIcons = { pending: Circle, studying: Clock, review: Target, mastered: CheckCircle2 };
  const statusColors = { pending: "text-slate-500", studying: "text-amber-500", review: "text-blue-500", mastered: "text-green-500" };

  const handleStatusChange = (topic) => {
    const statusOrder = ['pending', 'studying', 'review', 'mastered'];
    const currentIndex = statusOrder.indexOf(topic.status || 'pending');
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTopicMutation.mutate({ id: topic.id, data: { status: nextStatus } });
  };

  const handleSubjectSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await updateSubjectMutation.mutateAsync({ id: editingSubject.id, data });
      } else {
        await createSubjectMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopicSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingTopic) {
        await updateTopicMutation.mutateAsync({ id: editingTopic.id, data });
      } else {
        await createTopicMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (edital, selectedSubjects) => {
    setIsSubmitting(true);
    try {
      await importFromEditalMutation.mutateAsync({ edital, subjects: selectedSubjects });
    } catch (error) {
      console.error("Error importing subjects:", error);
      alert(`Erro ao importar matérias: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateContent = async (type) => {
    setIsGenerating(true);
    try {
      await generateContentMutation.mutateAsync({ topic: selectedTopic, type });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExpandTopics = async (subject) => {
    const subjectTopics = getTopicsForSubject(subject.id);
    setExpandingSubjectId(subject.id);
    try {
      await expandTopicsMutation.mutateAsync({ subject, existingTopics: subjectTopics });
    } finally {
      setExpandingSubjectId(null);
    }
  };

  const handleSubdivideTopic = async (topic, subject) => {
    if (window.confirm(`Deseja dividir o tópico "${topic.name}" em subtópicos menores com IA? O tópico original será substituído.`)) {
      setSubdividingTopicId(topic.id);
      subdivideTopicMutation.mutate({ topic, subject });
    }
  };

  const openExpandDialog = (subject) => {
    setSubjectToExpand(subject);
    setShowExpandDialog(true);
  };

  const editaisWithSubjects = editais.filter(e => e.extracted_data?.subjects?.length > 0);
  const existingSubjectNames = subjects.map(s => s.name.toLowerCase());

  if (loadingSubjects || loadingTopics) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Matérias</h1>
          <div className="flex items-center gap-3">
            <p className="text-slate-400">{subjects.length} matérias • {displayedTopicsCount} tópicos</p>
            {orphanTopics.length > 0 && (
              <Button 
                variant="link" 
                className="text-red-400 h-auto p-0 text-xs hover:text-red-300"
                onClick={() => {
                  if (confirm(`Encontrados ${orphanTopics.length} tópicos sem matéria associada (órfãos). Deseja excluí-los?`)) {
                    cleanOrphansMutation.mutate(orphanTopics);
                  }
                }}
                disabled={cleanOrphansMutation.isPending}
              >
                {cleanOrphansMutation.isPending ? "Excluindo..." : `(Excluir ${orphanTopics.length} tópicos sem matéria)`}
                </Button>
                )}
          </div>
        </div>
        <div className="flex gap-2">
          {editaisWithSubjects.length > 0 && (
            <Button variant="outline" onClick={() => setShowImportDialog(true)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Download className="w-4 h-4 mr-2" />
              Importar do Edital
            </Button>
          )}
          <Button onClick={() => { setEditingSubject(null); setShowSubjectDialog(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Nova Matéria
          </Button>
        </div>
      </motion.div>

      {/* Filter Bar */}
      {editais.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-amber-500" />
            <Select value={filterEditalId} onValueChange={setFilterEditalId}>
              <SelectTrigger className="w-full sm:w-[300px] bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="Filtrar por edital" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700 cursor-pointer">
                  Todos os editais
                </SelectItem>
                {editais.map((edital) => (
                  <SelectItem key={edital.id} value={edital.id} className="text-white hover:bg-slate-700 cursor-pointer">
                    {edital.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterEditalId !== "all" && (
              <span className="text-sm text-slate-400">
                {subjects.length} matéria{subjects.length !== 1 ? 's' : ''} encontrada{subjects.length !== 1 ? 's' : ''}
              </span>
            )}
            
            {subjects.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir TODAS as ${subjects.length} matérias listadas? Esta ação não pode ser desfeita e excluirá também todos os tópicos associados.`)) {
                    deleteAllSubjectsMutation.mutate(subjects);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Todas
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhuma matéria cadastrada</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">Crie uma matéria manualmente ou importe de um edital processado.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setShowSubjectDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Criar Matéria
            </Button>
            {editaisWithSubjects.length > 0 && (
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" />
                Importar do Edital
              </Button>
            )}
          </div>
        </motion.div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="subjects-list">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {localSubjects.map((subject, index) => {
                  const subjectTopics = getTopicsForSubject(subject.id);
                  const progress = calculateProgress(subject.id);
                  const isExpanded = expandedSubject === subject.id;

                  return (
                    <Draggable key={subject.id} draggableId={subject.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="outline-none"
                        >
                          <Collapsible open={isExpanded} onOpenChange={() => setExpandedSubject(isExpanded ? null : subject.id)}>
                            <div className="glass-card rounded-2xl p-5 hover:border-slate-700/50 transition-all relative group pl-10">
                              <div
                                {...provided.dragHandleProps}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-6 h-6" />
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 left-10 w-6 h-6 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/50 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm("Tem certeza que deseja excluir esta matéria?")) {
                                    deleteSubjectMutation.mutate(subject.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>

                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-4 cursor-pointer">
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${subject.color}20` }}>
                                    <BookOpen className="w-6 h-6" style={{ color: subject.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h3 className="font-semibold text-white truncate">{subject.name}</h3>
                                      <span className={`px-2 py-0.5 rounded-full text-xs border ${priorityColors[subject.priority || 'medium']}`}>
                                        {priorityLabels[subject.priority || 'medium']}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                      <span>{subjectTopics.length} tópicos</span>
                                      <span>•</span>
                                      <span>{subjectTopics.filter(t => t.status === 'mastered').length} dominados</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 hidden sm:block">
                                      <div className="text-xs text-slate-400 mb-1 text-right">{progress}%</div>
                                      <Progress value={progress} className="h-2 bg-slate-800" />
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                        <DropdownMenuItem onClick={() => { setSelectedSubject(subject); setEditingTopic(null); setShowTopicDialog(true); }} className="text-white hover:bg-slate-700">
                                          <Plus className="w-4 h-4 mr-2" /> Adicionar Tópico
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openExpandDialog(subject)} className="text-purple-400 hover:bg-purple-500/20" disabled={expandingSubjectId === subject.id}>
                                          <Wand2 className="w-4 h-4 mr-2" /> Expandir Tópicos com IA
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setEditingSubject(subject); setShowSubjectDialog(true); }} className="text-white hover:bg-slate-700">
                                          <Pencil className="w-4 h-4 mr-2" /> Editar Matéria
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-700" />
                                        <DropdownMenuItem onClick={() => deleteSubjectMutation.mutate(subject.id)} className="text-red-400 hover:bg-red-500/20">
                                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                                  {subjectTopics.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">Nenhum tópico cadastrado</p>
                                  ) : (
                                    subjectTopics.map((topic) => {
                                      const StatusIcon = statusIcons[topic.status || 'pending'];
                                      return (
                                        <motion.div key={topic.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-3 flex items-center gap-3 bg-slate-800/30 hover:bg-slate-800/50 transition-all group">
                                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(topic); }} className={`${statusColors[topic.status || 'pending']} hover:scale-110 transition-transform`}>
                                            <StatusIcon className="w-5 h-5" />
                                          </button>
                                          <Link to={createPageUrl(`EstudarTopico?id=${topic.id}`)} className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm ${topic.status === 'mastered' ? 'text-slate-500 line-through' : 'text-white'}`}>{topic.name}</p>
                                            {topic.summary && <p className="text-xs text-slate-500 mt-0.5">Resumo disponível</p>}
                                          </Link>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={createPageUrl(`EstudarTopico?id=${topic.id}`)}>
                                              <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                                <ExternalLink className="w-4 h-4" />
                                              </Button>
                                            </Link>
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTopic(topic); setShowGenerateDialog(true); }} className="h-8 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                                              <Sparkles className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingTopic(topic); setSelectedSubject(subject); setShowTopicDialog(true); }} className="h-8 px-2 text-slate-400 hover:text-white">
                                              <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleSubdivideTopic(topic, subject)} disabled={subdividingTopicId === topic.id} className="h-8 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" title="Subdividir com IA">
                                              {subdividingTopicId === topic.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Split className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteTopicMutation.mutate(topic.id)} className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  )}
                                  <Button variant="ghost" onClick={() => { setSelectedSubject(subject); setEditingTopic(null); setShowTopicDialog(true); }} className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50 mt-2">
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar Tópico
                                  </Button>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Dialogs */}
      <SubjectFormDialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog} subject={editingSubject} editais={editais} onSubmit={handleSubjectSubmit} isLoading={isSubmitting} />
      <TopicFormDialog open={showTopicDialog} onOpenChange={setShowTopicDialog} topic={editingTopic} subjectId={selectedSubject?.id} onSubmit={handleTopicSubmit} isLoading={isSubmitting} />
      <ImportFromEditalDialog open={showImportDialog} onOpenChange={setShowImportDialog} editais={editaisWithSubjects} existingSubjectNames={existingSubjectNames} onImport={handleImport} isLoading={isSubmitting} />

      {/* Generate Content Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Gerar Conteúdo com IA</DialogTitle>
            <DialogDescription className="text-slate-400">
              Escolha o tipo de conteúdo que deseja gerar automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-slate-400 mb-6">Escolha o que deseja gerar para o tópico <span className="text-amber-500 font-medium">{selectedTopic?.name}</span>:</p>
            <div className="space-y-3">
              <Button onClick={() => handleGenerateContent('summary')} disabled={isGenerating} className="w-full justify-start h-auto p-4 bg-slate-800 hover:bg-slate-700 text-left">
                <FileText className="w-5 h-5 text-blue-400 mr-3" />
                <div><p className="font-medium text-white">Resumo Completo</p><p className="text-xs text-slate-400">Conceitos, pontos-chave e dicas</p></div>
                {isGenerating && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
              </Button>
              <Button onClick={() => handleGenerateContent('flashcards')} disabled={isGenerating} className="w-full justify-start h-auto p-4 bg-slate-800 hover:bg-slate-700 text-left">
                <Target className="w-5 h-5 text-amber-400 mr-3" />
                <div><p className="font-medium text-white">Flashcards</p><p className="text-xs text-slate-400">5 cartões para memorização</p></div>
                {isGenerating && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expand Topics Dialog */}
      <Dialog open={showExpandDialog} onOpenChange={setShowExpandDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              Expandir Tópicos com IA
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              A IA irá detalhar e subdividir os tópicos desta matéria.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-slate-400 mb-4">
              A IA vai analisar os tópicos da matéria <span className="text-amber-500 font-medium">{subjectToExpand?.name}</span> e subdividi-los em tópicos mais específicos e detalhados.
            </p>
            
            {subjectToExpand && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-2">Tópicos atuais:</p>
                <div className="space-y-1">
                  {getTopicsForSubject(subjectToExpand.id).map((topic) => (
                    <div key={topic.id} className="flex items-start gap-2 text-sm text-slate-300">
                      <ListTree className="w-3 h-3 text-slate-500 mt-1 shrink-0" />
                      <span className="break-words">{topic.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-400">
                ⚠️ Atenção: Os tópicos atuais serão substituídos pelos novos tópicos gerados pela IA.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowExpandDialog(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                disabled={expandingSubjectId !== null}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => subjectToExpand && handleExpandTopics(subjectToExpand)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={expandingSubjectId !== null}
              >
                {expandingSubjectId !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Expandindo...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Expandir Tópicos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
