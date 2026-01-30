import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Plus,
  Calendar,
  Building2,
  ChevronRight,
  Loader2,
  Sparkles,
  Trash2,
  X,
  Briefcase,
  RefreshCw,
  Eye,
  AlertCircle,
  Pencil
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditalDetailsDialog from "@/components/editais/EditalDetailsDialog";

export default function Editais() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEdital, setSelectedEdital] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reprocessingId, setReprocessingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    organization: "",
    cargo: "",
    escolaridade: "",
    exam_date: "",
    file: null
  });
  const [editingEdital, setEditingEdital] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: editais = [], isLoading } = useQuery({
    queryKey: ['editais', user?.email],
    queryFn: () => base44.entities.Edital.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createEditalMutation = useMutation({
    mutationFn: async (data) => {
      let file_url = null;
      
      if (data.file) {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: data.file
        });
        file_url = uploadResult.file_url;
      }

      const edital = await base44.entities.Edital.create({
                title: data.title,
                organization: data.organization,
                cargo: data.cargo,
                escolaridade: data.escolaridade,
                exam_date: data.exam_date,
                file_url,
                status: file_url ? "processing" : "active",
                created_by: user.email
              });

      // If file was uploaded, process with AI
      if (file_url) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tempo limite de processamento excedido (60s)')), 60000)
          );

          const response = await Promise.race([
            base44.functions.invoke('agent_edital_analyzer', {
              file_url,
              cargo: data.cargo,
              escolaridade: data.escolaridade
            }),
            timeoutPromise
          ]);

                  const extractedData = response.data?.data || {};

          // Update edital with extracted data
          await base44.entities.Edital.update(edital.id, {
            extracted_data: extractedData,
            status: "active"
          });

          // Create subjects and topics
          const subjectColors = [
            "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", 
            "#ef4444", "#06b6d4", "#f97316", "#ec4899"
          ];

          for (let i = 0; i < extractedData.subjects?.length; i++) {
            const subj = extractedData.subjects[i];
            const subject = await base44.entities.Subject.create({
              edital_id: edital.id,
              name: subj.name,
              weight: subj.weight || 1,
              priority: subj.priority?.toLowerCase() || "medium",
              color: subjectColors[i % subjectColors.length],
              progress: 0,
              created_by: user.email
            });

            // Create topics for this subject
            for (const topicName of subj.topics || []) {
              await base44.entities.Topic.create({
                subject_id: subject.id,
                name: topicName,
                status: "pending",
                difficulty: "medium",
                created_by: user.email
              });
            }
          }
        } catch (error) {
          console.error("Error processing edital:", error);
          await base44.entities.Edital.update(edital.id, { status: "active" });
        }
      }

      return edital;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowDialog(false);
      setFormData({ title: "", organization: "", cargo: "", escolaridade: "", exam_date: "", file: null });
    },
  });

  // Reprocess edital with AI
  const reprocessEditalMutation = useMutation({
    mutationFn: async (edital) => {
      if (!edital.file_url) {
        throw new Error("Edital não possui arquivo PDF");
      }

      await base44.entities.Edital.update(edital.id, { status: "processing" });

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite de processamento excedido (60s)')), 60000)
        );

        const response = await Promise.race([
          base44.functions.invoke('agent_edital_analyzer', {
            file_url: edital.file_url,
            cargo: edital.cargo,
            escolaridade: edital.escolaridade
          }),
          timeoutPromise
        ]);

        const extractedData = response.data?.data || {};

        // Delete existing subjects and topics for this edital
        const existingSubjects = await base44.entities.Subject.filter({ edital_id: edital.id });
        for (const subj of existingSubjects) {
          const topics = await base44.entities.Topic.filter({ subject_id: subj.id });
          for (const topic of topics) {
            await base44.entities.Topic.delete(topic.id);
          }
          await base44.entities.Subject.delete(subj.id);
        }

        // Update edital with new extracted data
        await base44.entities.Edital.update(edital.id, {
          extracted_data: extractedData,
          status: "active"
        });

        // Create new subjects and topics
        const subjectColors = [
          "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", 
          "#ef4444", "#06b6d4", "#f97316", "#ec4899"
        ];

        for (let i = 0; i < extractedData.subjects?.length; i++) {
          const subj = extractedData.subjects[i];
          const subject = await base44.entities.Subject.create({
            edital_id: edital.id,
            name: subj.name,
            weight: subj.weight || 1,
            priority: subj.priority?.toLowerCase() || "medium",
            color: subjectColors[i % subjectColors.length],
            progress: 0,
            created_by: user.email
          });

          for (const topicName of subj.topics || []) {
            await base44.entities.Topic.create({
              subject_id: subject.id,
              name: topicName,
              status: "pending",
              difficulty: "medium",
              created_by: user.email
            });
          }
        }

        return extractedData;
      } catch (error) {
        console.error("Error processing edital:", error);
        await base44.entities.Edital.update(edital.id, { status: "active" }); // Revert to active on error so it doesn't get stuck
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setReprocessingId(null);
    },
    onError: (error) => {
      console.error("Error reprocessing:", error);
      setReprocessingId(null);
    }
  });

  const handleReprocess = async (edital) => {
    setReprocessingId(edital.id);
    await reprocessEditalMutation.mutateAsync(edital);
  };

  const handleViewDetails = (edital) => {
    setSelectedEdital(edital);
    setShowDetailsDialog(true);
  };

  const handleEditEdital = (edital) => {
    setEditingEdital(edital);
    setEditFormData({
      title: edital.title || "",
      organization: edital.organization || "",
      cargo: edital.cargo || "",
      escolaridade: edital.escolaridade || "",
      exam_date: edital.exam_date || ""
    });
    setShowEditDialog(true);
  };

  const updateEditalMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Edital.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais'] });
      setShowEditDialog(false);
      setEditingEdital(null);
      setEditFormData({});
    },
  });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEdital?.id) return;
    await updateEditalMutation.mutateAsync({ id: editingEdital.id, data: editFormData });
  };

  const deleteEditalMutation = useMutation({
    mutationFn: async (id) => {
      // Delete related subjects and topics
      const subjects = await base44.entities.Subject.filter({ edital_id: id });
      for (const subj of subjects) {
        const topics = await base44.entities.Topic.filter({ subject_id: subj.id });
        for (const topic of topics) {
          await base44.entities.Topic.delete(topic.id);
        }
        await base44.entities.Subject.delete(subj.id);
      }
      await base44.entities.Edital.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editais'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await createEditalMutation.mutateAsync(formData);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Meus Editais</h1>
          <p className="text-slate-400">
            Faça upload de editais e a IA extrai matérias e tópicos automaticamente
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Edital
        </Button>
      </motion.div>

      {/* Editais Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : editais.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum edital cadastrado
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Adicione seu primeiro edital para que a IA crie automaticamente 
            seu plano de estudos personalizado.
          </p>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Upload className="w-5 h-5 mr-2" />
            Fazer Upload do Edital
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {editais.map((edital, index) => (
              <motion.div
                key={edital.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:border-slate-700/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{edital.title}</h3>
                      {edital.organization && (
                                                    <p className="text-sm text-slate-400 flex items-center gap-1">
                                                      <Building2 className="w-3 h-3" />
                                                      {edital.organization}
                                                    </p>
                                                  )}
                                                  {edital.cargo && (
                                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                                      <Briefcase className="w-3 h-3" />
                                                      {edital.cargo}
                                                    </p>
                                                  )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEditalMutation.mutate(edital.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Content */}
                {(edital.status === "processing" || reprocessingId === edital.id) && (
                  <div className="flex items-center gap-2 text-amber-500 text-sm mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{reprocessingId === edital.id ? "Reprocessando edital..." : "Processando com IA (isso pode levar 1 minuto)..."}</span>
                  </div>
                )}

                {edital.exam_date && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>Prova: {format(new Date(edital.exam_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                )}

                {edital.extracted_data?.subjects && edital.extracted_data.subjects.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Matérias extraídas:</p>
                    <div className="flex flex-wrap gap-1">
                      {edital.extracted_data.subjects.slice(0, 4).map((subj, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-lg bg-slate-800/50 text-xs text-slate-300"
                        >
                          {subj.name}
                        </span>
                      ))}
                      {edital.extracted_data.subjects.length > 4 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-800/50 text-xs text-slate-500">
                          +{edital.extracted_data.subjects.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {edital.status === "processing" ? "Aguardando extração..." : "Nenhuma matéria extraída. Tente reprocessar."}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-800/50 mt-auto">
                  <button
                    onClick={() => handleViewDetails(edital)}
                    className="flex items-center gap-2 text-blue-400 text-sm hover:text-blue-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalhes
                  </button>

                  <button
                    onClick={() => handleEditEdital(edital)}
                    className="flex items-center gap-2 text-slate-400 text-sm hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  
                  {edital.file_url && (
                    <button
                      onClick={() => handleReprocess(edital)}
                      disabled={reprocessingId !== null}
                      className="flex items-center gap-2 text-purple-400 text-sm hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {edital.status === "processing" ? "Forçar Reprocessamento" : "Reprocessar"}
                    </button>
                  )}
                  
                  {edital.status !== "processing" && (
                    <Link
                      to={createPageUrl(`Materias?edital=${edital.id}`)}
                      className="flex items-center gap-2 text-amber-500 text-sm hover:text-amber-400 transition-colors ml-auto"
                    >
                      Estudar
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Edital Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Edital</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Nome do Concurso *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Concurso TRT 2024"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-1">
                            <Label className="text-slate-300 text-sm">Órgão/Instituição</Label>
                            <Input
                              value={formData.organization}
                              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                              placeholder="Ex: Tribunal Regional do Trabalho"
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-slate-300 text-sm">Cargo Pretendido</Label>
                            <Input
                              value={formData.cargo}
                              onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                              placeholder="Ex: Analista Judiciário, Técnico Administrativo..."
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-slate-300 text-sm">Nível de Escolaridade</Label>
                            <Select
                              value={formData.escolaridade}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, escolaridade: value }))}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                <SelectValue placeholder="Selecione o nível" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="medio">Nível Médio</SelectItem>
                                <SelectItem value="tecnico">Nível Técnico</SelectItem>
                                <SelectItem value="superior">Nível Superior</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-slate-300 text-sm">Data da Prova</Label>
                          <Input
                type="date"
                value={formData.exam_date}
                onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">PDF do Edital</Label>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-3 text-center hover:border-amber-500/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {formData.file ? (
                    <div className="flex items-center justify-center gap-2 text-amber-500">
                      <FileText className="w-5 h-5" />
                      <span>{formData.file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData(prev => ({ ...prev, file: null }));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        Clique para fazer upload do PDF
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                A IA extrairá automaticamente matérias e tópicos
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={isProcessing || !formData.title}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Criar Edital"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <EditalDetailsDialog
        edital={selectedEdital}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />

      {/* Edit Edital Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Edital</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome do Concurso</Label>
              <Input
                value={editFormData.title || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Órgão/Instituição</Label>
              <Input
                value={editFormData.organization || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, organization: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Cargo Pretendido</Label>
              <Input
                value={editFormData.cargo || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, cargo: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nível de Escolaridade</Label>
              <Select
                value={editFormData.escolaridade || ""}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, escolaridade: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="medio">Nível Médio</SelectItem>
                  <SelectItem value="tecnico">Nível Técnico</SelectItem>
                  <SelectItem value="superior">Nível Superior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Data da Prova</Label>
              <Input
                type="date"
                value={editFormData.exam_date || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={updateEditalMutation.isPending}
              >
                {updateEditalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
