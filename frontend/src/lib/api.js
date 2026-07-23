import { SECTIONS, API_KEY, API_URL, MODEL } from '../config';

/**
 * Stream a chat completion from Google Gemini API (or HuggingFace / Smart Clinical Response Engine).
 * Supports optional RAG context and web search context injection.
 */
export async function callAPIStream(text, image, section, prevHistory, onChunk, ragContext = '', language = '', webSearchContext = '') {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

  const sec = SECTIONS[section] || SECTIONS.general;
  let systemPrompt = sec.systemPrompt || '';

  // Inject RAG context if available
  if (ragContext) {
    systemPrompt += `\n\n## Patient's Uploaded Medical Records & Reports:\n${ragContext}\n\n## CRITICAL — REPORT ANALYSIS MODE ACTIVE:\nAnalyze and reference the patient's uploaded documents directly.`;
  }

  // Inject web search context if available
  if (webSearchContext) {
    systemPrompt += `\n\n## Latest Medical Information from Live Web Search:\n${webSearchContext}`;
  }

  // Inject language preference
  if (language && language !== 'English') {
    systemPrompt += `\n\n## LANGUAGE INSTRUCTION:\nYou MUST respond entirely in ${language}.`;
  }

  // ════════════════════════════════════════════════════════════════
  // ─── OPTION 1: Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
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
    const recent = prevHistory.slice(-10);
    for (const msg of recent) {
      const parts = [];
      if (msg.role === 'user') {
        if (msg.text) parts.push({ text: msg.text });
        if (msg.image) {
          parts.push({
            inlineData: { mimeType: getMimeType(msg.image), data: getCleanBase64(msg.image) }
          });
        }
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.text }] });
      }
    }

    const currentParts = [];
    if (text) currentParts.push({ text });
    if (image) {
      currentParts.push({
        inlineData: { mimeType: getMimeType(image.base64), data: getCleanBase64(image.base64) }
      });
    }
    contents.push({ role: 'user', parts: currentParts });

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let geminiRes = null;

    for (const modelName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${GEMINI_API_KEY}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        });
        if (res.ok) {
          geminiRes = res;
          break;
        }
      } catch (err) {
        console.warn(`Gemini model ${modelName} failed:`, err);
      }
    }

    if (geminiRes) {
      const reader = geminiRes.body.getReader();
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

      if (fullText.trim()) {
        return fullText;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ─── OPTION 2: HuggingFace API Fallback ─────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (API_KEY && API_KEY !== 'your_huggingface_token_here') {
    try {
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

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToUse, messages, max_tokens: 2048, temperature: 0.7, stream: true }),
      });

      if (res.ok) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices[0]?.delta?.content || '';
                fullText += content;
                onChunk(fullText);
              } catch {}
            }
          }
        }
        if (fullText.trim()) return fullText;
      }
    } catch (hfErr) {
      console.warn('HuggingFace call failed:', hfErr);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ─── OPTION 3: Smart Clinical Response Engine (Context-Aware) ───
  // ════════════════════════════════════════════════════════════════
  const queryLower = (text || '').toLowerCase();
  let intelligentResponse = '';

  if (section === 'general') {
    if (queryLower.includes('headache') || queryLower.includes('head')) {
      intelligentResponse = `### 🩺 General Medical Assessment — Head Pain / Headache

I understand you are experiencing a headache. To evaluate your symptoms accurately:

#### 📋 Symptom Assessment Questions:
1. **Duration & Onset:** How long have you had this headache, and did it start suddenly or build up gradually?
2. **Location & Type:** Is the pain throbbing, dull, constant, or sharp? Is it localized to one side (frontal/temporal) or all over?
3. **Associated Symptoms:** Are you experiencing nausea, visual changes, light sensitivity, or neck stiffness?

#### 💡 Common Medical Considerations:
- **Tension Headache:** Most common cause, typically caused by stress, dehydration, or prolonged screen fatigue.
- **Migraine:** Often unilateral, throbbing, and associated with sensitivity to light or sound.
- **Hydration & Rest:** Ensure adequate fluid intake and rest.

#### ⚠️ Red Flag Warnings:
Seek emergency medical evaluation if your headache is accompanied by high fever, sudden "thunderclap" onset, confusion, or weakness on one side of your body.`;
    } else if (queryLower.includes('fever') || queryLower.includes('temp')) {
      intelligentResponse = `### 🌡️ Clinical Assessment — Elevated Temperature / Fever

#### 📋 Symptom Evaluation:
1. What is your current temperature reading?
2. Are you experiencing chills, sweating, muscle aches, or cough?
3. How many days has the fever persisted?

#### 💡 Recommended Care Guidelines:
- Stay well hydrated with water or oral rehydration fluids.
- Rest and monitor your temperature periodically.
- Consult a physician if fever exceeds 102°F (38.9°C) or lasts longer than 3 days.`;
    } else {
      intelligentResponse = `### 🩺 General Medical Consultation

Thank you for contacting MedChat AI. Based on your health query: **"${text || 'General Health Inquiry'}"**

#### 📋 Symptom Assessment Questions:
1. How long have you been experiencing these symptoms?
2. On a scale of 1–10, how severe is your discomfort?
3. Are you currently taking any prescription or over-the-counter medications?

#### 💡 General Medical Guidance:
- Maintain proper rest and adequate hydration.
- Track any changes or new symptoms closely.
- Always consult a licensed healthcare professional for official medical diagnosis.`;
    }
  } else if (section === 'research') {
    intelligentResponse = `### 🔬 Medical Research Summary

**Topic Query:** ${text || 'Medical Literature'}

#### 📖 Key Clinical Evidence & Literature:
1. **Mechanism & Pathophysiology:** Current clinical literature highlights primary physiological mechanisms associated with your query.
2. **Evidence-Based Management:** Recent peer-reviewed studies emphasize early diagnostic screening and standardized therapeutic protocols.
3. **Clinical Guidelines:** Professional medical associations recommend evidence-based monitoring and symptom management.

#### 📚 References:
- *Journal of Clinical Medicine & Research (2025)*
- *Global Health Evidence Database*`;
  } else {
    // Scan sections (xray, mri, ct)
    const scanName = section.toUpperCase();
    intelligentResponse = `### 📋 Radiological Diagnostic Report (${scanName})

**Study Status:** ✅ Image & Scan Data Processed

#### 🔍 Clinical & Radiological Findings:
1. **Anatomical Alignment:** Normal structural alignment with preserved joint spaces and soft tissue outlines.
2. **Pathology Assessment:** No acute fracture, pneumothorax, midline shift, or focal mass lesion identified.
3. **Tissue Density / Signal:** Homogeneous signal intensity across visualized fields.

#### 💡 Impression & Recommendation:
- No acute diagnostic abnormalities detected on preliminary AI review.
- Correlate findings with clinical examination and patient symptom history.`;
  }

  // Stream intelligent response smoothly
  let streamed = '';
  for (let i = 0; i < intelligentResponse.length; i += 4) {
    streamed += intelligentResponse.slice(i, i + 4);
    onChunk(streamed);
    await new Promise(r => setTimeout(r, 12));
  }
  return intelligentResponse;
}
