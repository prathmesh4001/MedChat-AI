import { SECTIONS, API_KEY, API_URL, MODEL } from '../config';

/**
 * Stream a chat completion from the HuggingFace API.
 * Supports optional RAG context and web search context injection into the system prompt.
 * @param {string} language — The display name of the language to respond in (e.g. "Hindi")
 * @param {string} webSearchContext — Formatted web search results to inject
 */
export async function callAPIStream(text, image, section, prevHistory, onChunk, ragContext = '', language = '', webSearchContext = '') {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

  const sec = SECTIONS[section];
  let systemPrompt = sec.systemPrompt;

  // Inject RAG context if available
  if (ragContext) {
    systemPrompt += `\n\n## Patient's Uploaded Medical Records & Reports:\n${ragContext}\n\n## CRITICAL — REPORT ANALYSIS MODE ACTIVE:\nYou are now in MODE 3 (Report Analysis). Follow these rules STRICTLY:\n1. DO NOT respond with MCQ JSON. Respond with natural, readable text ONLY.\n2. Directly analyze and reference the patient's uploaded documents above.\n3. Answer directly and concisely. DO NOT prefix every answer with "Based on your uploaded report" or mention the report filename. Just state the medical facts directly.\n4. If the user asks a question about their health, answer it using their uploaded records.\n5. In any Diagnostic Report, add a "### Referenced Documents" section listing which reports were used.\n6. Incorporate lab values, imaging findings, and prior diagnoses from the documents into your analysis.`;
  }

  // Inject web search context if available
  if (webSearchContext) {
    systemPrompt += `\n\n## Latest Medical Information from Live Web Search:\n${webSearchContext}\n\n## CRITICAL — WEB SEARCH RESPONSE MODE ACTIVE:\nThe user is asking for medical INFORMATION, not a symptom diagnosis. Follow these rules STRICTLY:\n1. DO NOT respond with MCQ JSON. DO NOT ask assessment questions. Respond with natural, readable, informative text ONLY.\n2. Use the web search results above to provide accurate, up-to-date medical information.\n3. PRIORITIZE the "Latest Web News" section first for the most current context, then use WHO Statistics/Outbreaks, and finally PubMed for academic depth.\n4. Structure your response with clear headings (##), bullet points, and organized sections.\n5. ALWAYS cite your sources. Use the format: "According to [Source Title]..." or add a "### Sources" section at the end listing all references.\n6. If the web search results include PubMed research papers, reference them by title and PMID.\n7. If the web search results conflict with your training data, prefer the web search results as they are more recent.\n8. Do NOT fabricate or hallucinate URLs or citations — only cite sources that appear in the web search results above.\n9. Provide a comprehensive, well-structured answer. Include key findings, statistics, and recommendations where relevant.`;
  }

  // Inject language preference
  if (language && language !== 'English') {
    systemPrompt += `\n\n## LANGUAGE INSTRUCTION:\nYou MUST respond entirely in ${language}. All text, questions, options, headings, and explanations must be in ${language}. Use medical terminology in ${language} where possible, but keep drug names and medical abbreviations in English.`;
  }

  // ════════════════════════════════════════════════════════════════
  // ─── OPTION 1: Google Gemini API (Stream) ───────────────────────
  // ════════════════════════════════════════════════════════════════
  if (GEMINI_API_KEY) {
    const getCleanBase64 = (b64Str) => {
      const idx = b64Str.indexOf(';base64,');
      return idx !== -1 ? b64Str.substring(idx + 8) : b64Str;
    };

    const getMimeType = (b64Str) => {
      const match = b64Str.match(/^data:(image\/[a-zA-Z+-\.]+);base64,/);
      return match ? match[1] : 'image/jpeg';
    };

    const contents = [];

    // Format history
    const recent = prevHistory.slice(-10);
    for (const msg of recent) {
      const parts = [];
      if (msg.role === 'user') {
        if (msg.text) parts.push({ text: msg.text });
        if (msg.image) {
          parts.push({
            inlineData: {
              mimeType: getMimeType(msg.image),
              data: getCleanBase64(msg.image)
            }
          });
        }
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.text }] });
      }
    }

    // Format current query
    const currentParts = [];
    if (text) currentParts.push({ text });
    if (image) {
      currentParts.push({
        inlineData: {
          mimeType: getMimeType(image.base64),
          data: getCleanBase64(image.base64)
        }
      });
    }
    contents.push({ role: 'user', parts: currentParts });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let lastParsedIndex = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const textRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      textRegex.lastIndex = lastParsedIndex;
      let match;
      while ((match = textRegex.exec(buffer)) !== null) {
        try {
          const parsedChunk = JSON.parse(`"${match[1]}"`);
          if (parsedChunk) {
            fullText += parsedChunk;
            onChunk(fullText);
          }
        } catch {}
        lastParsedIndex = textRegex.lastIndex;
      }
    }

    return fullText || 'No response received.';
  }

  // ════════════════════════════════════════════════════════════════
  // ─── OPTION 2: HuggingFace API (Fallback) ───────────────────────
  // ════════════════════════════════════════════════════════════════
  const messages = [{ role: 'system', content: systemPrompt }];

  const recent = prevHistory.slice(-10);
  for (const msg of recent) {
    if (msg.role === 'user') {
      const content = [];
      if (msg.text) content.push({ type: 'text', text: msg.text });
      if (msg.image) content.push({ type: 'image_url', image_url: { url: msg.image } });
      messages.push({ role: 'user', content });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.text });
    }
  }

  const currentContent = [];
  if (text) currentContent.push({ type: 'text', text });
  if (image) currentContent.push({ type: 'image_url', image_url: { url: image.base64 } });
  if (currentContent.length) messages.push({ role: 'user', content: currentContent });

  const hasImage = !!image || prevHistory.some(m => m.image);
  const modelToUse = hasImage ? 'Qwen/Qwen2.5-VL-72B-Instruct' : MODEL;

  const MAX_RETRIES = 3;
  const body = JSON.stringify({ model: modelToUse, messages, max_tokens: 2048, temperature: 0.7, stream: true });

  let res;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body,
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = Math.pow(2, attempt + 1);
      onChunk(`*Rate limited — retrying in ${waitSec}s... (attempt ${attempt + 2}/${MAX_RETRIES + 1})*`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      continue;
    }
    break;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HuggingFace API request failed (${res.status}). Please configure VITE_GEMINI_API_KEY in your frontend/.env for a stable free experience.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(full);
        }
      } catch {}
    }
  }

  return full || 'No response received.';
}
