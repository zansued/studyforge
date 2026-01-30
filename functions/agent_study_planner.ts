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

    const { edital, subjects, cycleType, additionalInfo, customDate } = await req.json();

    const examDate = customDate ? new Date(customDate) : new Date(edital.exam_date);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    const isShortTerm = daysUntilExam <= 30;
    const isEmergency = daysUntilExam <= 14;

    const prompt = `Você é um COACH DE ESTUDOS DE ELITE especializado em concursos públicos (ex: estratégia de "Reta Final").
Sua missão é criar um plano de estudos REALISTA e ALTAMENTE EFICIENTE.

=== CENÁRIO ATUAL ===
- Concurso: ${edital.title}
- Data da Prova: ${examDate.toLocaleDateString('pt-BR')}
- Tempo Restante: ${daysUntilExam} dias.
- Estratégia Necessária: ${isEmergency ? "RETA FINAL / SOBREVIVÊNCIA (Extremamente Focado)" : isShortTerm ? "INTENSIVO (Aceleração)" : "REGULAR (Consistência)"}
- Tipo de Ciclo: ${cycleType}

=== INFORMAÇÕES ADICIONAIS DO ALUNO (CRUCIAL) ===
${additionalInfo ? additionalInfo : "Nenhuma informação adicional."}

=== REGRAS DE OURO (NÃO QUEBRE) ===
1. **REALISMO TOTAL**: NUNCA agende mais que 8 horas líquidas de estudo por dia (a menos que seja um robô, o aluno falhará).
   - Se faltam poucos dias, NÃO TENTE cobrir tudo. SELECIONE o que mais cai (Pareto 80/20).
   - É melhor estudar bem 50% do edital (o que tem mais peso) do que ler 100% correndo e não lembrar de nada.

2. **PRIORIZAÇÃO IMPIEDOSA**:
   - Matérias com peso alto/muitas questões = FOCO TOTAL.
   - Matérias com peso baixo = Apenas revisão rápida ou resolução de questões (ou IGNORE se estiver em modo de emergência).
   - Se faltam < 10 dias: Foco quase total em REVISÃO, QUESTÕES e LEI SECA. Nada de teoria nova complexa.

3. **TÉCNICAS DE ESTUDO (INCLUA NAS DICAS)**:
   - Use "Estudo Reverso" (começar por questões) para matérias que o aluno já tem base.
   - Use "Pomodoro" (50min/10min).
   - Use "Active Recall" (Revisão Ativa) em vez de releitura passiva.

4. **ESTRUTURA DO PLANO**:
   - Divida o dia em blocos de matérias variadas (ex: 1h Exatas + 1h Direito + 1h Língua).
   - Alterne hemisférios cerebrais (Cálculo vs Leitura).
   - Sempre inclua um bloco de "Revisão Geral" ou "Bateria de Questões" no final do dia.

=== DADOS DAS MATÉRIAS ===
${JSON.stringify(subjects.map(s => ({ 
  name: s.name, 
  weight: s.weight, 
  priority: s.priority,
  topics_count: s.topics_count 
})))}

Gere um plano JSON estruturado que salve a vida desse candidato.`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "Você é um assistente de planejamento de estudos. Responda APENAS com JSON válido, sem texto adicional." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const plan = JSON.parse(response.choices[0].message.content);
    return Response.json(plan);

  } catch (error) {
    console.error("Error in agent_study_planner:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
