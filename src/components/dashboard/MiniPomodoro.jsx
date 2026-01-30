import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MiniPomodoro({ onSessionComplete }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (!isBreak) {
        setSessions((prev) => prev + 1);
        onSessionComplete?.();
      }
      setIsBreak(!isBreak);
      setTimeLeft(isBreak ? WORK_TIME : BREAK_TIME);
      setIsRunning(false);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, isBreak]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? BREAK_TIME : WORK_TIME);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = isBreak 
    ? ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100 
    : ((WORK_TIME - timeLeft) / WORK_TIME) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Pomodoro</h3>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {isBreak ? (
            <>
              <Coffee className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Pausa</span>
            </>
          ) : (
            <span>{sessions} sessões hoje</span>
          )}
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              className="fill-none stroke-slate-800"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              className={`fill-none ${isBreak ? 'stroke-green-500' : 'stroke-amber-500'} transition-all duration-300`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={440}
              strokeDashoffset={440 - (440 * progress) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              {isBreak ? "Descansando" : "Focando"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimer}
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            onClick={toggleTimer}
            className={`w-14 h-14 rounded-full ${
              isBreak 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-amber-500 hover:bg-amber-600'
            } text-white shadow-lg`}
          >
            {isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          <div className="w-10" /> {/* Spacer for symmetry */}
        </div>
      </div>
    </motion.div>
  );
}
