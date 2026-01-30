import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function WeeklyProgress({ sessions = [] }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Get last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  // Calculate minutes per day
  const minutesPerDay = last7Days.map(date => {
    return sessions
      .filter(s => s.date === date)
      .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  });

  const maxMinutes = Math.max(...minutesPerDay, 60); // Min 60 to avoid division by zero
  const totalWeek = minutesPerDay.reduce((a, b) => a + b, 0);
  const avgPerDay = Math.round(totalWeek / 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-white text-lg">Última Semana</h3>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-green-400">{avgPerDay}min/dia</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {minutesPerDay.map((minutes, index) => {
          const height = minutes > 0 ? (minutes / maxMinutes) * 100 : 4;
          const isToday = index === 6;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                className={`w-full rounded-t-lg ${
                  isToday 
                    ? 'bg-gradient-to-t from-amber-500 to-amber-400' 
                    : minutes > 0 
                      ? 'bg-gradient-to-t from-slate-700 to-slate-600' 
                      : 'bg-slate-800'
                }`}
                style={{ minHeight: '4px' }}
              />
              <span className={`text-xs ${isToday ? 'text-amber-500 font-medium' : 'text-slate-500'}`}>
                {days[new Date(last7Days[index]).getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Total da semana</span>
          <span className="text-white font-medium">
            {Math.floor(totalWeek / 60)}h {totalWeek % 60}min
          </span>
        </div>
      </div>
    </motion.div>
  );
}
