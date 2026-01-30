import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Sparkles,
  History,
  BookOpen,
  Loader2,
  ArrowLeft,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import EssayProposalCard from "@/components/redacoes/EssayProposalCard";
import EssayEditor from "@/components/redacoes/EssayEditor";
import EssayCorrectionResult from "@/components/redacoes/EssayCorrectionResult";
import EssayHistoryCard from "@/components/redacoes/EssayHistoryCard";
import GenerateProposalDialog from "@/components/redacoes/GenerateProposalDialog";

const ENEM_COMPETENCIES = [
  { name: "Competência 1 - Domínio da Norma Culta", max_score: 200 },
  { name: "Competência 2 - Compreensão da Proposta", max_score: 200 },
  { name: "Competência 3 - Argumentação", max_score: 200 },
  { name: "Competência 4 - Coesão Textual", max_score: 200 },
  { name: "Competência 5 - Proposta de Intervenção", max_score: 200 }
];

export default function Redacoes() {
  const [activeTab, setActiveTab] = useState("proposals");
  const [view, setView] = useState("list"); // list, write, result
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedEssay, setSelectedEssay] = useState(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['essayProposals', user?.email],
    queryFn: () => base44.entities.EssayProposal.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: essays = [], isLoading: loadingEssays } = useQuery({
    queryKey: ['essays', user?.email],
    queryFn: () => base44.entities.Essay.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Generate proposal with AI
  const generateProposalMutation = useMutation({
    mutationFn: async (params) => {
      const themePrompt = params.theme 
        ? `sobre o tema "${params.theme}"` 
        : "sobre um tema atual e relevante para a sociedade brasileira";

      const boardInstructions = {
        enem: "no formato ENEM, com texto dissertativo-argumentativo de até 30 linhas, exigindo proposta de intervenção que respeite os direitos humanos",
        fcc: "no formato FCC, dissertativo-argumentativo, com no mínimo 20 e máximo 30 linhas",
        cespe: "no formato CESPE/Cebraspe, dissertativo, com extensão de 20 a 30 linhas",
        fgv: "no formato FGV, dissertativo-argumentativo, com vocabulário formal",
        vunesp: "no formato VUNESP, dissertativo-argumentativo, com 25 a 30 linhas"
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Crie uma proposta de redação ${themePrompt} ${boardInstructions[params.exam_board]}.
        
        A proposta deve ter:
        1. Um título impactante
        2. Um tema central bem definido
        3. Uma descrição contextualizada do tema
        4. 2-3 textos motivadores com fontes (notícias, dados estatísticos, citações)
        5. Instruções claras para o candidato
        
        Dificuldade: ${params.difficulty === 'easy' ? 'Tema mais comum e debatido' : params.difficulty === 'hard' ? 'Tema complexo e menos óbvio' : 'Tema de dificuldade moderada'}
        ${params.category ? `Categoria: ${params.category}` : ''}
        
        Seja criativo e atual.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            theme: { type: "string" },
            description: { type: "string" },
            motivating_texts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  source: { type: "string" }
                }
              }
            },
            instructions: { type: "string" }
          }
        }
      });

      const proposal = await base44.entities.EssayProposal.create({
        ...result,
        exam_board: params.exam_board,
        difficulty: params.difficulty,
        category: params.category,
        is_custom: true
      });

      return proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essayProposals'] });
      setShowGenerateDialog(false);
    },
  });

  // Save essay draft
  const saveEssayMutation = useMutation({
    mutationFn: async ({ essayId, data }) => {
      if (essayId) {
        return base44.entities.Essay.update(essayId, data);
      }
      return base44.entities.Essay.create({
        ...data,
        theme: selectedProposal?.theme || "Tema livre",
        exam_board: selectedProposal?.exam_board || "other",
        status: "draft"
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      if (!selectedEssay) {
        setSelectedEssay(result);
      }
    },
  });

  // Delete essay
  const deleteEssayMutation = useMutation({
    mutationFn: (id) => base44.entities.Essay.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['essays'] }),
  });

  // Submit and correct essay
  const submitEssayMutation = useMutation({
    mutationFn: async ({ essayId, data }) => {
      let essay;
      if (essayId) {
        essay = await base44.entities.Essay.update(essayId, { ...data, status: "submitted" });
      } else {
        essay = await base44.entities.Essay.create({
          ...data,
          theme: selectedProposal?.theme || "Tema livre",
          exam_board: selectedProposal?.exam_board || "enem",
          status: "submitted"
        });
      }

      const examBoard = essay.exam_board || selectedProposal?.exam_board || "enem";
      const isEnem = examBoard === "enem";

      const correctionPrompt = isEnem 
        ? `Corrija esta redação do ENEM avaliando as 5 competências oficiais:
           - Competência 1: Domínio da modalidade escrita formal da língua portuguesa (0-200)
           - Competência 2: Compreender a proposta de redação e aplicar conceitos (0-200)
           - Competência 3: Selecionar, relacionar, organizar e interpretar informações (0-200)
           - Competência 4: Demonstrar conhecimento dos mecanismos linguísticos de coesão (0-200)
           - Competência 5: Elaborar proposta de intervenção respeitando direitos humanos (0-200)
           
           Tema: ${essay.theme}
           
           Texto do aluno:
           "${essay.content}"
           
           Seja criterioso mas construtivo. Dê notas realistas e feedback detalhado.`
        : `Corrija esta redação para a banca ${examBoard.toUpperCase()} avaliando:
           - Adequação ao tema e à proposta (0-25)
           - Estrutura textual e argumentação (0-25)
           - Coerência e coesão (0-25)
           - Domínio da norma culta (0-25)
           
           Tema: ${essay.theme}
           
           Texto do aluno:
           "${essay.content}"
           
           Seja criterioso mas construtivo.`;

      const correction = await base44.integrations.Core.InvokeLLM({
        prompt: correctionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            competencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  score: { type: "number" },
                  max_score: { type: "number" },
                  feedback: { type: "string" }
                }
              }
            },
            total_score: { type: "number" },
            general_feedback: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            rewrite_suggestions: { type: "string" }
          }
        }
      });

      const updatedEssay = await base44.entities.Essay.update(essay.id, {
        ...correction,
        status: "corrected"
      });

      return updatedEssay;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      setSelectedEssay(result);
      setView("result");
    },
  });

  const handleGenerateProposal = async (params) => {
    setIsGenerating(true);
    try {
      await generateProposalMutation.mutateAsync(params);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectProposal = (proposal) => {
    setSelectedProposal(proposal);
    setSelectedEssay(null);
    setView("write");
  };

  const handleSaveEssay = async (data) => {
    setIsSaving(true);
    try {
      await saveEssayMutation.mutateAsync({
        essayId: selectedEssay?.id,
        data: {
          title: data.title,
          content: data.content,
          word_count: data.wordCount
        }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitEssay = async (data) => {
    setIsSubmitting(true);
    try {
      await submitEssayMutation.mutateAsync({
        essayId: selectedEssay?.id,
        data: {
          title: data.title,
          content: data.content,
          word_count: data.wordCount
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEssay = (essay) => {
    setSelectedEssay(essay);
    if (essay.status === "corrected") {
      setView("result");
    } else {
      setSelectedProposal(null);
      setView("write");
    }
  };

  const handleEditEssay = (essay) => {
    setSelectedEssay(essay);
    setSelectedProposal(null);
    setView("write");
  };

  const handleRewrite = () => {
    // Create new essay based on the corrected one
    const newEssay = {
      ...selectedEssay,
      id: undefined,
      status: "draft",
      version: (selectedEssay.version || 1) + 1,
      parent_essay_id: selectedEssay.id,
      total_score: undefined,
      competencies: undefined,
      general_feedback: undefined,
      strengths: undefined,
      improvements: undefined
    };
    setSelectedEssay(newEssay);
    setView("write");
  };

  const handleBack = () => {
    setView("list");
    setSelectedProposal(null);
    setSelectedEssay(null);
  };

  // Stats calculation
  const correctedEssays = essays.filter(e => e.status === 'corrected');
  const avgScore = correctedEssays.length > 0
    ? Math.round(correctedEssays.reduce((acc, e) => acc + (e.total_score || 0), 0) / correctedEssays.length)
    : 0;

  if (loadingProposals || loadingEssays) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Result view
  if (view === "result" && selectedEssay) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <EssayCorrectionResult 
          essay={selectedEssay} 
          onRewrite={handleRewrite}
        />
      </div>
    );
  }

  // Write view
  if (view === "write") {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <EssayEditor
          proposal={selectedProposal}
          initialContent={selectedEssay?.content || ""}
          initialTitle={selectedEssay?.title || ""}
          onSave={handleSaveEssay}
          onSubmit={handleSubmitEssay}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Redações</h1>
          <p className="text-slate-400">
            Pratique redações com correção automática por IA
          </p>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Gerar Proposta
        </Button>
      </motion.div>

      {/* Stats */}
      {correctedEssays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{essays.length}</p>
                <p className="text-xs text-slate-500">Total de Redações</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgScore}</p>
                <p className="text-xs text-slate-500">Média de Nota</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{proposals.length}</p>
                <p className="text-xs text-slate-500">Propostas Disponíveis</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 mb-6">
          <TabsTrigger value="proposals" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <BookOpen className="w-4 h-4 mr-2" />
            Propostas
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <History className="w-4 h-4 mr-2" />
            Minhas Redações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          {proposals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-12 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Nenhuma proposta ainda
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Gere sua primeira proposta de redação com IA ou escreva sobre um tema livre.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => setShowGenerateDialog(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar com IA
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProposal(null);
                    setView("write");
                  }}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Tema Livre
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {proposals.map((proposal, index) => (
                  <EssayProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    index={index}
                    onSelect={handleSelectProposal}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {essays.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-12 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                <History className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Nenhuma redação ainda
              </h3>
              <p className="text-slate-400 max-w-md mx-auto">
                Suas redações aparecerão aqui após você começar a escrever.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {essays.map((essay, index) => (
                  <EssayHistoryCard
                    key={essay.id}
                    essay={essay}
                    index={index}
                    onView={handleViewEssay}
                    onEdit={handleEditEssay}
                    onDelete={(id) => deleteEssayMutation.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Proposal Dialog */}
      <GenerateProposalDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onGenerate={handleGenerateProposal}
        isGenerating={isGenerating}
      />
    </div>
  );
}
