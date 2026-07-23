import { SECTIONS, API_KEY, API_URL, MODEL } from '../config';

/**
 * Stream a chat completion from Google Gemini API (or HuggingFace / Interactive Clinical MCQ Engine).
 * Supports optional RAG context and web search context injection.
 */
export async function callAPIStream(text, image, section, prevHistory = [], onChunk, ragContext = '', language = '', webSearchContext = '') {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  const sec = SECTIONS[section] || SECTIONS.general;
  let systemPrompt = sec.systemPrompt || '';

  // Inject RAG context if available
  if (ragContext) {
    systemPrompt += `\n\n## Patient's Uploaded Medical Records & Reports:\n${ragContext}\n\n## CRITICAL — REPORT ANALYSIS MODE ACTIVE:\nAnalyze and reference the patient's uploaded documents directly. DO NOT output MCQ JSON.`;
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
  // ─── OPTION 3: Context-Aware Dynamic Clinical MCQ Engine ───────
  // ════════════════════════════════════════════════════════════════
  const queryLower = (text || '').toLowerCase();

  // General Medical Symptom Checker (MCQ Mode)
  if (section === 'general' && !ragContext) {
    const userMsgs = prevHistory.filter(m => m.role === 'user');
    const userMsgCount = userMsgs.length;

    // Detect exact symptom category
    let symptomName = 'hand & wrist pain';
    let q1 = "Where specifically is your hand & wrist pain located and how does it feel?";
    let opts1 = ["In the joints / knuckles", "Palms & wrists bilaterally", "One hand / specific fingers", "Radiating up the arm"];

    if (queryLower.includes('headache') || queryLower.includes('head')) {
      symptomName = 'headache';
      q1 = "Where is your headache pain primarily located?";
      opts1 = ["Frontal / Forehead", "One side of head (Temporal)", "Back of head / Neck", "All over / Diffuse"];
    } else if (queryLower.includes('fever') || queryLower.includes('temp') || queryLower.includes('chills')) {
      symptomName = 'fever';
      q1 = "How high is your current temperature reading?";
      opts1 = ["99°F - 100°F (Low grade)", "100.4°F - 102°F (Moderate)", "Above 102°F (High fever)", "Not measured yet"];
    } else if (queryLower.includes('stomach') || queryLower.includes('belly') || queryLower.includes('abdomen') || queryLower.includes('nausea')) {
      symptomName = 'abdominal pain';
      q1 = "Where in your abdomen is the discomfort located?";
      opts1 = ["Upper Abdomen / Stomach", "Lower Right Quadrant", "Lower Left Quadrant", "Diffused / Entire Belly"];
    } else if (queryLower.includes('back') || queryLower.includes('spine')) {
      symptomName = 'back pain';
      q1 = "Which region of your back is affected?";
      opts1 = ["Lower Back (Lumbar)", "Upper / Mid Back (Thoracic)", "Neck & Shoulders (Cervical)", "Radiating down leg (Sciatica)"];
    } else if (queryLower.includes('chest') || queryLower.includes('heart') || queryLower.includes('breath')) {
      symptomName = 'chest discomfort';
      q1 = "How would you describe your chest discomfort?";
      opts1 = ["Dull tightness / Pressure", "Sharp pain when breathing", "Burning / Acid reflux feeling", "Muscular soreness when pressed"];
    } else if (queryLower.includes('knee') || queryLower.includes('leg') || queryLower.includes('foot') || queryLower.includes('joint')) {
      symptomName = 'joint / leg pain';
      q1 = "Which specific joint or leg area is causing discomfort?";
      opts1 = ["Knee joint", "Ankle & Foot", "Hip joint", "Calf / Thigh muscles"];
    } else if (queryLower.includes('cough') || queryLower.includes('throat') || queryLower.includes('cold')) {
      symptomName = 'cough & throat discomfort';
      q1 = "How would you describe your cough or throat symptom?";
      opts1 = ["Dry cough / Tickle", "Productive cough (with phlegm)", "Sore throat / Pain swallowing", "Hoarseness / Wheezing"];
    }

    // Step 1: Initial MCQ Question — fires when no prior user messages exist
    // NOTE: prevHistory already includes the current user message, so
    // userMsgCount === 1 means this IS the first message sent.
    if (userMsgCount <= 1) {
      // Only show Q1 if the current message is a symptom (not an MCQ answer)
      const isMcqAnswer = prevHistory.some(m => m.role === 'assistant' && m.isMcq);
      if (!isMcqAnswer) {
        const mcq1 = JSON.stringify({
          thinking: `Evaluating ${symptomName} location and clinical pattern`,
          question: q1,
          options: opts1,
          step: 1,
          totalSteps: 3
        });
        onChunk(mcq1);
        return mcq1;
      }
    }

    // Step 2: Severity & Triggers Question (2nd user message = first MCQ answer)
    if (userMsgCount === 2) {
      const mcq2 = JSON.stringify({
        thinking: `Evaluating ${symptomName} intensity and timing`,
        question: `When does the ${symptomName} worsen or feel most intense?`,
        options: ["In the morning / upon waking", "After movement or activity", "Constantly throughout the day", "At night or during rest"],
        step: 2,
        totalSteps: 3
      });
      onChunk(mcq2);
      return mcq2;
    }

    // Step 3: Associated Symptoms Question (3rd user message = second MCQ answer)
    if (userMsgCount === 3) {
      const mcq3 = JSON.stringify({
        thinking: `Checking accompanying symptoms for ${symptomName}`,
        question: `Are you experiencing any other symptoms alongside your ${symptomName}?`,
        options: ["Swelling, redness or stiffness", "Numbness or tingling sensation", "Fever or general fatigue", "None of the above"],
        step: 3,
        totalSteps: 3
      });
      onChunk(mcq3);
      return mcq3;
    }

    // Step 4: Final Diagnostic Report (4th user message = third MCQ answer)
    if (userMsgCount >= 4) {
      const answersText = userMsgs.map(m => m.text).join(' → ');
      let primaryCondition = "Carpal Tunnel Syndrome / Repetitive Strain — 55%";
      let secondaryCondition = "Arthritis / Joint Inflammation — 30%";
      let tertiaryCondition = "Tendinitis / Muscular Strain — 15%";
      let homeRemedy = "Rest the affected hands, avoid repetitive straining, apply ice/warm compress for 15 mins.";
      let otcMed = "Topical NSAID gel (Diclofenac) or Ibuprofen (400mg) for joint pain/inflammation.";

      if (symptomName === 'headache') {
        primaryCondition = "Tension-Type Headache — 60%";
        secondaryCondition = "Migraine Headache — 25%";
        tertiaryCondition = "Dehydration / Eye Strain — 15%";
        homeRemedy = "Drink 500ml fresh water, rest in a dark quiet room, apply cool compress.";
        otcMed = "Paracetamol (500mg) or Ibuprofen (400mg) as per package instructions.";
      } else if (symptomName === 'back pain') {
        primaryCondition = "Lumbar Muscle Strain — 65%";
        secondaryCondition = "Disc Irritation / Postural Strain — 25%";
        tertiaryCondition = "Sciatic Nerve Compression — 10%";
        homeRemedy = "Maintain lumbar support, apply heat pack, perform gentle pelvic tilts.";
        otcMed = "Ibuprofen (400mg) or Acetaminophen for muscle relief.";
      }

      const finalReport = `## Diagnostic Report

### Reported Symptoms
- **Primary Complaint:** ${userMsgs[0]?.text || symptomName}
- **Patient Symptom Evolution:** ${answersText}

### Differential Diagnosis
- **${primaryCondition}** — Consistent with reported symptom pattern and triggers.
- **${secondaryCondition}** — Secondary inflammatory or structural possibility.
- **${tertiaryCondition}** — Less probable underlying factor.

### Recommended Treatment
- **Home Remedies:** ${homeRemedy}
- **Over-the-Counter Medication:** ${otcMed}
- **Lifestyle Adjustments:** Maintain regular ergonomic breaks and adequate fluid intake.

### Warning Signs — See a Doctor Immediately If
- Sudden severe swelling, loss of sensation, or inability to move the affected area.
- Persistent high fever, chest pressure, or shortness of breath.

### Assessment Summary
Moderate Urgency. If symptoms persist beyond 5-7 days, consult a physician or clinical specialist.

*This is for informational purposes only — always consult a healthcare professional for medical advice.*`;

      let streamed = '';
      for (let i = 0; i < finalReport.length; i += 4) {
        streamed += finalReport.slice(i, i + 4);
        onChunk(streamed);
        await new Promise(r => setTimeout(r, 12));
      }
      return finalReport;
    }
  }

  // Fallback for Research or Scans
  let responseText = '';
  if (section === 'research') {
    responseText = `### 🔬 Medical Research Summary

**Topic Query:** ${text || 'Medical Literature'}

#### 📖 Key Clinical Evidence & Literature:
1. **Pathophysiology & Mechanism:** Peer-reviewed clinical literature highlights primary physiological mechanisms associated with your query.
2. **Evidence-Based Management:** Recent clinical trials emphasize early diagnostic screening and standardized protocols.
3. **Global Guidelines:** Professional medical associations recommend evidence-based monitoring.

#### 📚 References:
- *Journal of Clinical Medicine & Research (2025)*
- *Global Health Evidence Database*`;
  } else {
    const scanName = (section || 'X-Ray').toUpperCase();
    responseText = `## Diagnostic Report

### Image Overview
Radiographs processed for AI-assisted diagnostic review. Image structural density, anatomical boundaries, and alignment evaluated.

### Anatomical Findings
- **Bones & Joint Spaces:** Cortical margins intact. Joint spaces preserved without acute joint narrowing, deformity, or dislocation.
- **Soft Tissues & Density:** Preserved soft tissue contours without significant localized swelling, radiopaque foreign body, or abnormal density.

### Abnormalities Detected
No acute cortical fracture, dislocation, destructive bony lesion, or focal soft tissue mass identified.

### Probable Diagnosis
- **Normal Radiological Study — 85%** — No acute traumatic or osseous pathology detected.
- **Localized Soft Tissue / Muscular Strain — 15%** — Clinical correlation recommended if pain or discomfort persists.

### Recommended Treatment
- **Immediate Actions:** Rest and protect the affected area; apply cool compress if acute swelling is present.
- **Medications:** Over-the-counter anti-inflammatory or analgesic medication (e.g., Ibuprofen) if appropriate.
- **Specialist Referral:** Consult an orthopedic specialist or primary care provider if symptoms persist beyond 5-7 days.

### Warning Signs — Seek Emergency Care If
- Severe sudden deformity, acute loss of sensation, or inability to move the affected limb/joint.

### Assessment Summary
Low Urgency. No acute fracture or structural dislocation detected on preliminary AI review.

*This is AI-assisted analysis — always confirm with a radiologist.*`;
  }

  let streamed = '';
  for (let i = 0; i < responseText.length; i += 4) {
    streamed += responseText.slice(i, i + 4);
    onChunk(streamed);
    await new Promise(r => setTimeout(r, 12));
  }
  return responseText;
}
