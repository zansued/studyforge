import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = await req.json();

    const prompt = `Você é um COACH DE ALTA PERFORMANCE para concursos públicos.
O usuário precisa de motivação e dicas sobre: "${category}".

Sua resposta deve ser:
1. Inspiradora e Energética.
2. Prática (nada de conselhos vagos).
3. Focada na mentalidade de aprovação.

Gere 5 dicas matadoras.`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "Responda APENAS com JSON válido: { tips: [{ title, content, actionable }] }. Sem texto adicional." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return Response.json(result);

  } catch (error) {
    console.error("Error in agent_coach:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
