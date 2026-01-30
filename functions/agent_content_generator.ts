import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// API Configurations
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Helper: Call OpenAI API (Primary)
async function callOpenAI(messages, jsonSchema = null) {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured.");
    }

    // Enhance system prompt for JSON
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "You are a helpful assistant.";
    const enhancedSystemPrompt = `${systemPrompt}\n\nCRITICAL: You MUST return strictly valid JSON. Do not include markdown formatting like \`\`\`json. Just the raw JSON object.\n${jsonSchema ? `Target Schema: ${JSON.stringify(jsonSchema)}` : ""}`;

    const requestMessages = [
        { role: "system", content: enhancedSystemPrompt },
        ...messages.filter(m => m.role !== 'system')
    ];

    console.log("Calling OpenAI (gpt-4o-mini)...");

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: requestMessages,
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI API Error:", response.status, err);
            // Check for quota exceeded or rate limits
            if (response.status === 429 || response.status === 402) {
                 throw new Error(`OpenAI Quota Exceeded/Rate Limit: ${response.status}`);
            }
            throw new Error(`OpenAI API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("Invalid response format from OpenAI");
        }
        return data.choices[0].message.content;
    } catch (e) {
        console.error("OpenAI Network/Fetch Error:", e.message);
        throw e;
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI");
    }
    return data.choices[0].message.content;
}

// Helper: Call DeepSeek API (Fallback)
async function callDeepSeek(messages, jsonSchema = null) {
    if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const systemPrompt = messages.find(m => m.role === 'system')?.content || "You are a helpful assistant.";
    const enhancedSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Output valid JSON only. No markdown.${jsonSchema ? `\nSchema: ${JSON.stringify(jsonSchema)}` : ""}`;

    const requestMessages = [
        { role: "system", content: enhancedSystemPrompt },
        ...messages.filter(m => m.role !== 'system')
    ];

    console.log("Calling DeepSeek (Fallback)...");

    const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: requestMessages,
            temperature: 0.3,
            max_tokens: 2048,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API Error:", response.status, errorText);
        throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Helper: Parse JSON safely with aggressive cleaning
function parseJSON(text) {
    if (!text) throw new Error("Empty response from AI");
    
    let clean = text.trim();
    
    // Remove markdown code blocks if present
    clean = clean.replace(/```json\s*/g, "").replace(/```/g, "");
    
    try {
        return JSON.parse(clean);
    } catch (e) {
        console.warn("JSON Parse Failed on first attempt:", e.message);
        // Try to extract the first {...} object
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e2) {}
        }
        console.error("Failed to parse content:", text);
        throw new Error("Failed to parse JSON from AI response.");
    }
}

Deno.serve(async (req) => {
    // Enable CORS for all responses
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    const errorResponse = (status, code, message, details = null) => {
        return Response.json({
            error: code,
            message: message,
            details: details,
            status: status
        }, { status, headers: corsHeaders });
    };

    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (req.method !== 'POST') {
            return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
        }

        const base44 = createClientFromRequest(req);
        
        // Auth check with try/catch to prevent crashes
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            console.error("Auth Error:", e);
            // Don't crash, just treat as unauthorized if needed, or allow if public
        }
        
        if (!user) {
            return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
        }

        const { action, topic, subject, existingTopics } = body;
        const topicName = topic?.name || "Tópico desconhecido";
        const subjectName = subject?.name || "Geral";

        console.log(`Processing action: ${action} for topic: ${topicName}`);

        let prompt = "";
        let jsonSchema = null;

        switch (action) {
            case "subdivide_topic":
                // Truncate very long topic names to avoid token limits or confusion
                const safeTopicName = topicName.length > 500 ? topicName.substring(0, 500) + "..." : topicName;
                prompt = `Divida o tópico "${safeTopicName}" da matéria "${subjectName}" em subtópicos menores.
Regras:
1. Gere entre 3 e 10 subtópicos.
2. Seja direto e objetivo.
3. Retorne APENAS JSON válido.
Exemplo: { "subtopics": [{ "name": "Introdução ao tema", "difficulty": "easy" }] }`;
                jsonSchema = { subtopics: [{ name: "string", difficulty: "string" }] };
                break;

            case "expand_topics":
                const existing = existingTopics?.map(t => t.name).join(", ") || "";
                prompt = `Liste novos tópicos para a matéria "${subjectName}".
Ignore estes já existentes: ${existing}.
Regras: Máximo 20 itens.
Retorne APENAS um objeto JSON com a chave "topics".
Exemplo: { "topics": [{ "name": "...", "difficulty": "medium" }] }`;
                jsonSchema = { topics: [{ name: "string", difficulty: "string" }] };
                break;

            case "study_content":
                prompt = `Crie conteúdo de estudo para "${topicName}".
Use Markdown para o texto. IMPORTANTE: Organize o conteúdo em 5-7 seções usando subtítulos H2 numerados (ex: ## 1. Introdução, ## 2. Conceitos, etc).
Retorne APENAS um objeto JSON.
Exemplo: { "content": "## 1. Introdução\nTexto...\n\n## 2. Conceitos\nTexto...", "key_concepts": ["..."], "common_mistakes": ["..."], "exam_tips": ["..."] }`;
                jsonSchema = { content: "string", key_concepts: [], common_mistakes: [], exam_tips: [] };
                break;

            case "summary":
                prompt = `Resumo conciso de "${topicName}".
Retorne APENAS um objeto JSON.
Exemplo: { "summary": "## Resumo...", "key_points": ["..."] }`;
                jsonSchema = { summary: "string", key_points: [] };
                break;

            case "flashcards":
                prompt = `5 Flashcards para "${topicName}".
Retorne APENAS um objeto JSON.
Exemplo: { "flashcards": [{ "front": "Pergunta...", "back": "Resposta..." }] }`;
                jsonSchema = { flashcards: [{ front: "string", back: "string" }] };
                break;

            case "essay":
                prompt = `Proposta de redação sobre "${topicName}".
Retorne APENAS um objeto JSON.
Exemplo: { "title": "...", "theme": "...", "description": "...", "motivating_texts": [], "instructions": "..." }`;
                jsonSchema = { title: "string", theme: "string", instructions: "string" };
                break;

            case "mindmap":
                prompt = `Estrutura de mapa mental para "${topicName}".
Retorne APENAS um objeto JSON com a chave "nodes".
Exemplo: { "nodes": [{ "text": "Raiz", "isRoot": true }, { "text": "Filho", "isRoot": false, "children": [] }] }`;
                jsonSchema = { nodes: [{ text: "string", isRoot: true, children: [] }] };
                break;

            default:
                return errorResponse(400, 'INVALID_ACTION', `Action '${action}' not supported`);
        }

        const messages = [
            { role: "system", content: "You are a helpful study assistant. You output strictly valid JSON." },
            { role: "user", content: prompt }
        ];

        let aiContent;
        let provider = "OpenAI";

        try {
            // PRIMARY: OpenAI
            aiContent = await callOpenAI(messages, jsonSchema);
        } catch (openaiError) {
            console.error("OpenAI failed:", openaiError);
            
            // Check if error is related to quota or billing
            if (openaiError.message && (openaiError.message.includes("429") || openaiError.message.includes("402") || openaiError.message.includes("insufficient_quota"))) {
                 console.log("OpenAI quota exceeded, trying DeepSeek fallback immediately.");
                 // Fallback to DeepSeek
                 try {
                    provider = "DeepSeek";
                    aiContent = await callDeepSeek(messages, jsonSchema);
                 } catch (deepseekError) {
                    console.error("DeepSeek failed:", deepseekError);
                    const errorMessage = JSON.stringify({
                        openai: openaiError.message || String(openaiError),
                        deepseek: deepseekError.message || String(deepseekError)
                    });
                    return errorResponse(500, 'AI_SERVICE_ERROR', `Both AIs failed. Check your API Keys/Credits. Details: ${errorMessage}`);
                 }
            } else {
                // Other OpenAI errors
                 try {
                    provider = "DeepSeek";
                    aiContent = await callDeepSeek(messages, jsonSchema);
                 } catch (deepseekError) {
                    console.error("DeepSeek failed:", deepseekError);
                    const errorMessage = JSON.stringify({
                        openai: openaiError.message || String(openaiError),
                        deepseek: deepseekError.message || String(deepseekError)
                    });
                    return errorResponse(500, 'AI_SERVICE_ERROR', `AI Error: ${errorMessage}`);
                 }
            }
        }

        let result;
        try {
            result = parseJSON(aiContent);
        } catch (e) {
            console.error("JSON Parse Error on content:", aiContent);
            return errorResponse(422, 'INVALID_AI_OUTPUT', 'AI returned invalid JSON', { content: aiContent, provider });
        }

        // Post-processing for Mindmap
        if (action === "mindmap" && result.nodes) {
             const nodes = [];
             const connections = [];
             const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];
             
             const rawNodes = Array.isArray(result.nodes) ? result.nodes : [];
             const root = rawNodes.find(n => n.isRoot) || rawNodes[0];
             
             if (root) {
                 nodes.push({ id: "root", text: root.text, x: 400, y: 300, color: "#f59e0b", isRoot: true });
                 
                 const children = rawNodes.filter(n => n !== root);
                 children.forEach((child, i) => {
                     const angle = (2 * Math.PI * i) / children.length;
                     const x = 400 + Math.cos(angle) * 200;
                     const y = 300 + Math.sin(angle) * 200;
                     const id = `node-${i}`;
                     
                     nodes.push({ id, text: child.text, x, y, color: colors[i % colors.length] });
                     connections.push({ id: `c-${i}`, from: "root", to: id });
                     
                     if (Array.isArray(child.children)) {
                         child.children.forEach((sub, j) => {
                             const subId = `${id}-${j}`;
                             nodes.push({ 
                                 id: subId, 
                                 text: sub, 
                                 x: x + (Math.random() * 60 - 30), 
                                 y: y + (Math.random() * 60 + 30),
                                 color: colors[i % colors.length]
                             });
                             connections.push({ id: `c-${i}-${j}`, from: id, to: subId });
                         });
                     }
                 });
                 return Response.json({ nodes, connections }, { headers: corsHeaders });
             }
        }

        return Response.json(result, { headers: corsHeaders });

    } catch (error) {
        console.error("CRITICAL SERVER ERROR:", error);
        return errorResponse(500, 'INTERNAL_ERROR', error.message, { stack: error.stack });
    }
});
