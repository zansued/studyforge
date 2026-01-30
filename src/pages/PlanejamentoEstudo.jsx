import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Brain,
  Clock,
  Target,
  TrendingUp,
  Loader2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Flame,
  Trash2,
  Eye,
  Star,
  StarOff,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PlanejamentoEstudo() {
  const [selectedEditalId, setSelectedEditalId] = useState(null);
  const [cycleType, setCycleType] = useState("semanal");
  const [studyPlan, setStudyPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [planName, setPlanName] = useState("");
  const [viewingPlan, setViewingPlan] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [customDate, setCustomDate] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: editais = [] } = useQuery({
    queryKey: ['editais_all', user?.email],
    queryFn: () => base44.entities.Edital.filter({ created_by: user.email }, '-exam_date', 100),
    enabled: !!user?.email,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', selectedEditalId, user?.email],
    queryFn: () => base44.entities.Subject.filter({ edital_id: selectedEditalId, created_by: user.email }),
    enabled: !!selectedEditalId && !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: savedPlans = [] } = useQuery({
    queryKey: ['studyPlans', user?.email],
    queryFn: () => base44.entities.StudyPlan.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const generatePlanMutation = useMutation({
    mutationFn: async ({ edital, subjects, cycleType, additionalInfo, customDate }) => {
      const editalData = edital.extracted_data || {};
      const examDate = customDate ? new Date(customDate) : new Date(edital.exam_date);
      const today = new Date();
      const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
      const weeksUntilExam = Math.ceil(daysUntilExam / 7);

      // Get topics for each subject
      const subjectsWithTopics = subjects.map(subject => {
        const subjectTopics = topics.filter(t => t.subject_id === subject.id);
        const editalSubject = editalData.subjects?.find(s => 
          s.name?.toLowerCase() === subject.name?.toLowerCase()
        );
        
        return {
          ...subject,
          topics: subjectTopics,
          edital_info: editalSubject,
          topics_count: subjectTopics.length,
          pending_count: subjectTopics.filter(t => t.status === 'pending' || t.status === 'studying').length
        };
      });

      const prompt = `Você é um especialista em planejamento de estudos para concursos públicos brasileiros.

INFORMAÇÕES DO EDITAL:
- Concurso: ${edital.title}
- Órgão: ${edital.organization}
- Data da Prova: ${examDate.toLocaleDateString('pt-BR')}
- Dias até a prova: ${daysUntilExam} dias (${weeksUntilExam} semanas)
- Cargo: ${edital.cargo}

MATÉRIAS E TÓPICOS:
${subjectsWithTopics.map(s => `
• ${s.name}
  - Prioridade: ${s.priority || 'média'}
  - Peso no edital: ${s.weight || 1}
  - Questões no edital: ${s.edital_info?.questions || 'N/A'}
  - Tópicos totais: ${s.topics_count}
  - Tópicos pendentes: ${s.pending_count}
  - Programação do edital: ${s.edital_info?.content?.join(', ') || 'Não especificado'}
`).join('\n')}

TIPO DE CICLO SOLICITADO: ${cycleType === 'diario' ? 'Diário' : 'Semanal'}

TAREFA: Crie um plano de estudos COMPLETO e REALISTA até a data da prova.

INSTRUÇÕES:
1. ANÁLISE DE TENDÊNCIAS: Identifique quais matérias/assuntos têm mais chance de cair baseado em:
   - Peso no edital
   - Número de questões
   - Prioridade definida
   - Frequência em concursos similares

2. DISTRIBUIÇÃO DO TEMPO:
   - Considere o tempo disponível até a prova
   - Priorize matérias com mais peso/questões
   - Alterne matérias para evitar fadiga mental
   - Reserve tempo para revisões próximo à prova

3. CICLOS DE ESTUDO:
   ${cycleType === 'diario' 
     ? `- Crie ciclos DIÁRIOS com 4-6 horas de estudo por dia
        - Cada dia deve ter 2-3 matérias diferentes
        - Alterne matérias pesadas com mais leves`
     : `- Crie ciclos SEMANAIS (7 dias cada)
        - Distribua todas as matérias ao longo da semana
        - Cada matéria deve aparecer 2-3 vezes por semana
        - Reserve 1 dia para revisão geral`}

4. ESTRUTURA DOS CICLOS:
   - Cada ciclo deve ter: nome, período, matérias a estudar, tópicos específicos, horas estimadas
   - Inclua estratégias e dicas para cada ciclo

5. RESUMO ESTATÍSTICO: Forneça análise de distribuição de tempo por matéria

Retorne um plano detalhado e executável.`;

      const response = await base44.functions.invoke('agent_study_planner', { 
        edital, 
        subjects: subjectsWithTopics, 
        cycleType,
        additionalInfo,
        customDate
      });

      return response.data;
    },
    onSuccess: (data) => {
      setStudyPlan(data);
      setShowSaveDialog(true);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data) => {
      // Deactivate all other plans
      for (const plan of savedPlans) {
        if (plan.is_active) {
          await base44.entities.StudyPlan.update(plan.id, { is_active: false });
        }
      }
      
      // Create new active plan
      return base44.entities.StudyPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
      setShowSaveDialog(false);
      setStudyPlan(null);
      setPlanName("");
    },
  });

  const toggleActivePlanMutation = useMutation({
    mutationFn: async (planId) => {
      // Deactivate all plans
      for (const plan of savedPlans) {
        await base44.entities.StudyPlan.update(plan.id, { is_active: plan.id === planId ? true : false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.StudyPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyPlans'] });
    },
  });

  const handleGeneratePlan = async () => {
    if (!selectedEditalId) return;
    
    const edital = editais.find(e => e.id === selectedEditalId);
    if (!edital) return;

    setIsGenerating(true);
    await generatePlanMutation.mutateAsync({ edital, subjects, cycleType, additionalInfo, customDate });
  };

  const selectedEdital = editais.find(e => e.id === selectedEditalId);
  const daysUntilExam = selectedEdital 
    ? Math.ceil((new Date(selectedEdital.exam_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleSavePlan = async () => {
    if (!planName.trim() || !studyPlan) return;

    const edital = editais.find(e => e.id === selectedEditalId);
    await savePlanMutation.mutateAsync({
      name: planName,
      edital_id: selectedEditalId,
      cycle_type: cycleType,
      plan_data: studyPlan,
      is_active: true,
      exam_date: edital?.exam_date
    });
  };

  const handleViewPlan = (plan) => {
    setViewingPlan(plan);
    setStudyPlan(plan.plan_data);
    setShowPlanDialog(true);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Planejamento com IA</h1>
            <p className="text-slate-400">Cronograma personalizado até a data da prova</p>
          </div>
        </div>
      </motion.div>

      {/* Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Configurar Planejamento
        </h2>

        <div className="space-y-4">
          {/* Edital Selection */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Selecione o Edital</label>
            <Select value={selectedEditalId} onValueChange={setSelectedEditalId}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="Escolha um edital..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {editais.map((edital) => {
                  const days = Math.ceil((new Date(edital.exam_date) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <SelectItem key={edital.id} value={edital.id} className="text-white hover:bg-slate-700 cursor-pointer">
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="truncate max-w-[200px]">{edital.title}</span>
                        <div className="flex items-center gap-2">
                          {edital.status === 'processing' && <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">Processando</Badge>}
                          <Badge variant="outline" className="text-xs shrink-0">
                            {days} dias
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Cycle Type */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Tipo de Ciclo</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCycleType('diario')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  cycleType === 'diario'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <Calendar className="w-5 h-5 text-purple-400 mb-2" />
                <p className="font-medium text-white">Diário</p>
                <p className="text-xs text-slate-400 mt-1">Plano detalhado dia a dia</p>
              </button>
              <button
                onClick={() => setCycleType('semanal')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  cycleType === 'semanal'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <BarChart3 className="w-5 h-5 text-blue-400 mb-2" />
                <p className="font-medium text-white">Semanal</p>
                <p className="text-xs text-slate-400 mt-1">Ciclos de 7 dias</p>
              </button>
            </div>
          </div>

          {/* Edital Info */}
          {selectedEdital && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data da Prova</p>
                  <p className="text-sm font-medium text-white">
                    {customDate ? new Date(customDate).toLocaleDateString('pt-BR') : new Date(selectedEdital.exam_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tempo Disponível</p>
                  <p className="text-sm font-medium text-white">
                    {customDate 
                      ? Math.ceil((new Date(customDate) - new Date()) / (1000 * 60 * 60 * 24))
                      : daysUntilExam} dias
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Matérias</p>
                  <p className="text-sm font-medium text-white">{subjects.length} matérias</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Data Personalizada (Opcional)</label>
              <Input 
                type="date" 
                value={customDate} 
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Use se a data da prova foi alterada</p>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Instruções para a IA (Opcional)</label>
              <Textarea 
                value={additionalInfo} 
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Ex: Focar apenas nas específicas, tenho dificuldade em raciocínio lógico..."
                className="bg-slate-800/50 border-slate-700 text-white min-h-[80px]"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePlan}
            disabled={!selectedEditalId || subjects.length === 0 || isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Planejamento...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Planejamento com IA
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Saved Plans List */}
      {savedPlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Meus Planejamentos
          </h2>
          <div className="space-y-3">
            {savedPlans.map((plan, index) => {
              const planEdital = editais.find(e => e.id === plan.edital_id);
              const daysLeft = planEdital 
                ? Math.ceil((new Date(plan.exam_date) - new Date()) / (1000 * 60 * 60 * 24))
                : 0;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
                >
                  <button
                    onClick={() => toggleActivePlanMutation.mutate(plan.id)}
                    className="shrink-0"
                  >
                    {plan.is_active ? (
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <StarOff className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                      {plan.is_active && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>{planEdital?.title}</span>
                      <span>•</span>
                      <span>{daysLeft} dias restantes</span>
                      <span>•</span>
                      <span className="capitalize">{plan.cycle_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPlan(plan)}
                      className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlanMutation.mutate(plan.id)}
                      className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Info Cards */}
      {savedPlans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-medium text-white mb-2">Análise Inteligente</h3>
            <p className="text-sm text-slate-400">
              A IA analisa o edital, prioridades e tendências para criar o melhor plano
            </p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-medium text-white mb-2">Foco no Essencial</h3>
            <p className="text-sm text-slate-400">
              Prioriza matérias com maior peso e probabilidade de cair na prova
            </p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-medium text-white mb-2">Cronograma Otimizado</h3>
            <p className="text-sm text-slate-400">
              Distribui o tempo de forma equilibrada até a data da prova
            </p>
          </div>
        </motion.div>
      )}

      {/* Save Plan Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Save className="w-5 h-5 text-green-400" />
              Salvar Planejamento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Nome do Planejamento</label>
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Plano TRF - Maio 2025"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setStudyPlan(null);
                  setPlanName("");
                }}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePlan}
                disabled={!planName.trim() || savePlanMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {savePlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={(open) => {
        setShowPlanDialog(open);
        if (!open) {
          setViewingPlan(null);
          setStudyPlan(null);
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-500" />
              {viewingPlan ? viewingPlan.name : 'Seu Plano de Estudos'}
            </DialogTitle>
          </DialogHeader>

          {studyPlan && (
            <div className="mt-6 space-y-6">
              {/* Analysis */}
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Análise e Estratégia
                </h3>
                <p className="text-slate-300 mb-4">{studyPlan.analysis?.strategy || studyPlan.analysis?.study_strategy}</p>

                {studyPlan.analysis?.priority_subjects && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-400 mb-2">Matérias Prioritárias:</p>
                    {studyPlan.analysis.priority_subjects.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mt-1">
                          {item.estimated_hours}h
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-white">{item.subject}</p>
                          <p className="text-sm text-slate-400">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistics */}
              {studyPlan.statistics && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Estatísticas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <p className="text-sm text-slate-400">Total de Horas</p>
                      <p className="text-2xl font-bold text-white">{studyPlan.statistics.total_study_hours}h</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <p className="text-sm text-slate-400">Média por Dia</p>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(studyPlan.statistics.total_study_hours / daysUntilExam)}h
                      </p>
                    </div>
                  </div>
                  
                  {studyPlan.statistics.hours_per_subject && (
                    <div className="space-y-2">
                      {studyPlan.statistics.hours_per_subject.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-white">{item.subject}</span>
                            <span className="text-slate-400">{item.hours}h ({item.percentage}%)</span>
                          </div>
                          <Progress value={item.percentage} className="h-2 bg-slate-800" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cycles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Ciclos de Estudo
                </h3>
                
                {Array.isArray(studyPlan.cycles) && studyPlan.cycles.map((cycle, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-white text-lg">{cycle.name}</h4>
                        <p className="text-sm text-slate-400">
                          {cycle.start_date} - {cycle.end_date}
                        </p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Ciclo {cycle.cycle_number}
                      </Badge>
                    </div>

                    {cycle.focus && (
                      <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm text-purple-300">
                          <strong>Foco:</strong> {cycle.focus}
                        </p>
                      </div>
                    )}

                    {cycle.days && (
                      <div className="space-y-3 mb-4">
                        {cycle.days.map((day, dayIdx) => (
                          <div key={dayIdx} className="p-3 rounded-lg bg-slate-800/50">
                            <p className="text-sm font-medium text-amber-400 mb-2">Dia {day.day_number}</p>
                            <div className="space-y-2">
                              {day.subjects?.map((subject, subIdx) => (
                                <div key={subIdx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm text-white font-medium">{subject.subject}</p>
                                    {subject.topics && subject.topics.length > 0 && (
                                      <p className="text-xs text-slate-400 mt-1">
                                        {subject.topics.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {subject.hours}h
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {cycle.tips && cycle.tips.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-400">Dicas:</p>
                        {cycle.tips.map((tip, tipIdx) => (
                          <div key={tipIdx} className="flex items-start gap-2 text-sm text-slate-300">
                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
