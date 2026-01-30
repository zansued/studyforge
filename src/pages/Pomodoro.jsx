import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Flame,
  Settings,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  StickyNote,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Pomodoro() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionNote, setSessionNote] = useState("");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: todaySessions = [] } = useQuery({
    queryKey: ['todaySessions', user?.email],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.StudySession.filter({ date: today, created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.StudySession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySessions'] });
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Session complete
      if (!isBreak) {
        const endTime = Date.now();
        const durationMinutes = startTimeRef.current 
          ? Math.round((endTime - startTimeRef.current) / 60000)
          : workDuration;

        // Save session
        createSessionMutation.mutate({
          duration_minutes: durationMinutes,
          pomodoros_completed: 1,
          type: 'study',
          date: new Date().toISOString().split('T')[0],
          notes: sessionNote
        });

        setSessions((prev) => prev + 1);
        setShowNoteDialog(true);
      }
      
      setIsBreak(!isBreak);
      setTimeLeft(isBreak ? workDuration * 60 : breakDuration * 60);
      setIsRunning(false);
      startTimeRef.current = null;
      
      // Play sound
      if (soundEnabled) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT8v...');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, isBreak, workDuration, breakDuration, soundEnabled, sessionNote]);

  const toggleTimer = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
    startTimeRef.current = null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalMinutes = isBreak ? breakDuration * 60 : workDuration * 60;
  const progress = ((totalMinutes - timeLeft) / totalMinutes) * 100;
  
  const totalMinutesToday = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalPomodorosToday = todaySessions.reduce((acc, s) => acc + (s.pomodoros_completed || 0), 0);

  const handleSaveNote = () => {
    if (sessionNote.trim()) {
      createNoteMutation.mutate({
        title: `Insight do Pomodoro #${sessions}`,
        content: sessionNote,
        type: 'quick',
        color: '#fef3c7'
      });
    }
    setSessionNote("");
    setShowNoteDialog(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Pomodoro</h1>
        <p className="text-slate-400">
          Foco profundo, descanso estratégico
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
            <Flame className="w-5 h-5" />
            <span className="text-2xl font-bold">{totalPomodorosToday + sessions}</span>
          </div>
          <p className="text-sm text-slate-400">Pomodoros Hoje</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-500 mb-2">
            <Coffee className="w-5 h-5" />
            <span className="text-2xl font-bold">
              {Math.floor((totalMinutesToday + (sessions * workDuration)) / 60)}h{' '}
              {(totalMinutesToday + (sessions * workDuration)) % 60}m
            </span>
          </div>
          <p className="text-sm text-slate-400">Tempo Focado</p>
        </div>
      </motion.div>

      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-8 mb-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {isBreak ? (
              <>
                <Coffee className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Pausa</span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 font-medium">Foco</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="text-slate-400 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative flex flex-col items-center">
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="115"
                className="fill-none stroke-slate-800"
                strokeWidth="12"
              />
              <motion.circle
                cx="128"
                cy="128"
                r="115"
                className={`fill-none ${isBreak ? 'stroke-green-500' : 'stroke-amber-500'}`}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={722}
                initial={{ strokeDashoffset: 722 }}
                animate={{ strokeDashoffset: 722 - (722 * progress) / 100 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-white font-mono">
                {formatTime(timeLeft)}
              </span>
              <span className="text-slate-500 mt-2">
                {isBreak ? "Descanse a mente" : "Mantenha o foco"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={resetTimer}
              className="w-14 h-14 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            <Button
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full shadow-lg shadow-amber-500/20 ${
                isBreak 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-amber-500 hover:bg-amber-600'
              } text-white`}
            >
              {isRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNoteDialog(true)}
              className="w-14 h-14 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <StickyNote className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Quick Note Input */}
        {isRunning && !isBreak && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Input
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Anote um insight rápido..."
              className="bg-slate-800/50 border-slate-700 text-white text-center"
            />
          </motion.div>
        )}
      </motion.div>

      {/* Session History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="font-semibold text-white mb-4">Sessões de Hoje</h3>
        {todaySessions.length === 0 && sessions === 0 ? (
          <p className="text-slate-500 text-center py-4">
            Nenhuma sessão ainda. Inicie seu primeiro Pomodoro!
          </p>
        ) : (
          <div className="space-y-3">
            {[...todaySessions].reverse().slice(0, 5).map((session, index) => (
              <div
                key={session.id || index}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      {session.pomodoros_completed || 1} pomodoro
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.duration_minutes} minutos
                    </p>
                  </div>
                </div>
                {session.notes && (
                  <span className="text-xs text-slate-400 max-w-[150px] truncate">
                    {session.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Configurações</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Tempo de Foco (minutos)</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWorkDuration(Math.max(5, workDuration - 5))}
                  className="border-slate-700 text-slate-300"
                  disabled={isRunning}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-white w-12 text-center">
                  {workDuration}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWorkDuration(Math.min(60, workDuration + 5))}
                  className="border-slate-700 text-slate-300"
                  disabled={isRunning}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tempo de Pausa (minutos)</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBreakDuration(Math.max(1, breakDuration - 1))}
                  className="border-slate-700 text-slate-300"
                  disabled={isRunning}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-white w-12 text-center">
                  {breakDuration}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBreakDuration(Math.min(30, breakDuration + 1))}
                  className="border-slate-700 text-slate-300"
                  disabled={isRunning}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                if (!isRunning) {
                  setTimeLeft(workDuration * 60);
                }
                setShowSettings(false);
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              Anotação do Pomodoro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="O que você aprendeu ou pensou durante esta sessão?"
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSessionNote("");
                  setShowNoteDialog(false);
                }}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Pular
              </Button>
              <Button
                onClick={handleSaveNote}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
