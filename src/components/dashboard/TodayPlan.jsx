import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, BookOpen, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TodayPlan({ topics = [], sessions = [] }) {
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === today);
  const totalMinutesToday = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activePlan } = useQuery({
    queryKey: ['activePlan', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.StudyPlan.filter({ created_by: user.email, is_active: true });
      return plans[0] || null;
    },
    enabled: !!user?.email,
  });

  // Calculate which day of the plan we're on
  const getDayOfPlan = () => {
    if (!activePlan?.plan_data?.cycles || !Array.isArray(activePlan.plan_data.cycles)) return null;
    
    const startDate = new Date(activePlan.created_date);
    const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    let currentDay = daysPassed + 1;
    for (const cycle of activePlan.plan_data.cycles) {
      const cycleDays = cycle.days?.length || 0;
      if (currentDay <= cycleDays) {
        return cycle.days?.[currentDay - 1];
      }
      currentDay -= cycleDays;
    }
    return null;
  };

  const todayPlanFromActivePlan = getDayOfPlan();
  const hasPlanForToday = activePlan && todayPlanFromActivePlan;

  // Get topics from active plan or fallback to pending topics
  const pendingTopics = hasPlanForToday 
    ? [] 
    : topics.filter(t => t.status === 'pending' || t.status === 'studying').slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            Plano de Hoje
            {hasPlanForToday && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </h3>
          {activePlan && (
            <p className="text-xs text-slate-500 mt-1">{activePlan.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}min estudados</span>
        </div>
      </div>

      {hasPlanForToday ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <p className="text-xs text-purple-300">
              📅 Dia {todayPlanFromActivePlan.day_number} do planejamento
            </p>
          </div>
          {todayPlanFromActivePlan.subjects?.map((subject, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <Link 
                  to={createPageUrl("Materias")}
                  className="font-medium text-white hover:text-amber-400 transition-colors"
                >
                  {subject.subject}
                </Link>
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  {subject.hours}h
                </span>
              </div>
              {subject.topics && subject.topics.length > 0 && (
                <div className="space-y-1">
                  {subject.topics.map((topicName, idx) => {
                    const matchingTopic = topics.find(t => t.name === topicName);
                    return matchingTopic ? (
                      <Link
                        key={idx}
                        to={createPageUrl(`EstudarTopico?id=${matchingTopic.id}`)}
                        className="flex items-start gap-2 hover:bg-slate-700/30 rounded px-2 py-1 -mx-2 transition-colors group"
                      >
                        <Circle className="w-3 h-3 text-slate-600 group-hover:text-amber-500 mt-1 shrink-0 transition-colors" />
                        <p className="text-xs text-slate-400 group-hover:text-amber-300 transition-colors">{topicName}</p>
                      </Link>
                    ) : (
                      <div key={idx} className="flex items-start gap-2">
                        <Circle className="w-3 h-3 text-slate-600 mt-1 shrink-0" />
                        <p className="text-xs text-slate-400">{topicName}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : pendingTopics.length > 0 ? (
        <div className="space-y-3">
          {pendingTopics.map((topic, index) => (
            <Link
              key={topic.id}
              to={createPageUrl(`EstudarTopico?id=${topic.id}`)}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors group cursor-pointer"
              >
                {topic.status === 'mastered' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 group-hover:text-amber-500 transition-colors" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{topic.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {topic.difficulty === 'easy' ? 'Fácil' : topic.difficulty === 'hard' ? 'Difícil' : 'Médio'}
                  </p>
                </div>
                <BookOpen className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 mb-2">Nenhum tópico pendente</p>
          <Link 
            to={createPageUrl("Editais")}
            className="text-amber-500 text-sm hover:underline"
          >
            Adicione um edital para começar
          </Link>
        </div>
      )}
    </motion.div>
  );
}
