import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Book, ExternalLink, Plus, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function LibrarySearch({ onImport, subjects }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [quota, setQuota] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("all");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await base44.functions.invoke("searchBooks", { query });
      setResults(response.data.items || []);
      if (response.data.bigBookQuota) {
        setQuota(response.data.bigBookQuota);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquise por título, autor ou assunto..."
              className="pl-10 bg-slate-950/50 border-slate-800 text-white"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pesquisar"}
          </Button>
        </form>
        
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm text-slate-400">Importar para:</span>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-900/50 border-slate-800 text-white">
              <SelectValue placeholder="Selecione uma matéria..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">Sem matéria vinculada</SelectItem>
              {subjects?.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {quota && (
          <div className="flex justify-end px-1">
            <span className="text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full border border-slate-800">
              BigBook API: <span className={quota.left < 5 ? "text-red-400" : "text-green-400"}>{quota.left}</span>/{quota.limit} restantes hoje
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((book) => (
              <div key={book.external_id} className="flex gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="w-20 h-28 shrink-0 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <Book className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-semibold text-white line-clamp-2">{book.title}</h3>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      book.source === 'google_books' ? 'bg-blue-500/20 text-blue-400' : 
                      book.source === 'big_book_api' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {book.source === 'google_books' ? 'Google' : book.source === 'big_book_api' ? 'BigBook' : 'OpenLib'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{book.author} • {book.year}</p>
                  
                  {book.subjects && book.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-auto">
                      {book.subjects.slice(0, 2).map((subj, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {subj}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    size="sm" 
                    onClick={() => onImport(book, selectedSubject === "all" ? null : selectedSubject)}
                    className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Adicionar {selectedSubject !== "all" ? "à Matéria" : "à Biblioteca"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-12 text-slate-500">
            Nenhum livro encontrado para "{query}"
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Explore Livros Online</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              Pesquise livros na Open Library, Google Books e Big Book API e adicione-os à sua coleção de estudos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
