import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  GraduationCap,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  BookOpen,
  Scale,
  Award,
  AlertCircle,
  ChevronRight,
  Building2,
  Briefcase,
  Clock,
  MapPin,
  ExternalLink
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityColors = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-green-500/10 text-green-400 border-green-500/20"
};

const priorityLabels = {
  high: "Alta",
  medium: "Média",
  low: "Baixa"
};

const stageIcons = {
  prova_objetiva: CheckCircle2,
  prova_discursiva: FileText,
  titulos: Award,
  taf: Users,
  default: CheckCircle2
};

export default function EditalDetailsDialog({ edital, open, onOpenChange }) {
  if (!edital) return null;

  const data = edital.extracted_data || {};
  const subjects = data.subjects || [];
  const requirements = data.requirements || {};
  const evaluation = data.evaluation_criteria || {};
  const stages = data.stages || [];
  const dates = data.important_dates || [];

  // Try to find exam date from edital field or from extracted data
  const findExamDateFromExtracted = () => {
    if (!dates || dates.length === 0) return null;
    const examDate = dates.find(d => 
      d.description?.toLowerCase().includes('prova') || 
      d.description?.toLowerCase().includes('exame') ||
      d.description?.toLowerCase().includes('aplicação')
    );
    return examDate?.date || null;
  };

  const examDateStr = edital.exam_date || findExamDateFromExtracted();
  
  // Parse date safely with timezone fix
  const parseExamDate = () => {
    if (!examDateStr) return null;
    try {
      // If it's a date-only string (YYYY-MM-DD), add T12:00:00 to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(examDateStr)) {
        const date = new Date(examDateStr + 'T12:00:00');
        if (!isNaN(date.getTime())) return date;
      }
      // Try parsing as ISO date
      const date = new Date(examDateStr);
      if (!isNaN(date.getTime())) return date;
      return null;
    } catch {
      return null;
    }
  };

  const examDate = parseExamDate();
  
  // Calculate days difference using local dates to avoid timezone issues
  const getDaysUntilExam = () => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return differenceInDays(examDate, today);
  };
  
  const daysUntilExam = getDaysUntilExam();

  const escolaridadeLabels = {
    medio: "Nível Médio",
    tecnico: "Nível Técnico",
    superior: "Nível Superior"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-xl font-bold">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-2xl">{edital.title}</span>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {edital.organization && (
                    <Badge className="bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {edital.organization}
                    </Badge>
                  )}
                  {edital.cargo && (
                    <Badge className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {edital.cargo}
                    </Badge>
                  )}
                  {edital.escolaridade && (
                    <Badge className="bg-purple-500/20 text-purple-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {escolaridadeLabels[edital.escolaridade] || edital.escolaridade}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Exam Date Banner */}
        {(examDate || examDateStr) && (
          <div className={`mt-4 p-4 rounded-2xl flex items-center justify-between ${
            daysUntilExam !== null && daysUntilExam < 30 
              ? 'bg-red-500/10 border border-red-500/20' 
              : daysUntilExam !== null && daysUntilExam < 90
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-blue-500/10 border border-blue-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                daysUntilExam !== null && daysUntilExam < 30 
                  ? 'bg-red-500/20' 
                  : daysUntilExam !== null && daysUntilExam < 90
                    ? 'bg-amber-500/20'
                    : 'bg-blue-500/20'
              }`}>
                <Calendar className={`w-6 h-6 ${
                  daysUntilExam !== null && daysUntilExam < 30 
                    ? 'text-red-400' 
                    : daysUntilExam !== null && daysUntilExam < 90
                      ? 'text-amber-400'
                      : 'text-blue-400'
                }`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Data da Prova</p>
                <p className="text-lg font-bold text-white">
                  {examDate 
                    ? format(examDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : examDateStr
                  }
                </p>
              </div>
            </div>
            {daysUntilExam !== null && (
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  daysUntilExam < 0 
                    ? 'text-slate-500' 
                    : daysUntilExam < 30 
                      ? 'text-red-400' 
                      : daysUntilExam < 90
                        ? 'text-amber-400'
                        : 'text-blue-400'
                }`}>
                  {daysUntilExam < 0 ? 'Encerrado' : `${daysUntilExam} dias`}
                </p>
                <p className="text-xs text-slate-500">
                  {daysUntilExam < 0 ? 'Prova já realizada' : 'restantes'}
                </p>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-slate-800/50 w-full justify-start">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="subjects" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="stages" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              Etapas
            </TabsTrigger>
            <TabsTrigger value="dates" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              Datas
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Main Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Salary Card */}
              {data.salary && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Remuneração</p>
                      <p className="text-xl font-bold text-green-400">{data.salary}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vacancies Card */}
              {data.vacancies && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Vagas Disponíveis</p>
                      <p className="text-xl font-bold text-blue-400">{data.vacancies} {typeof data.vacancies === 'number' ? 'vagas' : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subjects.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/50 text-center">
                  <BookOpen className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{subjects.length}</p>
                  <p className="text-xs text-slate-500">Disciplinas</p>
                </div>
              )}
              {stages.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/50 text-center">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{stages.length}</p>
                  <p className="text-xs text-slate-500">Etapas</p>
                </div>
              )}
              {evaluation.total_questions && (
                <div className="p-4 rounded-xl bg-slate-800/50 text-center">
                  <FileText className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{evaluation.total_questions}</p>
                  <p className="text-xs text-slate-500">Questões</p>
                </div>
              )}
              {dates.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/50 text-center">
                  <Calendar className="w-5 h-5 text-pink-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{dates.length}</p>
                  <p className="text-xs text-slate-500">Datas Importantes</p>
                </div>
              )}
            </div>

            {/* PDF Link */}
            {edital.file_url && (
              <a 
                href={edital.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span className="text-white">Ver Edital Completo (PDF)</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </a>
            )}

            {/* Requirements */}
            {(requirements.formation || requirements.experience || requirements.other) && (
              <div className="p-4 rounded-xl bg-slate-800/50">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  Requisitos de Formação
                </h4>
                <div className="space-y-2 text-sm">
                  {requirements.formation && (
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{requirements.formation}</span>
                    </div>
                  )}
                  {requirements.experience && (
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{requirements.experience}</span>
                    </div>
                  )}
                  {requirements.other?.map((req, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluation Criteria */}
            {(evaluation.total_questions || evaluation.min_score || evaluation.passing_criteria) && (
              <div className="p-4 rounded-xl bg-slate-800/50">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  Critérios de Avaliação
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {evaluation.total_questions && (
                    <div>
                      <p className="text-slate-500">Total de Questões</p>
                      <p className="text-white font-medium">{evaluation.total_questions}</p>
                    </div>
                  )}
                  {evaluation.min_score && (
                    <div>
                      <p className="text-slate-500">Pontuação Mínima</p>
                      <p className="text-white font-medium">{evaluation.min_score}</p>
                    </div>
                  )}
                  {evaluation.passing_criteria && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Critério de Aprovação</p>
                      <p className="text-white">{evaluation.passing_criteria}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="mt-4 space-y-3">
            {subjects.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma disciplina extraída</p>
              </div>
            ) : (
              subjects.map((subj, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-slate-800/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-white">{subj.name}</h5>
                    <div className="flex items-center gap-2">
                      {subj.questions && (
                        <Badge variant="outline" className="text-xs">
                          {subj.questions} questões
                        </Badge>
                      )}
                      {subj.weight && (
                        <Badge variant="outline" className="text-xs">
                          Peso {subj.weight}
                        </Badge>
                      )}
                      {subj.priority && (
                        <Badge className={`text-xs border ${priorityColors[subj.priority] || priorityColors.medium}`}>
                          {priorityLabels[subj.priority] || "Média"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {subj.topics && subj.topics.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-slate-700">
                      <p className="text-xs text-slate-500 mb-2">Conteúdo Programático:</p>
                      <ul className="space-y-1">
                        {subj.topics.map((topic, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-slate-600 mt-1">•</span>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {subj.min_score && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-amber-400">
                        Pontuação mínima: {subj.min_score}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Stages Tab */}
          <TabsContent value="stages" className="mt-4 space-y-3">
            {stages.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma etapa identificada</p>
              </div>
            ) : (
              stages.map((stage, index) => {
                const StageIcon = stageIcons[stage.type] || stageIcons.default;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-slate-800/50 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <StageIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-white">{stage.name}</h5>
                      {stage.description && (
                        <p className="text-sm text-slate-400 mt-1">{stage.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stage.character && (
                          <Badge variant="outline" className="text-xs">
                            {stage.character}
                          </Badge>
                        )}
                        {stage.weight && (
                          <Badge variant="outline" className="text-xs">
                            Peso {stage.weight}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates" className="mt-4 space-y-3">
            {dates.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma data importante identificada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dates.map((date, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-slate-800/50 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex flex-col items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{date.date}</p>
                      <p className="text-sm text-white">{date.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
