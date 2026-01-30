import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudyPomodoro({ topicId, topicName, onSessionComplete }) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let interval = null;

    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            playCompletionSound();
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const playCompletionSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log("Audio play failed:", err));
    }
    
    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Pomodoro Concluído!", {
        body: isBreak ? "Pausa terminada! Hora de voltar ao estudo." : "Sessão completa! Hora do intervalo.",
        icon: "/favicon.ico"
      });
    }
  };

  const handleTimerComplete = () => {
    if (!isBreak) {
      const newCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newCount);
      
      // Save session
      if (onSessionComplete) {
        onSessionComplete(25);
      }
      
      // Start break
      setIsBreak(true);
      setMinutes(newCount % 4 === 0 ? 15 : 5);
      setSeconds(0);
    } else {
      // Break ended, start new work session
      setIsBreak(false);
      setMinutes(25);
      setSeconds(0);
    }
    setIsActive(false);
  };

  const toggleTimer = () => {
    if (!isActive && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const progress = isBreak 
    ? ((pomodorosCompleted % 4 === 0 ? 15 : 5) * 60 - (minutes * 60 + seconds)) / ((pomodorosCompleted % 4 === 0 ? 15 : 5) * 60) * 100
    : (25 * 60 - (minutes * 60 + seconds)) / (25 * 60) * 100;

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-700/50">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFApGnuDyvmwhBjiN1+7JeSkFJXfH8N+PQAkUX7Pp66hUFA==" />
      
      <div className="flex items-center gap-4">
        {/* Timer Display */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isBreak ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
            {isBreak ? (
              <Coffee className={`w-6 h-6 ${isBreak ? 'text-green-400' : 'text-amber-400'}`} />
            ) : (
              <Timer className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white font-mono">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isBreak ? '☕ Intervalo' : '🔥 Focado'} • {pomodorosCompleted} pomodoros
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${isBreak ? 'bg-green-500' : 'bg-amber-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleTimer}
            size="sm"
            className={`${isActive ? 'bg-red-500 hover:bg-red-600' : isBreak ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
          >
            {isActive ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={resetTimer}
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
