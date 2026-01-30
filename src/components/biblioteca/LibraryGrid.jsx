import React from "react";
import { Button } from "@/components/ui/button";
import { Book, FileText, Link as LinkIcon, Download, ExternalLink, User, Calendar, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

export default function LibraryGrid({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 glass-card rounded-2xl">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
          <Book className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Sua biblioteca está vazia</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Faça upload de materiais ou pesquise na Open Library para começar a montar sua coleção de estudos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <div key={item.id} className="group glass-card rounded-xl overflow-hidden hover:border-slate-600 transition-all flex flex-col">
          <div className="relative h-48 bg-slate-800/50 flex items-center justify-center overflow-hidden">
            {item.cover_url ? (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                  style={{ backgroundImage: `url(${item.cover_url})` }}
                />
                <img 
                  src={item.cover_url} 
                  alt={item.title} 
                  className="relative h-40 w-auto shadow-xl rounded object-cover z-10"
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                {item.type === 'pdf' ? (
                  <FileText className="w-12 h-12" />
                ) : (
                  <Book className="w-12 h-12" />
                )}
              </div>
            )}
            
            {/* Type Badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur text-xs font-medium text-white uppercase">
              {item.type}
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-white mb-1 line-clamp-1" title={item.title}>{item.title}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <User className="w-3 h-3" />
              <span className="truncate">{item.author || "Autor desconhecido"}</span>
            </div>
            
            {item.description && (
              <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                {item.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-800/50">
              {item.file_url ? (
                <a 
                  href={item.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                    {item.source === 'upload' ? (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {item.source === 'google_books' ? 'Google Books' : item.source === 'big_book_api' ? 'BigBook' : 'Acessar'}
                      </>
                    )}
                  </Button>
                </a>
              ) : (
                <div className="flex-1 text-xs text-slate-500 italic text-center">
                  Sem link disponível
                </div>
              )}

              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => onDelete(item.id)}
                      className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
