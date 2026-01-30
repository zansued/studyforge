import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  BookOpen,
  Brain,
  HelpCircle,
  PenTool,
  TrendingUp,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPanel() {
  // Fetch all users (admin only)
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
  });

  // Fetch all editais
  const { data: editais = [] } = useQuery({
    queryKey: ['allEditais'],
    queryFn: () => base44.entities.Edital.list('-created_date', 100),
  });

  // Fetch all subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['allSubjects'],
    queryFn: () => base44.entities.Subject.list('-created_date', 200),
  });

  // Fetch all flashcards
  const { data: flashcards = [] } = useQuery({
    queryKey: ['allFlashcards'],
    queryFn: () => base44.entities.Flashcard.list('-created_date', 500),
  });

  // Fetch all questions
  const { data: questions = [] } = useQuery({
    queryKey: ['allQuestions'],
    queryFn: () => base44.entities.Question.list('-created_date', 500),
  });

  // Fetch all essays
  const { data: essays = [] } = useQuery({
    queryKey: ['allEssays'],
    queryFn: () => base44.entities.Essay.list('-created_date', 200),
  });

  // Fetch all study sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions'],
    queryFn: () => base44.entities.StudySession.list('-created_date', 500),
  });

  // Calculate stats
  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalStudyHours = Math.floor(totalStudyMinutes / 60);

  // Recent users (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUsers = users.filter(u => new Date(u.created_date) >= sevenDaysAgo);

  // Active users (users with sessions in last 7 days)
  const activeUserEmails = [...new Set(sessions.filter(s => new Date(s.created_date) >= sevenDaysAgo).map(s => s.created_by))];

  const stats = [
    { label: "Total de Usuários", value: users.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Novos (7 dias)", value: recentUsers.length, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Ativos (7 dias)", value: activeUserEmails.length, icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Editais", value: editais.length, icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Matérias", value: subjects.length, icon: BookOpen, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Flashcards", value: flashcards.length, icon: Brain, color: "text-pink-400", bg: "bg-pink-500/10" },
    { label: "Questões", value: questions.length, icon: HelpCircle, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Redações", value: essays.length, icon: PenTool, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  if (loadingUsers) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Admin Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
            <p className="text-sm text-slate-400">Visão geral da plataforma</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl ${stat.bg}`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Total Study Time */}
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Tempo total de estudo na plataforma</p>
            <p className="text-2xl font-bold text-white">{totalStudyHours}h {totalStudyMinutes % 60}m</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Sessões de estudo</p>
            <p className="text-2xl font-bold text-amber-500">{sessions.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Usuários Recentes
        </h3>
        
        {users.length === 0 ? (
          <p className="text-slate-500 text-center py-4">Nenhum usuário cadastrado</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.slice(0, 10).map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-medium text-white">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.full_name || "Sem nome"}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                    {user.role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(user.created_date), "dd/MM/yy", { locale: ptBR })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
