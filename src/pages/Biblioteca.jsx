import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Library, Upload, Search, Filter, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import LibraryUpload from "@/components/biblioteca/LibraryUpload";
import LibrarySearch from "@/components/biblioteca/LibrarySearch";
import LibraryGrid from "@/components/biblioteca/LibraryGrid";

export default function Biblioteca() {
  const [activeTab, setActiveTab] = useState("meus-livros");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['libraryItems'],
    queryFn: async () => {
      // Fetch all items (RLS allows reading all)
      return base44.entities.LibraryItem.list("-created_date");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LibraryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['libraryItems'] }),
  });

  const handleImport = async (book) => {
    try {
      await base44.entities.LibraryItem.create({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        external_id: book.external_id,
        source: book.source,
        type: 'link',
        file_url: book.link,
        description: `Publicado em ${book.year}. Assuntos: ${book.subjects?.join(', ')}`
      });
      queryClient.invalidateQueries({ queryKey: ['libraryItems'] });
      setShowSearchDialog(false);
    } catch (error) {
      console.error("Error importing book:", error);
    }
  };

  const filteredItems = items.filter(item => {
    if (filterSubject !== "all" && item.subject_id !== filterSubject) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Library className="w-8 h-8 text-amber-500" />
            Biblioteca
          </h1>
          <p className="text-slate-400">Gerencie seus materiais de estudo e descubra novos livros</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Search className="w-4 h-4 mr-2" />
                Buscar Livro
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  Buscar Livros
                </DialogTitle>
              </DialogHeader>
              <LibrarySearch onImport={handleImport} subjects={subjects} />
            </DialogContent>
          </Dialog>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <Upload className="w-4 h-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Fazer Upload de Material</DialogTitle>
              </DialogHeader>
              <LibraryUpload 
                subjects={subjects} 
                onUploadComplete={() => {
                  setShowUploadDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['libraryItems'] });
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Filters & Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[200px] bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Filtrar por Matéria" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">Todas as Matérias</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-slate-500">
            {filteredItems.length} materiais encontrados
          </div>
        </div>

        <LibraryGrid 
          items={filteredItems} 
          onDelete={(id) => deleteMutation.mutate(id)} 
        />
      </motion.div>
    </div>
  );
}
