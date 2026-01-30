import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function LibraryUpload({ onUploadComplete, subjects }) {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    subject_id: "",
    type: "pdf"
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename if empty
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: selectedFile.name.replace(/\.[^/.]+$/, "") // Remove extension
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.title) return;

    setIsUploading(true);
    try {
      // 1. Upload File
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: file
      });
      const fileUrl = uploadRes.file_url;

      // 2. Create Library Item
      await base44.entities.LibraryItem.create({
        ...formData,
        file_url: fileUrl,
        source: "upload",
        tags: [] // Can add tag input later
      });

      // Reset form
      setFile(null);
      setFormData({
        title: "",
        author: "",
        description: "",
        subject_id: "",
        type: "pdf"
      });

      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:bg-slate-800/30 transition-colors">
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFile(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remover
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input 
                  type="file" 
                  accept=".pdf,.epub" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-300">Clique para selecionar</p>
                    <p className="text-xs text-slate-500">PDF ou EPUB até 50MB</p>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Título do Material *"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
            className="bg-slate-950/50 border-slate-800 text-white"
          />
          <Input
            placeholder="Autor (opcional)"
            value={formData.author}
            onChange={(e) => setFormData({...formData, author: e.target.value})}
            className="bg-slate-950/50 border-slate-800 text-white"
          />
          <Select 
            value={formData.subject_id} 
            onValueChange={(val) => setFormData({...formData, subject_id: val})}
          >
            <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
              <SelectValue placeholder="Matéria Relacionada" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {subjects?.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Descrição breve..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="bg-slate-950/50 border-slate-800 text-white h-24 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          type="submit" 
          disabled={isUploading || !file || !formData.title}
          className="bg-amber-500 hover:bg-amber-600 text-white w-full md:w-auto"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
