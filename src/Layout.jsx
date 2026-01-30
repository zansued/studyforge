import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  StickyNote,
  Brain,
  HelpCircle,
  Timer,
  PenTool,
  Menu,
  X,
  Flame,
  ChevronRight,
  LogOut,
  Lightbulb,
  MessageCircle,
  Library
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  const navItems = [
        { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
        { name: "Editais", icon: FileText, page: "Editais" },
        { name: "Matérias", icon: BookOpen, page: "Materias" },
        { name: "Planejamento", icon: Brain, page: "PlanejamentoEstudo" },
        { name: "Chat IA", icon: MessageCircle, page: "ChatIA" },
        { name: "Anotações", icon: StickyNote, page: "Anotacoes" },
        { name: "Flashcards", icon: Brain, page: "Flashcards" },
        { name: "Questões", icon: HelpCircle, page: "Questoes" },
        { name: "Redações", icon: PenTool, page: "Redacoes" },
        { name: "Pomodoro", icon: Timer, page: "Pomodoro" },
        { name: "Dicas", icon: Lightbulb, page: "Dicas" },
        { name: "Biblioteca", icon: Library, page: "Biblioteca" },
        ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>{`
        :root {
          --primary: #f59e0b;
          --primary-hover: #d97706;
          --bg-dark: #0f172a;
          --bg-card: rgba(30, 41, 59, 0.5);
          --border: rgba(148, 163, 184, 0.1);
        }
        
        .glass-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .glow-amber {
          box-shadow: 0 0 40px rgba(245, 158, 11, 0.15);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .nav-active {
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, transparent 100%);
          border-left: 3px solid #f59e0b;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">StudyForge</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            
            {/* Sidebar Content */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] glass-card z-50 flex flex-col lg:translate-x-0"
            >
              {/* Logo */}
              <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center glow-amber">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl gradient-text">StudyForge</h1>
                  <p className="text-xs text-slate-500">A forja da aprovação</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                          isActive
                            ? "nav-active bg-amber-500/10 text-amber-500"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-amber-500" : "group-hover:text-amber-500"}`} />
                        <span className="font-medium">{item.name}</span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 ml-auto text-amber-500" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* User Section */}
              <div className="p-4 border-t border-slate-800/50">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-medium">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || "Estudante"}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
