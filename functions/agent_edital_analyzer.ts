import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

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

    // Fetch the PDF content
    const pdfResponse = await fetch(file_url);
    if (!pdfResponse.ok) {
      return Response.json({ error: 'Failed to fetch PDF file' }, { status: 400 });
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Check file size (limit to ~10MB for base64)
    if (uint8Array.length > 10 * 1024 * 1024) {
      return Response.json({ error: 'PDF file too large. Maximum 10MB allowed.' }, { status: 400 });
    }
    
    // Convert to base64
    let pdfBase64 = '';
    const chunkSize = 32768;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      pdfBase64 += String.fromCharCode.apply(null, chunk);
    }
    pdfBase64 = btoa(pdfBase64);

    const escolaridadeLabel = escolaridade === 'medio' ? 'Nível Médio' : 
                              escolaridade === 'tecnico' ? 'Nível Técnico' : 
                              escolaridade === 'superior' ? 'Nível Superior' : 'Não especificado';

    const prompt = `Você é um AGENTE ESPECIALISTA em análise de editais de concursos públicos.
Sua missão é extrair com PRECISÃO CIRÚRGICA o conteúdo programático do edital fornecido.

DADOS DO CANDIDATO:
- Cargo: "${cargo || 'Não especificado'}"
- Escolaridade: ${escolaridadeLabel}

INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO:
1. IDENTIFIQUE O CARGO: Encontre o conteúdo programático ESPECÍFICO para o cargo mencionado. Ignorar outros cargos.
2. SEPARE AS MATÉRIAS: Classifique RIGOROSAMENTE as matérias em "Gerais" (Básicos) ou "Específicos".
   - Conhecimentos Gerais: Português, Raciocínio Lógico, Informática, Legislação Geral, etc.
   - Conhecimentos Específicos: Matérias técnicas e leis específicas do cargo.
3. EXTRAÇÃO DOS TÓPICOS: Copie os tópicos de cada matéria LITERALMENTE como estão no edital. Não resuma.
4. METADADOS: Se disponível, extraia peso, número de questões e nota mínima.

FORMATO DE SAÍDA ESTRUTURADO (JSON):
Retorne um objeto com a estrutura exata solicitada.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", file: { filename: "edital.pdf", file_data: `data:application/pdf;base64,${pdfBase64}` } }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "edital_analysis",
          schema: {
            type: "object",
            properties: {
              subjects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nome da matéria" },
                    category: { type: "string", enum: ["Gerais", "Específicos"], description: "Categoria da matéria" },
                    questions: { type: "number", description: "Número de questões (se houver)" },
                    weight: { type: "number", description: "Peso da matéria (se houver)" },
                    min_score: { type: "string", description: "Nota mínima (se houver)" },
                    topics: { type: "array", items: { type: "string" }, description: "Lista de tópicos" }
                  },
                  required: ["name", "topics", "category"]
                }
              },
              requirements: {
                type: "object",
                properties: {
                  formation: { type: "string" },
                  experience: { type: "string" }
                }
              },
              stages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" }
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
          }
        }
      }
    });

    const extractedData = JSON.parse(response.choices[0].message.content);
    return Response.json({ success: true, data: extractedData });

  } catch (error) {
    console.error("Error in agent_edital_analyzer:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
