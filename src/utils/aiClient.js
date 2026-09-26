// Server-side LLM client. The API key is never sent to the browser.
const crypto = require("crypto");
const AiCache = require("../models/AiCache");
// Router selects from available free models; old deployment model overrides
// must not pin requests to an unavailable or paid model.
const FREE_ROUTER = "openrouter/free";

const generateJson = async (prompt) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  console.log("🤖 LLM Call - API Key Set:", !!process.env.OPENROUTER_API_KEY, "Using Router:", process.env.OPENROUTER_API_KEY ? FREE_ROUTER : "gemini");

  if (process.env.OPENROUTER_API_KEY) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        "X-Title": "TaskTracker",
      },
      body: JSON.stringify({
        model: FREE_ROUTER,
        messages: [{ role: "user", content: prompt }],
      }),
      // Free models can be slow to respond.
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const errorMsg = `OpenRouter API responded ${body.error?.code || response.status}: ${body.error?.message || "unknown error"}`;
      console.error("❌ OpenRouter Error:", errorMsg);
      throw new Error(errorMsg);
    }
    const text = body.choices?.[0]?.message?.content;
    if (!text) throw new Error("LLM returned no content");
    // Some OpenRouter models do not support response_format and may wrap JSON
    // in a markdown fence or surrounding prose even when asked for JSON only.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("LLM returned no JSON object");
    return JSON.parse(match[0]);
  }

  // Backward-compatible Gemini fallback for deployments using the old variables.
  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`AI API responded ${response.status}`);
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
};

// Same model + same prompt => reuse the saved answer instead of calling the LLM.
// The prompt embeds the user's data, so any change to it produces a new key.
// The cache is best-effort: a database error never blocks the AI call.
const cachedGenerateJson = async (prompt) => {
  const model = process.env.OPENROUTER_API_KEY
    ? FREE_ROUTER
    : process.env.AI_MODEL || "gemini-2.5-flash";
  const key = crypto.createHash("sha256").update(`${model}\n${prompt}`).digest("hex");

  try {
    const hit = await AiCache.findOne({ key }).lean();
    if (hit) return hit.result;
  } catch (error) {
    console.warn(`AI cache read failed: ${error.message}`);
  }

  const result = await generateJson(prompt); // failures throw, so they are never cached

  try {
    await AiCache.updateOne({ key }, { key, result, createdAt: new Date() }, { upsert: true });
  } catch (error) {
    console.warn(`AI cache write failed: ${error.message}`);
  }
  return result;
};

const suggestTask = async (input) => {
  const prompt =
    "Turn this rough to-do note into a task. Reply with JSON only, shaped as " +
    '{"title": "short clear title", "description": "one sentence on what to do"}.\n\n' +
    `Note: ${input}`;
  const { title, description } = await cachedGenerateJson(prompt);

  if (typeof title !== "string" || !title.trim()) throw new Error("AI returned no title");

  return {
    title: title.trim().slice(0, 200),
    description: typeof description === "string" ? description.trim().slice(0, 2000) : "",
  };
};

const suggestInsights = async (context) => {
  const prompt = `You are a concise productivity coach. Analyze the JSON activity data below. Return JSON only with exactly this shape: {"summary":"2-4 sentence plain-text summary"}. Times are in minutes and a running timer is counted up to now. Do not invent facts, do not use markdown.\n\nActivity data:\n${JSON.stringify(context)}`;
  const result = await cachedGenerateJson(prompt);
  return {
    summary: typeof result.summary === "string" ? result.summary.trim() : "",
    // tips: Array.isArray(result.tips) ? result.tips.filter((tip) => typeof tip === "string").slice(0, 4) : [],
  };
};

module.exports = { suggestTask, suggestInsights };
