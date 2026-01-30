import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GenerateProposalDialog({ 
  open, 
  onOpenChange, 
  onGenerate, 
  isGenerating 
}) {
  const [form, setForm] = useState({
    theme: "",
    exam_board: "enem",
    difficulty: "medium",
    category: ""
  });

  const handleGenerate = () => {
    onGenerate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Gerar Proposta com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Tema ou Área (opcional)</Label>
            <Input
              value={form.theme}
              onChange={(e) => setForm(prev => ({ ...prev, theme: e.target.value }))}
              placeholder="Ex: Meio ambiente, Tecnologia, Educação..."
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">
              Deixe em branco para um tema aleatório
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Banca</Label>
              <Select
                value={form.exam_board}
                onValueChange={(value) => setForm(prev => ({ ...prev, exam_board: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="enem">ENEM</SelectItem>
                  <SelectItem value="fcc">FCC</SelectItem>
                  <SelectItem value="cespe">CESPE</SelectItem>
                  <SelectItem value="fgv">FGV</SelectItem>
                  <SelectItem value="vunesp">VUNESP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Dificuldade</Label>
              <Select
                value={form.difficulty}
                onValueChange={(value) => setForm(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Categoria (opcional)</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value={null}>Qualquer</SelectItem>
                <SelectItem value="social">Questões Sociais</SelectItem>
                <SelectItem value="environment">Meio Ambiente</SelectItem>
                <SelectItem value="technology">Tecnologia</SelectItem>
                <SelectItem value="education">Educação</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="culture">Cultura</SelectItem>
                <SelectItem value="politics">Política</SelectItem>
                <SelectItem value="economy">Economia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Proposta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
