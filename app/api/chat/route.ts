import { insertMessage, getOrCreateSession } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt, sessionId, personaId } = await req.json();

    // 1. Persist the user's incoming message
    if (sessionId && personaId) {
      getOrCreateSession(sessionId, personaId);
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        insertMessage(sessionId, "user", lastUserMsg.content);
      }
    }

    // 2. Fetch live models to guarantee availability
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` }
    });

    if (!modelsRes.ok) {
      throw new Error("Failed to fetch Groq models.");
    }

    const modelsData = await modelsRes.json();
    const availableModels = modelsData.data.map((m: any) => m.id);
    
    // Filter out third-party/specialized models
    const safeModels = availableModels.filter((m: string) => 
      !m.includes("/") && 
      !m.includes("guard") && 
      !m.includes("whisper") && 
      !m.includes("vision") && 
      !m.includes("embed")
    );
    
    // Prioritize Llama models for the fallback array
    const llamaModels = safeModels.filter((m: string) => m.includes("llama"));
    const fallbackModels = llamaModels.length > 0 ? llamaModels.slice(0, 3) : safeModels.slice(0, 3);

    let response;
    let fetchAttempt = 0;

    // 3. Auto-fallback loop: Try up to 3 different models silently if one fails
    while (fetchAttempt < fallbackModels.length) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: fallbackModels[fetchAttempt],
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          max_tokens: 512,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (response.ok) break; 
      
      console.warn(`Model ${fallbackModels[fetchAttempt]} failed, attempting fallback...`);
      fetchAttempt++;
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text() : "All fallback models failed.";
      console.error("Groq API Error Response:", errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: response ? response.status : 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    let fullAssistantResponse = "";

    // 4. Stream and persist the assistant's response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || "";
                if (content) {
                  fullAssistantResponse += content;
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {
                // Ignore partial JSON chunks
              }
            }
          }
        }

        if (sessionId && fullAssistantResponse) {
          insertMessage(sessionId, "assistant", fullAssistantResponse);
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: any) {
    console.error("API Route Execution Error:", error.message || error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}