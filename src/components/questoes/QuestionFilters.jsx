import React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function QuestionFilters({ 
  filters, 
  onFiltersChange, 
  subjects = [],
  topics = []
}) {
  const filteredTopics = filters.subject_id 
    ? topics.filter(t => t.subject_id === filters.subject_id)
    : topics;

  const hasActiveFilters = filters.search || filters.subject_id || filters.topic_id || filters.difficulty;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      subject_id: "",
      topic_id: "",
      difficulty: ""
    });
  };

  return (
    <div className="glass-card rounded-2xl p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Buscar questões..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        {/* Subject Filter */}
        <Select
          value={filters.subject_id || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, subject_id: value === "all" ? "" : value, topic_id: "" })}
        >
          <SelectTrigger className="w-full lg:w-48 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Matéria" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todas</SelectItem>
            {subjects.map(subject => (
              <SelectItem key={subject.id} value={subject.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color || '#f59e0b' }} />
                  {subject.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Topic Filter */}
        <Select
          value={filters.topic_id || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, topic_id: value === "all" ? "" : value })}
          disabled={!filters.subject_id}
        >
          <SelectTrigger className="w-full lg:w-48 bg-slate-800/50 border-slate-700 text-white disabled:opacity-50">
            <SelectValue placeholder="Tópico" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
            <SelectItem value="all">Todos</SelectItem>
            {filteredTopics.map(topic => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty Filter */}
        <Select
          value={filters.difficulty || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, difficulty: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-full lg:w-36 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="easy">Fácil</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="hard">Difícil</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
