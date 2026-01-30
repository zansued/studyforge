import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  BookOpen,
  Scale,
  Zap,
  Award,
  Target,
  AlertTriangle,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const sectionIcons = {
  '1': BookOpen,
  '2': Scale,
  '3': Zap,
  '4': Award,
  '5': Target,
  '6': AlertTriangle,
  '7': Bookmark,
};

const sectionColors = {
  '1': { bg: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/30", icon: "text-blue-400", badge: "bg-blue-500/20 text-blue-400" },
  '2': { bg: "from-purple-500/20 to-purple-600/10", border: "border-purple-500/30", icon: "text-purple-400", badge: "bg-purple-500/20 text-purple-400" },
  '3': { bg: "from-amber-500/20 to-orange-600/10", border: "border-amber-500/30", icon: "text-amber-400", badge: "bg-amber-500/20 text-amber-400" },
  '4': { bg: "from-green-500/20 to-emerald-600/10", border: "border-green-500/30", icon: "text-green-400", badge: "bg-green-500/20 text-green-400" },
  '5': { bg: "from-cyan-500/20 to-teal-600/10", border: "border-cyan-500/30", icon: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-400" },
  '6': { bg: "from-red-500/20 to-rose-600/10", border: "border-red-500/30", icon: "text-red-400", badge: "bg-red-500/20 text-red-400" },
  '7': { bg: "from-pink-500/20 to-fuchsia-600/10", border: "border-pink-500/30", icon: "text-pink-400", badge: "bg-pink-500/20 text-pink-400" },
};

function parseContentToSections(content) {
  if (!content) return [];
  
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];
  let autoNumber = 1;

  for (const line of lines) {
    // Match ## Number. Title OR ## Title
    const h2Match = line.match(/^##\s+(?:(\d+)\.\s*)?(.+)/);
    if (h2Match) {
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim()
        });
      }
      
      const capturedNumber = h2Match[1];
      const title = h2Match[2].trim();
      
      currentSection = {
        number: capturedNumber || String(autoNumber++),
        title: title,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      ...currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  return sections;
}

function SectionCard({ section, topicName, onExpand, onSave }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transformedContent, setTransformedContent] = useState(null);
  const [transformationType, setTransformationType] = useState(null);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      // Downgrade any H1/H2 headers (# or ##) to H3 (###) to prevent breaking section structure
      const sanitizedContent = transformedContent
        ? transformedContent.replace(/^#\s/gm, '### ').replace(/^##\s/gm, '### ')
        : transformedContent;

      await onSave(sanitizedContent);
      setTransformedContent(null);
      setTransformationType(null);
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const num = section.number || '1';
  const colors = sectionColors[num] || sectionColors['1'];
  const Icon = sectionIcons[num] || BookOpen;

  const handleTransform = async (type) => {
    setIsProcessing(true);
    setTransformationType(type);
    
    const prompts = {
      deepen: `Você é um professor especialista em concursos públicos.

TÓPICO PRINCIPAL: ${topicName}
SEÇÃO: ${section.title}

CONTEÚDO ATUAL:
${section.content}

TAREFA: Expanda e aprofunde SIGNIFICATIVAMENTE este conteúdo. Adicione:
1. **Mais detalhes teóricos** - Explicações completas e nuances
2. **Exemplos práticos** - Casos reais e aplicações
3. **Jurisprudência/Doutrina** - Posicionamentos relevantes (se aplicável)
4. **Conexões com outros temas** - Relações com outras matérias
5. **Questões típicas** - Como é cobrado em concursos
6. **Macetes e memorização** - Técnicas para fixar
7. **Pegadinhas comuns** - Armadilhas em provas

Use formatação Markdown rica. Seja MUITO mais detalhado. Use ### para subtítulos (evite # ou ##).`,

      summarize: `Você é um especialista em síntese de conteúdo para concursos.

TÓPICO PRINCIPAL: ${topicName}
SEÇÃO: ${section.title}

CONTEÚDO ATUAL:
${section.content}

TAREFA: Crie um RESUMO ENXUTO E OBJETIVO deste conteúdo.
- Mantenha apenas os pontos ESSENCIAIS
- Use listas e bullets para facilitar revisão rápida
- Destaque conceitos-chave em **negrito**
- Máximo 40% do tamanho original
- Ideal para revisão de véspera de prova

Use formatação Markdown clara e organizada.`,

      simplify: `Você é um professor que explica conceitos de forma simples e acessível.

TÓPICO PRINCIPAL: ${topicName}
SEÇÃO: ${section.title}

CONTEÚDO ATUAL:
${section.content}

TAREFA: Reescreva o conteúdo usando LINGUAGEM MAIS SIMPLES E ACESSÍVEL.
- Use palavras do dia a dia (evite termos técnicos complexos)
- Quando usar termo técnico, explique em seguida
- Use analogias e comparações com situações cotidianas
- Divida frases longas em frases curtas
- Mantenha o conteúdo completo, mas fácil de entender

Use formatação Markdown. Seja didático e claro.`,

      visual: `Você é um especialista em ensino visual para concursos.

TÓPICO PRINCIPAL: ${topicName}
SEÇÃO: ${section.title}

CONTEÚDO ATUAL:
${section.content}

TAREFA: Transforme o conteúdo em formato VISUAL E ESQUEMATIZADO.
- Use **tabelas comparativas** quando possível
- Crie **listas organizadas** com hierarquia clara
- Use **diagramas em texto** (fluxos, processos)
- Destaque relações com **➜ → ↔ ⚡**
- Use **emojis** para categorizar: ✅ ❌ ⚠️ 📌 💡
- Organize em **blocos visuais** com títulos claros
- Use > citações para destaques importantes

Formate tudo em Markdown rico. Priorize clareza visual.`
    };

    try {
      const response = await base44.functions.invoke('agent_notes', {
        prompt: prompts[type]
      });
      const result = response.data;
      
      setTransformedContent(result.transformed_content);
    } catch (error) {
      console.error("Error transforming content:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl overflow-hidden border ${colors.border}`}
    >
      {/* Card Header */}
      <div 
        className={`p-5 bg-gradient-to-r ${colors.bg} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} mb-1 inline-block`}>
                Seção {section.number}
              </span>
              <h3 className="text-lg font-bold text-white">{section.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {transformedContent && transformationType && (
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                {transformationType === 'deepen' && 'Aprofundado'}
                {transformationType === 'summarize' && 'Resumido'}
                {transformationType === 'simplify' && 'Simplificado'}
                {transformationType === 'visual' && 'Visual'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 border-t border-slate-700/50">
              {/* Original Content */}
              <div className="prose prose-invert prose-sm max-w-none 
                prose-headings:text-amber-400 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                prose-h3:text-base prose-h4:text-sm
                prose-strong:text-amber-300 prose-strong:font-semibold
                prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                prose-ul:my-3 prose-ul:list-none prose-ul:space-y-2
                prose-ol:my-3 prose-ol:space-y-2 prose-ol:list-none prose-ol:counter-reset-item
                prose-li:text-slate-300 prose-li:pl-0
                prose-li:before:content-[''] prose-li:before:inline-block prose-li:before:w-1.5 prose-li:before:h-1.5 prose-li:before:rounded-full prose-li:before:bg-amber-500 prose-li:before:mr-3 prose-li:before:align-middle
                prose-code:text-amber-400 prose-code:bg-amber-500/10 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-blockquote:border-0 prose-blockquote:pl-0 prose-blockquote:not-italic
                prose-hr:border-slate-700/50 prose-hr:my-6
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    blockquote: ({node, ...props}) => (
                      <blockquote className="my-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-l-4 border-amber-500" {...props}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Bookmark className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 text-amber-100">{props.children}</div>
                        </div>
                      </blockquote>
                    ),
                    table: ({node, ...props}) => (
                      <div className="my-6 overflow-x-auto rounded-xl border border-slate-700/50">
                        <table className="w-full text-sm" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => (
                      <thead className="bg-slate-800/50" {...props} />
                    ),
                    tbody: ({node, ...props}) => (
                      <tbody className="divide-y divide-slate-700/30" {...props} />
                    ),
                    tr: ({node, ...props}) => (
                      <tr className="hover:bg-slate-800/30 transition-colors" {...props} />
                    ),
                    th: ({node, ...props}) => (
                      <th className="px-4 py-3 text-left font-semibold text-amber-400 border-b border-slate-700/50" {...props} />
                    ),
                    td: ({node, ...props}) => (
                      <td className="px-4 py-3 text-slate-300" {...props} />
                    ),
                    ul: ({node, ...props}) => (
                      <ul className="space-y-2 my-4" {...props} />
                    ),
                    ol: ({node, children, ...props}) => (
                      <ol className="space-y-2 my-4" {...props}>
                        {React.Children.map(children, (child, index) => {
                          if (child?.type === 'li') {
                            return React.cloneElement(child, {
                              ...child.props,
                              'data-number': index + 1
                            });
                          }
                          return child;
                        })}
                      </ol>
                    ),
                    li: ({node, children, 'data-number': dataNumber, ...props}) => {
                      const isOrderedList = node?.position?.start?.column && dataNumber;
                      return (
                        <li className={`flex items-start gap-3 ${isOrderedList ? 'pl-0' : ''}`} {...props}>
                          {isOrderedList ? (
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                              {dataNumber}
                            </span>
                          ) : (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2" />
                          )}
                          <span className="flex-1">{children}</span>
                        </li>
                      );
                    },
                    h3: ({node, ...props}) => (
                      <h3 className="flex items-center gap-2 text-amber-400 font-bold text-base mt-6 mb-3" {...props}>
                        <span className="w-1 h-5 bg-amber-500 rounded-full" />
                        {props.children}
                      </h3>
                    ),
                    h4: ({node, ...props}) => (
                      <h4 className="flex items-center gap-2 text-amber-300 font-semibold text-sm mt-4 mb-2" {...props}>
                        <span className="w-1 h-4 bg-amber-400 rounded-full" />
                        {props.children}
                      </h4>
                    ),
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>

              {/* Transformed Content */}
              {transformedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-slate-700/50"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">
                      {transformationType === 'deepen' && 'Conteúdo Aprofundado'}
                      {transformationType === 'summarize' && 'Resumo'}
                      {transformationType === 'simplify' && 'Versão Simplificada'}
                      {transformationType === 'visual' && 'Versão Visual'}
                    </span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none 
                    prose-headings:text-purple-400 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                    prose-h3:text-base prose-h4:text-sm
                    prose-strong:text-purple-300 prose-strong:font-semibold
                    prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                    prose-ul:my-3 prose-ul:list-none prose-ul:space-y-2
                    prose-ol:my-3 prose-ol:space-y-2
                    prose-li:text-slate-300 prose-li:pl-0
                    prose-code:text-purple-400 prose-code:bg-purple-500/10 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                    prose-blockquote:border-0 prose-blockquote:pl-0 prose-blockquote:not-italic
                    prose-hr:border-slate-700/50 prose-hr:my-6
                    p-4 rounded-xl bg-purple-500/5 border border-purple-500/20
                  ">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        blockquote: ({node, ...props}) => (
                          <blockquote className="my-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/5 border-l-4 border-purple-500" {...props}>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Bookmark className="w-4 h-4 text-purple-400" />
                              </div>
                              <div className="flex-1 text-purple-100">{props.children}</div>
                            </div>
                          </blockquote>
                        ),
                        table: ({node, ...props}) => (
                          <div className="my-6 overflow-x-auto rounded-xl border border-purple-700/50">
                            <table className="w-full text-sm" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => (
                          <thead className="bg-purple-900/30" {...props} />
                        ),
                        tbody: ({node, ...props}) => (
                          <tbody className="divide-y divide-purple-700/30" {...props} />
                        ),
                        tr: ({node, ...props}) => (
                          <tr className="hover:bg-purple-800/20 transition-colors" {...props} />
                        ),
                        th: ({node, ...props}) => (
                          <th className="px-4 py-3 text-left font-semibold text-purple-300 border-b border-purple-700/50" {...props} />
                        ),
                        td: ({node, ...props}) => (
                          <td className="px-4 py-3 text-slate-300" {...props} />
                        ),
                        ul: ({node, ...props}) => (
                          <ul className="space-y-2 my-4" {...props} />
                        ),
                        ol: ({node, children, ...props}) => (
                          <ol className="space-y-2 my-4" {...props}>
                            {React.Children.map(children, (child, index) => {
                              if (child?.type === 'li') {
                                return React.cloneElement(child, {
                                  ...child.props,
                                  'data-number': index + 1
                                });
                              }
                              return child;
                            })}
                          </ol>
                        ),
                        li: ({node, children, 'data-number': dataNumber, ...props}) => {
                          const isOrderedList = node?.position?.start?.column && dataNumber;
                          return (
                            <li className={`flex items-start gap-3 ${isOrderedList ? 'pl-0' : ''}`} {...props}>
                              {isOrderedList ? (
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                                  {dataNumber}
                                </span>
                              ) : (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-2" />
                              )}
                              <span className="flex-1">{children}</span>
                            </li>
                          );
                        },
                        h3: ({node, ...props}) => (
                          <h3 className="flex items-center gap-2 text-purple-400 font-bold text-base mt-6 mb-3" {...props}>
                            <span className="w-1 h-5 bg-purple-500 rounded-full" />
                            {props.children}
                          </h3>
                        ),
                        h4: ({node, ...props}) => (
                          <h4 className="flex items-center gap-2 text-purple-300 font-semibold text-sm mt-4 mb-2" {...props}>
                            <span className="w-1 h-4 bg-purple-400 rounded-full" />
                            {props.children}
                          </h4>
                        ),
                      }}
                    >
                      {transformedContent}
                      </ReactMarkdown>
                      </div>

                      {onSave && (
                      <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Substituir Conteúdo Original
                          </>
                        )}
                      </Button>
                      </div>
                      )}
                      </motion.div>
                      )}

              {/* Transform Actions */}
              <div className="mt-6 pt-4 border-t border-slate-700/30">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 rounded-xl py-3 h-auto"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando com IA...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Transformar Conteúdo com IA
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => handleTransform('deepen')}
                      className="text-white hover:bg-slate-700 cursor-pointer py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Plus className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Aprofundar</p>
                          <p className="text-xs text-slate-400">Adiciona detalhes e exemplos</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTransform('summarize')}
                      className="text-white hover:bg-slate-700 cursor-pointer py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Target className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Resumir</p>
                          <p className="text-xs text-slate-400">Versão enxuta dos pontos-chave</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTransform('simplify')}
                      className="text-white hover:bg-slate-700 cursor-pointer py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Zap className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Simplificar</p>
                          <p className="text-xs text-slate-400">Linguagem mais fácil e didática</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTransform('visual')}
                      className="text-white hover:bg-slate-700 cursor-pointer py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Award className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Tornar Visual</p>
                          <p className="text-xs text-slate-400">Tabelas, listas e esquemas</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StudyContentCards({ content, topicName, onContentUpdate }) {
  const sections = parseContentToSections(content);

  const handleSectionSave = (index, newSectionContent) => {
    if (!onContentUpdate) return;
    
    // Reconstruct full content with the updated section
    // We preserve the "## Number. Title" format
    const newFullContent = sections.map((s, i) => {
      const contentToUse = i === index ? newSectionContent : s.content;
      return `## ${s.number}. ${s.title}\n\n${contentToUse}`;
    }).join('\n\n');
    
    return onContentUpdate(newFullContent);
  };

  if (sections.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <SectionCard
          key={index}
          section={section}
          topicName={topicName}
          onSave={onContentUpdate ? (newContent) => handleSectionSave(index, newContent) : undefined}
        />
      ))}
    </div>
  );
}
