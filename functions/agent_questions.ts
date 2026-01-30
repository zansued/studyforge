import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function callOpenAI(messages, jsonSchema = null) {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "You are a helpful assistant.";
    const enhancedSystemPrompt = `${systemPrompt}\n\nCRITICAL: You MUST return strictly valid JSON. Do not include markdown formatting like \`\`\`json. Just the raw JSON object.\n${jsonSchema ? `Target Schema: ${JSON.stringify(jsonSchema)}` : ""}`;
    const requestMessages = [{ role: "system", content: enhancedSystemPrompt }, ...messages.filter(m => m.role !== 'system')];

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ model: "gpt-4o-mini", messages: requestMessages, temperature: 0.3, max_tokens: 2048, response_format: { type: "json_object" } })
        });
        if (!response.ok) {
            const err = await response.text();
            if (response.status === 429 || response.status === 402) throw new Error(`OpenAI Quota Exceeded`);
            throw new Error(`OpenAI API Error: ${response.status} - ${err}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) { throw e; }
}

async function callDeepSeek(messages, jsonSchema = null) {
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "You are a helpful assistant.";
    const enhancedSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Output valid JSON only. No markdown.${jsonSchema ? `\nSchema: ${JSON.stringify(jsonSchema)}` : ""}`;
    const requestMessages = [{ role: "system", content: enhancedSystemPrompt }, ...messages.filter(m => m.role !== 'system')];

    const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: "deepseek-chat", messages: requestMessages, temperature: 0.3, max_tokens: 2048, response_format: { type: "json_object" } })
    });
    if (!response.ok) { const errorText = await response.text(); throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`); }
    const data = await response.json();
    return data.choices[0].message.content;
}

function parseJSON(text) {
    if (!text) throw new Error("Empty response from AI");
    let clean = text.trim().replace(/```json\s*/g, "").replace(/```/g, "");
    try { return JSON.parse(clean); } catch (e) {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) { try { return JSON.parse(match[0]); } catch (e2) {} }
        throw new Error("Failed to parse JSON from AI response.");
    }
}

Deno.serve(async (req) => {
    const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

        const body = await req.json();
        const { action, topic } = body;
        const topicName = topic?.name || "Tópico desconhecido";

        let prompt = "";
        let jsonSchema = null;

        if (action === "flashcards") {
            prompt = `5 Flashcards para "${topicName}".
Retorne APENAS um objeto JSON.
Exemplo: { "flashcards": [{ "front": "Pergunta...", "back": "Resposta..." }] }`;
            jsonSchema = { flashcards: [{ front: "string", back: "string" }] };
        } else {
            return Response.json({ error: "Invalid action" }, { status: 400, headers: corsHeaders });
        }

        const messages = [{ role: "system", content: "You are a helpful study assistant. You output strictly valid JSON." }, { role: "user", content: prompt }];

        let aiContent;
        try {
            aiContent = await callOpenAI(messages, jsonSchema);
        } catch (openaiError) {
            console.log("OpenAI failed, trying DeepSeek fallback.");
            aiContent = await callDeepSeek(messages, jsonSchema);
        }

        const result = parseJSON(aiContent);
        return Response.json(result, { headers: corsHeaders });

    } catch (error) {
        console.error("Error:", error);
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
});
