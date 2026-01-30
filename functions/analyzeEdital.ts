import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, cargo, escolaridade } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const escolaridadeLabel = escolaridade === 'medio' ? 'Nível Médio' : 
                              escolaridade === 'tecnico' ? 'Nível Técnico' : 
                              escolaridade === 'superior' ? 'Nível Superior' : 'Não especificado';

    const prompt = `Você é um especialista em análise de editais de concursos públicos brasileiros.
Sua missão crítica é extrair o CONTEÚDO PROGRAMÁTICO (Matérias e Tópicos) do edital para o cargo de: "${cargo || 'Não especificado'}" (${escolaridadeLabel}).

*** INSTRUÇÕES DE LEITURA (MUITO IMPORTANTE) ***
1. LOCALIZAÇÃO: O conteúdo programático (syllabus) está quase sempre nos ANEXOS FINAIS do documento (Anexo I, II, etc.).
   - Pule as seções iniciais de regras, inscrições e isenção.
   - VÁ DIRETAMENTE PARA O FIM DO ARQUIVO analisar os anexos.

2. FILTRAGEM DE CARGO:
   - O edital pode conter muitos cargos. IDENTIFIQUE APENAS O CARGO: "${cargo}".
   - Se houver "Conhecimentos Gerais" (comum a todos) e "Conhecimentos Específicos" (por cargo), EXTRAIA AMBOS.
   - NÃO extraia matérias de outros cargos (ex: se é Auditor, ignore matérias de Técnico).

3. ESTRUTURAÇÃO:
   - Para cada matéria (ex: Português, Direito Constitucional, Conhecimentos Específicos), liste TODOS os tópicos detalhadamente.
   - Se "Conhecimentos Específicos" for apresentado como um bloco, tente separar em sub-matérias se houver títulos claros (ex: Direito Administrativo, AFO). Caso contrário, mantenha como uma matéria "Conhecimentos Específicos" com todos os tópicos.

4. DADOS ADICIONAIS:
   - Extraia também o salário, vagas, etapas e datas importantes.

Seja minucioso. O aluno depende dessa extração para estudar.`;

    const jsonSchema = {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome da matéria (ex: Língua Portuguesa, Direito Constitucional)" },
              questions: { type: "number" },
              weight: { type: "number" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              min_score: { type: "string" },
              topics: {
                type: "array",
                items: { type: "string", description: "Tópico detalhado do edital" }
              }
            },
            required: ["name", "topics"]
          }
        },
        requirements: {
          type: "object",
          properties: {
            formation: { type: "string" },
            experience: { type: "string" },
            other: { type: "array", items: { type: "string" } }
          }
        },
        evaluation_criteria: {
          type: "object",
          properties: {
            total_questions: { type: "number" },
            min_score: { type: "string" },
            passing_criteria: { type: "string" }
          }
        },
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              character: { type: "string" },
              description: { type: "string" },
              weight: { type: "number" }
            }
          }
        },
        important_dates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              description: { type: "string" }
            }
          }
        },
        salary: { type: "string" },
        vacancies: { type: "number" }
      },
      required: ["subjects"]
    };

    // Use Base44 Integration which handles file extraction and LLM processing optimized for this
    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: jsonSchema,
      add_context_from_internet: false
    });

    return Response.json({ success: true, data: extractedData });
  } catch (error) {
    console.error("Error analyzing edital:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
