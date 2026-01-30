import React from "react";
import { motion } from "framer-motion";
import { 
  StickyNote, 
  LayoutGrid, 
  Lightbulb, 
  FileText,
  Network
} from "lucide-react";

const noteTypes = [
  {
    type: "quick",
    name: "Nota Rápida",
    description: "Anotação simples e direta",
    icon: StickyNote,
    color: "amber"
  },
  {
    type: "cornell",
    name: "Cornell",
    description: "Perguntas + Notas + Resumo",
    icon: LayoutGrid,
    color: "blue"
  },
  {
    type: "feynman",
    name: "Feynman",
    description: "Explique para aprender",
    icon: Lightbulb,
    color: "purple"
  },
  {
    type: "summary",
    name: "Resumo",
    description: "Síntese do conteúdo",
    icon: FileText,
    color: "green"
  },
  {
    type: "mindmap",
    name: "Mapa Mental",
    description: "Conexões visuais",
    icon: Network,
    color: "pink"
  }
];

const colorClasses = {
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
  green: "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20"
};

const selectedClasses = {
  amber: "ring-2 ring-amber-500 bg-amber-500/20",
  blue: "ring-2 ring-blue-500 bg-blue-500/20",
  purple: "ring-2 ring-purple-500 bg-purple-500/20",
  green: "ring-2 ring-green-500 bg-green-500/20",
  pink: "ring-2 ring-pink-500 bg-pink-500/20"
};

export default function NoteTypeSelector({ selectedType, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {noteTypes.map((item) => {
        const isSelected = selectedType === item.type;
        const Icon = item.icon;
        
        return (
          <motion.button
            key={item.type}
            type="button"
            onClick={() => onSelect(item.type)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-xl border text-center transition-all ${colorClasses[item.color]} ${
              isSelected ? selectedClasses[item.color] : ''
            }`}
          >
            <Icon className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs opacity-60 mt-1 hidden sm:block">{item.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
