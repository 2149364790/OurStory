import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
    if (!deepseekApiKey) {
      throw new Error("后端未配置 DEEPSEEK_API_KEY 环境变量，请在 Supabase 控制台进行配置。");
    }

    const { logs, observations, currentDate, role, messages } = await req.json();
    const isPrincess = role === "princess";

    // ── AI 问答助手模式 (Chat Mode) ──────────────────────────────────
    if (messages && messages.length > 0) {
      const systemPromptChat = isPrincess
        ? `你是一个贴心懂女生的生理健康管理与温和保养专家。
你的任务是协助女生解答生理期期间遇到的各种疑问，提供科学、温柔、包容且实用的自爱建议（如痛经缓解、保暖、饮食调理等）。
你的语气要极其温柔亲切，以“你”称呼对方。多用“亲爱的”、“抱抱你”、“小公主”。给出明确、可实操的具体行动方法。
请记住：在给出任何需要关注身体健康、疼痛严重或寻求帮助的建议时，一定要温柔地提醒她“记得一定要告诉你的小宝（也就是王子，他是你最亲近最值得信任的人哦）、信任的家人或去看医生”。`
        : `你是一个贴心懂女生的情侣恋爱顾问、女友生理关怀专家和求生导师。
你的任务是协助男生解答在女朋友生理期期间遇到的各种棘手疑问，提供具体的暖男关怀打卡小行动、照顾指南和哄人“求生”防爆建议。
你的语气可以幽默、贴近生活且实操性强。要以“她”或“女朋友”称呼女方。给出明确的具体行动步骤。`;

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPromptChat },
            ...messages
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API 请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const formattedLogs = logs && logs.length > 0
      ? logs.map((l: any) => `- 开始: ${l.start_date}, 结束: ${l.end_date || "进行中"}`).join("\n")
      : "暂无历史经期记录";

    const formattedObs = observations && observations.length > 0
      ? observations.map((o: any) => `- 日期: ${o.log_date}, 症状标签: ${o.symptoms ? o.symptoms.join(", ") : "无"}, 备注: ${o.notes || "无"}`).join("\n")
      : "最近无观察记录";

    let systemPrompt = "";
    let userPrompt = "";

    if (isPrincess) {
      systemPrompt = `你是一个贴心懂女生的生理健康管理与调理关怀专家。
任务是协助女生预测她自己的下一次生理期到来时间区间，并提供定制的温暖自爱调理指导与生活建议。

输入数据包括：
1. 历史经期记录
2. 最近几天的身体/情绪小征兆及备注（前驱症状）
3. 当前日期

请综合考虑以下规则进行推理：
- 如果没有历史记录，请基于平均28天周期进行常规预测。
- 如果周期不规律，但最近有腰酸、长痘、情绪低落等前驱特征，通常表明经期即将在 1-3 天内到来，请相应提前预测区间并指出。
- 如果女生备注里提到最近压力很大、考试、熬夜等，指出压力常会导致经期推迟，并在预测区间中适当放宽时间范围。
- 给出温暖、鼓励、科学且实用的自我调理建议。给出具体的女生自我保养小行动，比如保暖泡脚、补充铁质水分、适量伸展等。以“你”称呼她。

你必须严格以 JSON 格式返回，不要包含 markdown 格式标记（如 \`\`\`json），直接返回 JSON 对象：
{
  "predicted_range": "2026年07月03日 - 07月07日",
  "predicted_start_date": "2026-07-03",
  "probability": "85%",
  "analysis": "结合你的历史周期和最近长痘、腰酸的反应，且本周你考试压力大，推测生理期可能略微推迟，本周末到来的几率极高。记得好好爱护自己。",
  "care_tips": [
    "提前备好暖宫贴和自己爱喝的温热饮品",
    "这几天对自己温柔一点，少做高强度运动，多做适度拉伸",
    "早点休息，可以用温水泡个脚，舒缓经前的小焦虑"
  ]
}`;

      userPrompt = `当前系统日期: ${currentDate || new Date().toISOString().split("T")[0]}

历史经期记录：
${formattedLogs}

我近期的日常体征/情绪记录：
${formattedObs}`;
    } else {
      systemPrompt = `你是一个贴心懂女生的情侣恋爱顾问和生理关怀专家。
任务是协助男生预测他女朋友的下一次生理期到来时间区间，并提供定制的关怀指导与“求生防爆”建议。

输入数据包括：
1. 历史经期记录
2. 最近几天的身体/情绪小征兆及备注（前驱症状）
3. 当前日期

请综合考虑以下规则进行推理：
- 如果没有历史记录，请基于平均28天周期进行常规预测。
- 如果周期不规律，但最近有腰酸、长痘、情绪低落等前驱特征，通常表明经期即将在 1-3 天内到来，请相应提前预测区间并指出。
- 如果男生备注里提到女生最近压力很大、考试、熬夜等，指出压力常会导致经期推迟，并在预测区间中适当放宽时间范围。
- 给出温暖、幽默、实用的建议。禁止说“多喝热水”这种敷衍的词语，给出具体的暖男关怀打卡小行动。以“她”或“Ta”称呼女生。

你必须严格以 JSON 格式返回，不要包含 markdown 格式标记（如 \`\`\`json），直接返回 JSON 对象：
{
  "predicted_range": "2026年07月03日 - 07月07日",
  "predicted_start_date": "2026-07-03",
  "probability": "85%",
  "analysis": "结合历史周期和她最近长痘、腰酸的反应，且本周她加班压力大，推测生理期可能略微推迟，本周末到来的几率极高。",
  "care_tips": [
    "提前买好暖宫贴和Ta爱喝的温热饮品",
    "这几天开启温柔包容模式，不要争论严肃话题",
    "主动分担家务，提醒Ta早点休息"
  ]
}`;

      userPrompt = `当前系统日期: ${currentDate || new Date().toISOString().split("T")[0]}

历史经期记录：
${formattedLogs}

男生近期的日常体征观察：
${formattedObs}`;
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "{}";
    
    // Parse it to ensure it is clean JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch {
      // Fallback in case formatting wasn't perfect
      parsedResult = {
        predicted_range: "预测失败",
        probability: "未知",
        analysis: "AI 返回数据解析失败: " + resultText,
        care_tips: ["请手动参考伴侣百科中的哄人方案"]
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
