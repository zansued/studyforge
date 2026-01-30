import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function AISuggestion({ suggestion }) {
  const defaultSuggestion = {
    title: "Comece sua jornada",
    description: "Adicione um edital para que eu possa criar seu plano de estudos personalizado.",
    action: "Adicionar Edital",
    actionUrl: "Editais"
  };

  const data = suggestion || defaultSuggestion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="relative glass-card rounded-2xl p-6 border-amber-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Sugestão da IA</h3>
            <p className="text-sm text-slate-300 mb-1">{data.title}</p>
            <p className="text-sm text-slate-400">{data.description}</p>
          </div>
        </div>
        
        {data.action && (
          <Link to={data.actionUrl.startsWith('/') ? data.actionUrl : createPageUrl(data.actionUrl)}>
            <Button
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {data.action}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
