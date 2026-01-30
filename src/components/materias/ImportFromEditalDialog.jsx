import React, { useState } from "react";
import { Loader2, FileText, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ImportFromEditalDialog({ 
  open, 
  onOpenChange, 
  editais = [],
  existingSubjectNames = [],
  onImport, 
  isLoading 
}) {
  const [selectedEdital, setSelectedEdital] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const handleEditalSelect = (edital) => {
    setSelectedEdital(edital);
    setSelectedSubjects([]);
  };

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects(prev => {
      const exists = prev.find(s => s.name === subject.name);
      if (exists) {
        return prev.filter(s => s.name !== subject.name);
      }
      return [...prev, subject];
    });
  };

  const handleSelectAll = () => {
    if (!selectedEdital?.extracted_data?.subjects) return;
    const available = selectedEdital.extracted_data.subjects.filter(
      s => !existingSubjectNames.includes(s.name.toLowerCase())
    );
    if (selectedSubjects.length === available.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(available);
    }
  };

  const handleImport = () => {
    onImport(selectedEdital, selectedSubjects);
  };

  const availableSubjects = selectedEdital?.extracted_data?.subjects?.filter(
    s => !existingSubjectNames.includes(s.name.toLowerCase())
  ) || [];

  const alreadyImported = selectedEdital?.extracted_data?.subjects?.filter(
    s => existingSubjectNames.includes(s.name.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Importar do Edital
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Selecione as matérias que deseja adicionar ao seu plano de estudos.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Edital Selection */}
          {!selectedEdital ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Selecione um edital para importar matérias:</p>
              {editais.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum edital com matérias extraídas</p>
                </div>
              ) : (
                editais.map((edital) => (
                  <button
                    key={edital.id}
                    onClick={() => handleEditalSelect(edital)}
                    className="w-full p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{edital.title}</p>
                        <p className="text-xs text-slate-500">
                          {edital.extracted_data?.subjects?.length || 0} matérias disponíveis
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Edital Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedEdital.title}</p>
                    <p className="text-xs text-slate-500">{selectedEdital.cargo}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEdital(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Trocar
                </Button>
              </div>

              {/* Subject Selection */}
              {availableSubjects.length === 0 && alreadyImported.length > 0 ? (
                <div className="text-center py-6">
                  <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-300">Todas as matérias já foram importadas!</p>
                </div>
              ) : availableSubjects.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma matéria disponível neste edital</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      Selecione as matérias para importar:
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-amber-500 hover:text-amber-400"
                    >
                      {selectedSubjects.length === availableSubjects.length ? "Desmarcar" : "Selecionar"} todas
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableSubjects.map((subject, index) => (
                      <div
                        key={index}
                        onClick={() => handleSubjectToggle(subject)}
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedSubjects.find(s => s.name === subject.name)
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={!!selectedSubjects.find(s => s.name === subject.name)}
                            className="border-slate-600"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{subject.name}</p>
                            <p className="text-xs text-slate-500">
                              {subject.topics?.length || 0} tópicos
                              {subject.questions && ` • ${subject.questions} questões`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {alreadyImported.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-800/30">
                      <p className="text-xs text-slate-500 mb-2">Já importadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {alreadyImported.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-400">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={isLoading || selectedSubjects.length === 0}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `Importar ${selectedSubjects.length} matéria${selectedSubjects.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
