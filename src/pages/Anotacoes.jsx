import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote,
  Plus,
  Pin,
  Search,
  Sparkles,
  Trash2,
  Loader2,
  Brain,
  LayoutGrid,
  Lightbulb,
  Eye,
  FileText,
  Network,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

import NoteTypeSelector from "@/components/notes/NoteTypeSelector";
import CornellNoteEditor from "@/components/notes/CornellNoteEditor";
import FeynmanNoteEditor from "@/components/notes/FeynmanNoteEditor";
import ActiveRecallReview from "@/components/notes/ActiveRecallReview";
import InteractiveMindMap from "@/components/notes/InteractiveMindMap";

const NOTE_COLORS = [
  { value: "#fef3c7", label: "Amarelo" },
  { value: "#dbeafe", label: "Azul" },
  { value: "#dcfce7", label: "Verde" },
  { value: "#fce7f3", label: "Rosa" },
  { value: "#f3e8ff", label: "Roxo" },
  { value: "#fed7aa", label: "Laranja" },
];

const typeConfig = {
  quick: { icon: StickyNote, label: "Rápida", color: "bg-amber-500/10 text-amber-400" },
  cornell: { icon: LayoutGrid, label: "Cornell", color: "bg-blue-500/10 text-blue-400" },
  feynman: { icon: Lightbulb, label: "Feynman", color: "bg-purple-500/10 text-purple-400" },
  summary: { icon: FileText, label: "Resumo", color: "bg-green-500/10 text-green-400" },
  mindmap: { icon: Network, label: "Mapa Mental", color: "bg-pink-500/10 text-pink-400" }
};

export default function Anotacoes() {
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showMindMapDialog, setShowMindMapDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEditalId, setFilterEditalId] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [dialogTab, setDialogTab] = useState("edit");
  const [mindMapData, setMindMapData] = useState(null);
  const [isGeneratingMindMapAI, setIsGeneratingMindMapAI] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "#fef3c7",
    type: "quick",
    topic_id: "",
    subject_id: "",
    cornell_cues: [],
    cornell_summary: "",
    feynman_explanation: "",
    feynman_gaps: []
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', user?.email],
    queryFn: () => base44.entities.Note.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }, 'name', 1000),
    enabled: !!user?.email,
  });

  const { data: editais = [] } = useQuery({
    queryKey: ['editais', user?.email],
    queryFn: () => base44.entities.Edital.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      closeDialog();
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Generate Cornell cues with AI
  const generateCuesMutation = useMutation({
    mutationFn: async (content) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise esta anotação e crie 5-7 perguntas/palavras-chave importantes para revisão ativa (estilo Cornell):
        
        "${content}"
        
        Cada cue deve ser uma pergunta que ajude a recordar conceitos importantes ou uma palavra-chave central.`,
        response_json_schema: {
          type: "object",
          properties: {
            cues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cue: { type: "string" },
                  answer: { type: "string" }
                }
              }
            }
          }
        }
      });
      return result.cues || [];
    },
  });

  // Generate Cornell summary with AI
  const generateSummaryMutation = useMutation({
    mutationFn: async (content) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Crie um resumo conciso (2-3 frases) desta anotação para revisão rápida:
        
        "${content}"
        
        O resumo deve capturar a essência do conteúdo em poucas palavras.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" }
          }
        }
      });
      return result.summary;
    },
  });

  // Analyze Feynman gaps with AI
  const analyzeFeynmanMutation = useMutation({
    mutationFn: async ({ content, explanation }) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Compare a anotação original com a explicação simplificada do aluno e identifique lacunas no conhecimento:
        
        ANOTAÇÃO ORIGINAL:
        "${content}"
        
        EXPLICAÇÃO DO ALUNO:
        "${explanation}"
        
        Identifique:
        1. Conceitos que foram mal explicados ou simplificados demais
        2. Informações importantes que foram omitidas
        3. Possíveis mal-entendidos
        
        Liste 3-5 lacunas específicas para o aluno revisar.`,
        response_json_schema: {
          type: "object",
          properties: {
            gaps: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      return result.gaps || [];
    },
  });

  // Generate note content with AI
  const generateNoteMutation = useMutation({
    mutationFn: async (topicName) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Crie uma anotação de estudo completa sobre "${topicName}" para concursos públicos.

Inclua:
- Conceitos principais e definições
- Pontos importantes que costumam cair em provas
- Exemplos práticos
- Dicas de memorização

Formate de forma clara e organizada.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" }
          }
        }
      });
      return result;
    },
  });

  const handleGenerateWithAI = async () => {
    const selectedTopic = topics.find(t => t.id === formData.topic_id);
    if (!selectedTopic) return;
    
    setIsProcessing(true);
    try {
      const result = await generateNoteMutation.mutateAsync(selectedTopic.name);
      setFormData(prev => ({
        ...prev,
        title: result.title || `Anotação: ${selectedTopic.name}`,
        content: result.content || ""
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate flashcards
  const generateFlashcardsMutation = useMutation({
    mutationFn: async (note) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Com base nesta anotação, crie 5 flashcards para memorização:
        
        "${note.content}"
        ${note.cornell_cues?.length ? `\nPerguntas-chave: ${note.cornell_cues.map(c => c.cue).join(', ')}` : ''}
        
        Cada flashcard deve ter uma pergunta objetiva e resposta concisa.`,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" }
                }
              }
            }
          }
        }
      });

      for (const fc of result.flashcards || []) {
        await base44.entities.Flashcard.create({
          front: fc.front,
          back: fc.back,
          difficulty: "medium"
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setSelectedNote(null);
    setFormData({
      title: "",
      content: "",
      color: "#fef3c7",
      type: "quick",
      topic_id: "",
      subject_id: "",
      cornell_cues: [],
      cornell_summary: "",
      feynman_explanation: "",
      feynman_gaps: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If mindmap type, generate structure with AI based on content
    if (formData.type === "mindmap" && !selectedNote) {
      if (!formData.title) return;
      
      setIsGeneratingMindMapAI(true);
      try {
        // Generate mind map structure based on content
        const hasContent = formData.content && formData.content.trim().length > 20;
        
        if (hasContent) {
          // Use AI to generate structure from content
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um especialista em criar mapas mentais educacionais. Analise o conteúdo abaixo e crie uma estrutura de mapa mental COMPLETA e HIERÁRQUICA.

TÍTULO DO MAPA: ${formData.title}

CONTEÚDO PARA ANÁLISE:
${formData.content}

INSTRUÇÕES OBRIGATÓRIAS:
1. Crie entre 4 a 6 nós PRINCIPAIS (conceitos mais importantes)
2. CRÍTICO: CADA nó principal OBRIGATORIAMENTE deve ter entre 2 a 4 SUBTÓPICOS (children)
3. Os subtópicos devem detalhar e expandir o conceito do nó pai
4. Textos curtos: máximo 5 palavras por nó/subtópico
5. NÃO deixe nenhum nó sem subtópicos - todos devem ter children

EXEMPLO DO FORMATO ESPERADO:
- Nó: "Conceito A" -> children: ["Detalhe 1", "Detalhe 2", "Detalhe 3"]
- Nó: "Conceito B" -> children: ["Aspecto X", "Aspecto Y"]

Retorne a estrutura completa com TODOS os nós tendo seus respectivos subtópicos.`,
            response_json_schema: {
              type: "object",
              properties: {
                nodes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      children: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2
                      }
                    },
                    required: ["text", "children"]
                  }
                }
              },
              required: ["nodes"]
            }
          });

          const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899", "#84cc16"];
          const nodes = [{ id: "root", text: formData.title, x: 400, y: 300, color: "#f59e0b", isRoot: true }];
          const connections = [];

          const aiNodes = result.nodes || [];
          const angleStep = (2 * Math.PI) / Math.max(aiNodes.length, 1);
          const radius = 200;

          aiNodes.forEach((node, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const nodeId = `node-${i}`;
            const x = 400 + Math.cos(angle) * radius;
            const y = 300 + Math.sin(angle) * radius;

            nodes.push({
              id: nodeId,
              text: node.text,
              x,
              y,
              color: colors[i % colors.length],
              isRoot: false
            });
            connections.push({ id: `root-${nodeId}`, from: "root", to: nodeId });

            // Add children nodes (subtopics)
            const childrenArr = node.children || [];
            if (childrenArr.length > 0) {
              const childRadius = 120;
              const spreadAngle = Math.PI / 2.5;
              const startAngle = angle - spreadAngle / 2;
              const childAngleStep = childrenArr.length > 1 ? spreadAngle / (childrenArr.length - 1) : 0;

              childrenArr.forEach((childText, j) => {
                const childAngle = childrenArr.length === 1 ? angle : startAngle + childAngleStep * j;
                const childId = `node-${i}-${j}`;
                const childX = x + Math.cos(childAngle) * childRadius;
                const childY = y + Math.sin(childAngle) * childRadius;

                nodes.push({
                  id: childId,
                  text: childText,
                  x: childX,
                  y: childY,
                  color: colors[i % colors.length],
                  isRoot: false
                });
                connections.push({ id: `${nodeId}-${childId}`, from: nodeId, to: childId });
              });
            }
          });

          setMindMapData({ nodes, connections });
        } else {
          // No content, just create root node
          setMindMapData({
            nodes: [{ id: "root", text: formData.title, x: 400, y: 300, color: "#f59e0b", isRoot: true }],
            connections: []
          });
        }
        
        setShowDialog(false);
        setShowMindMapDialog(true);
      } catch (error) {
        console.error("Error generating mind map:", error);
        // Fallback to simple structure
        setMindMapData({
          nodes: [{ id: "root", text: formData.title, x: 400, y: 300, color: "#f59e0b", isRoot: true }],
          connections: []
        });
        setShowDialog(false);
        setShowMindMapDialog(true);
      } finally {
        setIsGeneratingMindMapAI(false);
      }
      return;
    }
    
    if (selectedNote) {
      updateNoteMutation.mutate({ id: selectedNote.id, data: formData });
      closeDialog();
    } else {
      createNoteMutation.mutate(formData);
    }
  };

  const handleSaveMindMap = (data) => {
    // Save mind map as note with JSON data
    createNoteMutation.mutate({
      ...formData,
      content: JSON.stringify(data),
      ai_summary: "interactive-mindmap"
    });
    setShowMindMapDialog(false);
    setMindMapData(null);
  };

  const handleOpenMindMap = (note) => {
    try {
      const data = JSON.parse(note.content);
      setMindMapData(data);
      setSelectedNote(note);
      setFormData({
        title: note.title || "",
        content: note.content || "",
        color: note.color || "#fef3c7",
        type: note.type || "mindmap",
        topic_id: note.topic_id || "",
        subject_id: note.subject_id || "",
        cornell_cues: note.cornell_cues || [],
        cornell_summary: note.cornell_summary || "",
        feynman_explanation: note.feynman_explanation || "",
        feynman_gaps: note.feynman_gaps || []
      });
      setShowMindMapDialog(true);
    } catch (e) {
      // If not valid JSON, show regular view
      handleViewNote(note);
    }
  };

  const handleUpdateMindMap = (data) => {
    if (selectedNote) {
      updateNoteMutation.mutate({
        id: selectedNote.id,
        data: { content: JSON.stringify(data) }
      });
    }
    setShowMindMapDialog(false);
    setMindMapData(null);
    setSelectedNote(null);
  };

  const handleTogglePin = (note) => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { is_pinned: !note.is_pinned }
    });
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    const topic = topics.find(t => t.id === note.topic_id);
    setFormData({
      title: note.title || "",
      content: note.content || "",
      color: note.color || "#fef3c7",
      type: note.type || "quick",
      topic_id: note.topic_id || "",
      subject_id: topic?.subject_id || note.subject_id || "",
      cornell_cues: note.cornell_cues || [],
      cornell_summary: note.cornell_summary || "",
      feynman_explanation: note.feynman_explanation || "",
      feynman_gaps: note.feynman_gaps || []
    });
    setShowDialog(true);
  };

  const handleViewNote = (note) => {
    setSelectedNote(note);
    setShowViewDialog(true);
  };

  const handleStartReview = (note) => {
    setSelectedNote(note);
    setShowReviewDialog(true);
  };

  const handleGenerateCues = async () => {
    if (!formData.content) return;
    setIsProcessing(true);
    try {
      const cues = await generateCuesMutation.mutateAsync(formData.content);
      setFormData(prev => ({ ...prev, cornell_cues: cues }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!formData.content) return;
    setIsProcessing(true);
    try {
      const summary = await generateSummaryMutation.mutateAsync(formData.content);
      setFormData(prev => ({ ...prev, cornell_summary: summary }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeFeynman = async () => {
    if (!formData.content && !formData.feynman_explanation) return;
    setIsProcessing(true);
    try {
      const gaps = await analyzeFeynmanMutation.mutateAsync({
        content: formData.content,
        explanation: formData.feynman_explanation
      });
      setFormData(prev => ({ ...prev, feynman_gaps: gaps }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewComplete = async (score) => {
    if (selectedNote) {
      await updateNoteMutation.mutateAsync({
        id: selectedNote.id,
        data: {
          active_recall_score: score,
          last_reviewed: new Date().toISOString(),
          review_count: (selectedNote.review_count || 0) + 1
        }
      });
    }
    setShowReviewDialog(false);
    setSelectedNote(null);
  };

  const handleGenerateFlashcards = async (note) => {
    setIsProcessing(true);
    try {
      await generateFlashcardsMutation.mutateAsync(note);
    } finally {
      setIsProcessing(false);
      setShowViewDialog(false);
    }
  };

  const handleCornellDataChange = (data) => {
    setFormData(prev => ({ 
      ...prev, 
      content: data.content,
      cornell_cues: data.cornell_cues,
      cornell_summary: data.cornell_summary
    }));
  };

  const handleFeynmanDataChange = (data) => {
    setFormData(prev => ({ 
      ...prev, 
      content: data.content,
      feynman_explanation: data.feynman_explanation,
      feynman_gaps: data.feynman_gaps
    }));
  };

  const filteredNotes = notes.filter(note => {
    // Filter by Edital
    if (filterEditalId !== "all") {
      const noteSubject = subjects.find(s => s.id === note.subject_id);
      // Compare as strings to ensure matching across types
      if (!noteSubject || String(noteSubject.edital_id) !== String(filterEditalId)) {
        return false;
      }
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query) ||
      note.tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const otherNotes = filteredNotes.filter(n => !n.is_pinned);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Anotações</h1>
          <p className="text-slate-400">
            Cornell, Feynman, Active Recall e mais técnicas de estudo
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Anotação
        </Button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar anotações..."
            className="pl-12 bg-slate-900/50 border-slate-800 text-white h-12"
          />
        </div>
        
        {editais.length > 0 && (
          <div className="w-full md:w-64">
            <Select value={filterEditalId} onValueChange={setFilterEditalId}>
              <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <SelectValue placeholder="Filtrar por edital" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Todas as anotações</SelectItem>
                {editais.map((edital) => (
                  <SelectItem key={edital.id} value={edital.id}>
                    {edital.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <StickyNote className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? "Nenhuma anotação encontrada" : "Nenhuma anotação ainda"}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery 
              ? "Tente outra busca ou crie uma nova anotação"
              : "Escolha uma técnica de estudo e comece a anotar"
            }
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Criar Anotação
            </Button>
          )}
        </motion.div>
      ) : (
        <>
          {pinnedNotes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                <Pin className="w-4 h-4" />
                Fixadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    index={index}
                    onTogglePin={handleTogglePin}
                    onDelete={(id) => deleteNoteMutation.mutate(id)}
                    onEdit={handleEditNote}
                    onView={handleViewNote}
                    onReview={handleStartReview}
                    onOpenMindMap={handleOpenMindMap}
                  />
                ))}
              </div>
            </div>
          )}

          {otherNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h2 className="text-sm font-medium text-slate-400 mb-4">
                  Outras Anotações
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNotes.map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    index={index}
                    onTogglePin={handleTogglePin}
                    onDelete={(id) => deleteNoteMutation.mutate(id)}
                    onEdit={handleEditNote}
                    onView={handleViewNote}
                    onReview={handleStartReview}
                    onOpenMindMap={handleOpenMindMap}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Note Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedNote ? "Editar Anotação" : "Nova Anotação"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Note Type Selector */}
            <div className="space-y-3">
              <Label className="text-slate-300">Técnica de Estudo</Label>
              <NoteTypeSelector
                selectedType={formData.type}
                onSelect={(type) => setFormData(prev => ({ ...prev, type }))}
              />
            </div>

            {/* Subject and Topic Selector */}
            {subjects.length > 0 && (
              <div className="space-y-3">
                <Label className="text-slate-300">Vincular a um Tópico (opcional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Subject Select */}
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value, topic_id: "" }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Selecione a matéria" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      
                      {/* Group by Edital */}
                      {editais.map(edital => {
                        const editalSubjects = subjects.filter(s => s.edital_id === edital.id);
                        if (editalSubjects.length === 0) return null;
                        
                        return (
                          <SelectGroup key={edital.id}>
                            <SelectLabel className="text-slate-400 text-xs px-2 py-1.5 bg-slate-900/50 sticky top-0">
                              {edital.title}
                            </SelectLabel>
                            {editalSubjects.map(subject => (
                              <SelectItem key={subject.id} value={subject.id}>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color || '#f59e0b' }} />
                                  {subject.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                      
                      {/* Subjects without Edital */}
                      {subjects.filter(s => !s.edital_id || !editais.find(e => e.id === s.edital_id)).length > 0 && (
                        <SelectGroup>
                           <SelectLabel className="text-slate-400 text-xs px-2 py-1.5 bg-slate-900/50 sticky top-0">
                              Outras Matérias
                           </SelectLabel>
                           {subjects.filter(s => !s.edital_id || !editais.find(e => e.id === s.edital_id)).map(subject => (
                              <SelectItem key={subject.id} value={subject.id}>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color || '#f59e0b' }} />
                                  {subject.name}
                                </div>
                              </SelectItem>
                           ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Topic Select */}
                  <Select
                    value={formData.topic_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, topic_id: value }))}
                    disabled={!formData.subject_id}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white disabled:opacity-50">
                      <SelectValue placeholder={formData.subject_id ? "Selecione o tópico" : "Escolha uma matéria primeiro"} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {topics
                        .filter(t => t.subject_id === formData.subject_id)
                        .map(topic => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate with AI Button */}
                {formData.topic_id && (
                  <Button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Gerar Anotação com IA
                  </Button>
                )}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-slate-300">Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da anotação"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            {/* Dynamic Content Based on Type */}
            {formData.type === "cornell" ? (
              <CornellNoteEditor
                note={formData}
                onChange={handleCornellDataChange}
                onGenerateCues={handleGenerateCues}
                onGenerateSummary={handleGenerateSummary}
                isGenerating={isProcessing}
              />
            ) : formData.type === "feynman" ? (
              <FeynmanNoteEditor
                note={formData}
                onChange={handleFeynmanDataChange}
                onAnalyze={handleAnalyzeFeynman}
                isGenerating={isProcessing}
              />
            ) : (
              <div className="space-y-2">
                <Label className="text-slate-300">Conteúdo</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva sua anotação..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
                  required
                />
              </div>
            )}

            {/* Color (for quick notes) */}
            {formData.type === "quick" && (
              <div className="space-y-2">
                <Label className="text-slate-300">Cor</Label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color.value ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending || isProcessing || isGeneratingMindMapAI}
              >
                {(createNoteMutation.isPending || updateNoteMutation.isPending || isProcessing || isGeneratingMindMapAI) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {(formData.type === "mindmap" && isGeneratingMindMapAI) ? "Gerando Mapa Mental..." : "Salvando..."}
                  </>
                ) : selectedNote ? (
                  "Salvar"
                ) : formData.type === "mindmap" ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Mapa Mental
                  </>
                ) : (
                  "Criar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog open={showViewDialog} onOpenChange={() => setShowViewDialog(false)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {typeConfig[selectedNote.type] && (
                    <Badge className={typeConfig[selectedNote.type].color}>
                      {React.createElement(typeConfig[selectedNote.type].icon, { className: "w-3 h-3 mr-1" })}
                      {typeConfig[selectedNote.type].label}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold">{selectedNote.title}</DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Main content */}
                <div className="p-4 rounded-xl bg-slate-800/50">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedNote.content}</p>
                </div>

                {/* Cornell-specific */}
                {selectedNote.type === "cornell" && (
                  <>
                    {selectedNote.cornell_cues?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Perguntas-Chave</h4>
                        <div className="space-y-2">
                          {selectedNote.cornell_cues.map((cue, i) => (
                            <div key={i} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-blue-300 font-medium">{cue.cue}</p>
                              {cue.answer && <p className="text-sm text-slate-400 mt-1">{cue.answer}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedNote.cornell_summary && (
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <h4 className="text-sm font-medium text-green-400 mb-2">Resumo</h4>
                        <p className="text-slate-300">{selectedNote.cornell_summary}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Feynman-specific */}
                {selectedNote.type === "feynman" && (
                  <>
                    {selectedNote.feynman_explanation && (
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <h4 className="text-sm font-medium text-purple-400 mb-2">Explicação Simplificada</h4>
                        <p className="text-slate-300">{selectedNote.feynman_explanation}</p>
                      </div>
                    )}
                    {selectedNote.feynman_gaps?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Lacunas Identificadas</h4>
                        <div className="space-y-2">
                          {selectedNote.feynman_gaps.map((gap, i) => (
                            <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-amber-200 text-sm">{gap}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {selectedNote.type === "cornell" && selectedNote.cornell_cues?.length > 0 && (
                    <Button
                      onClick={() => {
                        setShowViewDialog(false);
                        handleStartReview(selectedNote);
                      }}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Revisão Ativa
                    </Button>
                  )}
                  <Button
                    onClick={() => handleGenerateFlashcards(selectedNote)}
                    disabled={isProcessing}
                    className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    Criar Flashcards
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Recall Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={() => setShowReviewDialog(false)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              Revisão Ativa
            </DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <ActiveRecallReview
              note={selectedNote}
              onComplete={handleReviewComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Interactive Mind Map Dialog */}
      <Dialog open={showMindMapDialog} onOpenChange={() => {
        setShowMindMapDialog(false);
        setMindMapData(null);
        setSelectedNote(null);
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95vw] max-w-[1400px] h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 pb-2 shrink-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Network className="w-5 h-5 text-pink-400" />
                {selectedNote ? "Editar Mapa Mental" : "Criar Mapa Mental"}: {formData.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 p-4 pt-0 min-h-0">
              {mindMapData && (
                <InteractiveMindMap
                  initialNodes={mindMapData.nodes}
                  initialConnections={mindMapData.connections}
                  title={formData.title}
                  onSave={selectedNote ? handleUpdateMindMap : handleSaveMindMap}
                />
              )}
            </div>
            <div className="p-4 pt-2 flex justify-end gap-3 shrink-0 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMindMapDialog(false);
                  setMindMapData(null);
                  setSelectedNote(null);
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  // Trigger save from InteractiveMindMap component
                  const saveBtn = document.querySelector('[data-mindmap-save]');
                  if (saveBtn) saveBtn.click();
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Salvar Mapa Mental
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ note, index, onTogglePin, onDelete, onEdit, onView, onReview, onOpenMindMap }) {
  const config = typeConfig[note.type] || typeConfig.quick;
  const TypeIcon = config.icon;
  const hasCornellReview = note.type === "cornell" && note.cornell_cues?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl p-5 group relative cursor-pointer"
      style={{ backgroundColor: note.type === "quick" ? (note.color || "#fef3c7") : undefined }}
      onClick={() => note.type === "mindmap" && note.ai_summary === "interactive-mindmap" ? onOpenMindMap(note) : onView(note)}
    >
      {note.type !== "quick" && (
        <div className="absolute inset-0 rounded-2xl glass-card" />
      )}
      
      <div className="relative">
        {/* Actions */}
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {hasCornellReview && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onReview(note); }}
              className="h-8 w-8 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
            className={`h-8 w-8 ${note.type === "quick" ? 'bg-white/50 hover:bg-white/80 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'}`}
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onTogglePin(note); }}
            className={`h-8 w-8 ${note.is_pinned ? 'bg-amber-500 text-white' : note.type === "quick" ? 'bg-white/50 hover:bg-white/80 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'}`}
          >
            <Pin className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className={`h-8 w-8 ${note.type === "quick" ? 'bg-white/50 hover:bg-red-100 text-red-600' : 'bg-slate-700/50 hover:bg-red-500/20 text-red-400'}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Type Badge */}
        <Badge className={`${config.color} mb-3`}>
          <TypeIcon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>

        <h3 className={`font-semibold mb-2 pr-20 ${note.type === "quick" ? 'text-slate-800' : 'text-white'}`}>
          {note.title}
        </h3>
        <p className={`text-sm line-clamp-3 ${note.type === "quick" ? 'text-slate-600' : 'text-slate-400'}`}>
          {note.content}
        </p>

        {/* Review stats */}
        {note.review_count > 0 && (
          <div className={`flex items-center gap-2 mt-3 text-xs ${note.type === "quick" ? 'text-slate-500' : 'text-slate-500'}`}>
            <Eye className="w-3 h-3" />
            <span>{note.review_count} revisões</span>
            {note.active_recall_score && (
              <>
                <span>•</span>
                <span className={note.active_recall_score >= 80 ? 'text-green-500' : note.active_recall_score >= 50 ? 'text-amber-500' : 'text-red-500'}>
                  {note.active_recall_score}% acerto
                </span>
              </>
            )}
          </div>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-xs ${note.type === "quick" ? 'bg-black/10 text-slate-700' : 'bg-slate-700 text-slate-300'}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
