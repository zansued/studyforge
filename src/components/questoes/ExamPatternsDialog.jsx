import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  TrendingUp,
  Sparkles,
  Brain
} from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function ExamPatternsDialog({ open, onOpenChange, onUsePattern }) {
  const [examName, setExamName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(null);
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['examPatterns', user?.email],
    queryFn: () => base44.entities.ExamPattern.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const uploadPatternMutation = useMutation({
    mutationFn: async ({ file, answerKey, name }) => {
      // Upload exam file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Upload answer key if provided
      let answer_key_url = null;
      if (answerKey) {
        const answerKeyUpload = await base44.integrations.Core.UploadFile({ file: answerKey });
        answer_key_url = answerKeyUpload.file_url;
      }
      
      // Create pattern record
      const pattern = await base44.entities.ExamPattern.create({
        exam_name: name,
        file_url,
        answer_key_url,
        status: "processing"
      });

      // Analyze patterns
      const fileUrls = [file_url];
      if (answer_key_url) {
        fileUrls.push(answer_key_url);
      }

      const analysisPrompt = `Você é um especialista em análise de provas de concursos públicos.

Analise esta prova anexada${answer_key_url ? ' (com gabarito incluído)' : ''} e extraia os seguintes padrões:

1. **Estilo das Questões**: Como as questões são formuladas (objetivas, dissertativas, certo/errado, múltipla escolha)
2. **Tópicos Comuns**: Quais temas/assuntos aparecem com mais frequência
3. **Distribuição de Dificuldade**: Percentual aproximado de questões fáceis, médias e difíceis
4. **Estruturas Típicas**: Padrões de estrutura das questões (tamanho do enunciado, quantidade de alternativas, etc)
5. **Termos Frequentes**: Palavras-chave e expressões que aparecem constantemente nas questões
6. **Exemplos de Questões**: Extraia 3-5 questões COMPLETAS E LITERAIS da prova com todas as alternativas e a resposta correta

IMPORTANTE: 
- Para common_topics, liste pelo menos 5-10 tópicos/assuntos principais
- Para question_examples, extraia questões EXATAMENTE como aparecem na prova
- Se o gabarito foi fornecido, use-o para identificar as respostas corretas com precisão

Seja detalhado e específico.`;

      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            question_style: { type: "string" },
            common_topics: { type: "array", items: { type: "string" } },
            difficulty_distribution: {
              type: "object",
              properties: {
                easy: { type: "number" },
                medium: { type: "number" },
                hard: { type: "number" }
              }
            },
            typical_structures: { type: "array", items: { type: "string" } },
            frequent_terms: { type: "array", items: { type: "string" } },
            question_examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Update pattern with analysis
      await base44.entities.ExamPattern.update(pattern.id, {
        extracted_patterns: analysisResult,
        status: "completed"
      });

      return pattern;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examPatterns'] });
      setExamName("");
      setUploadingFile(null);
      setAnswerKeyFile(null);
    },
  });

  const deletePatternMutation = useMutation({
    mutationFn: (id) => base44.entities.ExamPattern.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['examPatterns'] }),
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadingFile(file);
    }
  };

  const handleAnswerKeySelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAnswerKeyFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile || !examName.trim()) return;

    setIsUploading(true);
    try {
      await uploadPatternMutation.mutateAsync({
        file: uploadingFile,
        answerKey: answerKeyFile,
        name: examName.trim()
      });
    } finally {
      setIsUploading(false);
    }
  };

  const completedPatterns = patterns.filter(p => p.status === 'completed');
  const processingPatterns = patterns.filter(p => p.status === 'processing');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Análise de Provas Anteriores
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-2">
            Envie PDFs de provas anteriores para a IA analisar padrões e gerar questões similares
          </p>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Upload className="w-4 h-4 mr-2" />
              Upload Prova
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <FileText className="w-4 h-4 mr-2" />
              Padrões ({completedPatterns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6 space-y-6">
            {/* Upload Form */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome da Prova/Banca</Label>
                <Input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="Ex: FCC - TRT 2023, CESPE - Polícia Federal 2022"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">PDF da Prova</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="exam-file"
                  />
                  <label
                    htmlFor="exam-file"
                    className="flex items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer bg-slate-800/30"
                  >
                    <Upload className="w-6 h-6 text-slate-500" />
                    <div className="text-center">
                      <p className="text-white font-medium">
                        {uploadingFile ? uploadingFile.name : "Clique para selecionar a prova"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF até 10MB</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">PDF do Gabarito (opcional)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleAnswerKeySelect}
                    className="hidden"
                    id="answer-key-file"
                  />
                  <label
                    htmlFor="answer-key-file"
                    className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-green-500/50 transition-colors cursor-pointer bg-slate-800/20"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-500" />
                    <div className="text-center">
                      <p className="text-slate-300 text-sm font-medium">
                        {answerKeyFile ? answerKeyFile.name : "Clique para anexar o gabarito"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Melhora a precisão da análise</p>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!uploadingFile || !examName.trim() || isUploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando Prova...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analisar Padrões
                  </>
                )}
              </Button>

              {isUploading && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-purple-300">
                    ⏱ A IA está analisando a prova{answerKeyFile ? ' e o gabarito' : ''}. Isso pode levar 30-60 segundos...
                  </p>
                </div>
              )}
            </div>

            {/* Processing Patterns */}
            {processingPatterns.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400">Processando</h4>
                {processingPatterns.map((pattern) => (
                  <div key={pattern.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{pattern.exam_name}</p>
                      <p className="text-xs text-slate-500">Analisando padrões...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="mt-6">
            {completedPatterns.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Nenhum padrão analisado</h3>
                <p className="text-slate-400 text-sm">Envie PDFs de provas para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {completedPatterns.map((pattern) => (
                    <motion.div
                      key={pattern.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card rounded-2xl p-6 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{pattern.exam_name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Padrões extraídos{pattern.answer_key_url && ' • Com gabarito'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePatternMutation.mutate(pattern.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Pattern Summary */}
                      {pattern.extracted_patterns && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {pattern.extracted_patterns.common_topics?.slice(0, 3).map((topic, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center">
                            {pattern.extracted_patterns.difficulty_distribution && (
                              <>
                                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                  <p className="text-xl font-bold text-green-400">
                                    {pattern.extracted_patterns.difficulty_distribution.easy || 0}%
                                  </p>
                                  <p className="text-xs text-slate-500">Fáceis</p>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                  <p className="text-xl font-bold text-amber-400">
                                    {pattern.extracted_patterns.difficulty_distribution.medium || 0}%
                                  </p>
                                  <p className="text-xs text-slate-500">Médias</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                  <p className="text-xl font-bold text-red-400">
                                    {pattern.extracted_patterns.difficulty_distribution.hard || 0}%
                                  </p>
                                  <p className="text-xs text-slate-500">Difíceis</p>
                                </div>
                              </>
                            )}
                          </div>

                          <Button
                            onClick={() => onUsePattern(pattern)}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar Questões Baseadas Nesta Prova
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
