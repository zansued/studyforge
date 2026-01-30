import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Clock, Target, Flame, Brain, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import MiniPomodoro from "@/components/dashboard/MiniPomodoro";
import TodayPlan from "@/components/dashboard/TodayPlan";
import WeeklyProgress from "@/components/dashboard/WeeklyProgress";
import AISuggestion from "@/components/dashboard/AISuggestion";
import AdminPanel from "@/components/dashboard/AdminPanel";

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['studySessions', user?.email],
    queryFn: () => base44.entities.StudySession.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.email],
    queryFn: () => base44.entities.Topic.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', user?.email],
    queryFn: () => base44.entities.Flashcard.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === today);
  const totalMinutesToday = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const pomodorosToday = todaySessions.reduce((acc, s) => acc + (s.pomodoros_completed || 0), 0);
  
  const totalMinutesAll = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutesAll / 60);
  
  const masteredTopics = topics.filter(t => t.status === 'mastered').length;
  const totalTopics = topics.length;
  const progressPercent = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

  const flashcardsToReview = flashcards.filter(f => {
    if (!f.next_review) return true;
    return new Date(f.next_review) <= new Date();
  }).length;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Admin Panel */}
      {isAdmin && <AdminPanel />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo de volta! 🔥
          </h1>
          <p className="text-slate-400">
            Sua jornada de aprovação continua. Vamos estudar?
          </p>
        </div>
        <Link
          to={createPageUrl("Pomodoro")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
        >
          <Flame className="w-5 h-5" />
          <span className="font-medium">Iniciar Sessão</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tempo Hoje"
          value={`${Math.floor(totalMinutesToday / 60)}h ${totalMinutesToday % 60}m`}
          subtitle={`${pomodorosToday} pomodoros`}
          icon={Clock}
          color="amber"
          delay={0}
        />
        <StatsCard
          title="Total Estudado"
          value={`${totalHours}h`}
          subtitle="desde o início"
          icon={Target}
          color="blue"
          delay={0.1}
        />
        <StatsCard
          title="Progresso"
          value={`${progressPercent}%`}
          subtitle={`${masteredTopics}/${totalTopics} tópicos`}
          icon={Flame}
          color="green"
          delay={0.2}
        />
        <StatsCard
          title="Para Revisar"
          value={flashcardsToReview}
          subtitle="flashcards pendentes"
          icon={Brain}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <TodayPlan topics={topics} sessions={sessions} />
          <WeeklyProgress sessions={sessions} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <MiniPomodoro />
          <AISuggestion 
            suggestion={
              subjects.length === 0 
                ? null 
                : {
                    title: "Continue seus estudos",
                    description: `Você tem ${topics.filter(t => t.status === 'pending').length} tópicos pendentes. Foque nos de maior dificuldade primeiro.`,
                    action: "Ver Matérias",
                    actionUrl: "/Materias"
                  }
            }
          />
        </div>
      </div>
    </div>
  );
}
