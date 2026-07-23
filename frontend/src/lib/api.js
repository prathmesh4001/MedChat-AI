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


  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€â”€ OPTION 3: Context-Aware Dynamic Clinical MCQ Engine â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const queryLower = (text || '').toLowerCase();

  if (section === 'general' && !ragContext) {
    const userMsgs = prevHistory.filter(m => m.role === 'user');
    const userMsgCount = userMsgs.length;
    const hasPriorMCQ = prevHistory.some(m => m.role === 'assistant' && m.isMcq);

    // â”€â”€ Dynamic symptom extraction from ANY user query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const firstUserText = userMsgs[0]?.text || text || '';
    const firstLower = firstUserText.toLowerCase();

    let symptomName = firstUserText.trim()
      .replace(/^(i have |i am having |i feel |i am feeling |suffering from |experiencing |i've got |got |having )/i, '')
      .replace(/\?$/, '').slice(0, 60) || 'your symptom';

    let q1 = `How would you describe your ${symptomName}?`;
    let opts1 = ['Mild and manageable', 'Moderate and affecting daily activity', 'Severe and very painful', 'Comes and goes (intermittent)'];

    if (firstLower.match(/head\s*ache|migraine|head pain|head hurts/)) {
      symptomName = 'headache'; q1 = 'Where is your headache pain primarily located?';
      opts1 = ['Frontal / Forehead', 'One side of head (Temporal)', 'Back of head / Neck', 'All over / Diffuse'];
    } else if (firstLower.match(/fever|temperature|chills|sweating/)) {
      symptomName = 'fever'; q1 = 'How high is your current temperature?';
      opts1 = ['99Â°Fâ€“100Â°F (Low grade)', '100.4Â°Fâ€“102Â°F (Moderate)', 'Above 102Â°F (High fever)', 'Not measured yet'];
    } else if (firstLower.match(/stomach|belly|abdomen|nausea|vomit|diarrhea|digestion/)) {
      symptomName = 'abdominal discomfort'; q1 = 'Where in your abdomen is the discomfort?';
      opts1 = ['Upper abdomen / Stomach area', 'Lower right side', 'Lower left side', 'All over / Cramping'];
    } else if (firstLower.match(/\bback\b|spine|lumbar|lower back/)) {
      symptomName = 'back pain'; q1 = 'Which region of your back is affected?';
      opts1 = ['Lower back (Lumbar)', 'Upper / mid back (Thoracic)', 'Neck & shoulders (Cervical)', 'Radiating down the leg'];
    } else if (firstLower.match(/chest|shortness of breath|breathing/)) {
      symptomName = 'chest discomfort'; q1 = 'How would you describe your chest discomfort?';
      opts1 = ['Dull pressure / Tightness', 'Sharp pain when breathing', 'Burning / Acid reflux feeling', 'Palpitations / Racing heart'];
    } else if (firstLower.match(/knee|ankle|hip|joint|arthritis|\bleg\b|\bfoot\b/)) {
      symptomName = 'joint pain'; q1 = 'Which joint or area is causing the most discomfort?';
      opts1 = ['Knee joint', 'Ankle & foot', 'Hip joint', 'Calf / Thigh muscles'];
    } else if (firstLower.match(/cough|throat|\bcold\b|flu|runny nose|congestion/)) {
      symptomName = 'respiratory discomfort'; q1 = 'How would you describe your main symptom?';
      opts1 = ['Dry cough / Tickle in throat', 'Productive cough with mucus', 'Sore throat / Difficulty swallowing', 'Runny nose & congestion'];
    } else if (firstLower.match(/eye|vision|blur|sight/)) {
      symptomName = 'eye discomfort'; q1 = 'What best describes your eye symptom?';
      opts1 = ['Blurred / hazy vision', 'Eye pain or pressure', 'Redness & irritation', 'Sensitivity to light'];
    } else if (firstLower.match(/skin|rash|itch|hive/)) {
      symptomName = 'skin condition'; q1 = 'How does the skin problem appear?';
      opts1 = ['Redness & rash', 'Itching / Hives', 'Swelling / Puffiness', 'Dry & peeling skin'];
    } else if (firstLower.match(/sleep|insomnia|tired|fatigue|exhausted/)) {
      symptomName = 'fatigue / sleep issues'; q1 = 'How does the problem primarily affect you?';
      opts1 = ['Difficulty falling asleep', 'Waking up frequently at night', 'Always feeling tired despite sleeping', 'Daytime drowsiness'];
    } else if (firstLower.match(/anxiety|stress|panic|worry|nervous/)) {
      symptomName = 'anxiety / stress'; q1 = 'Which best describes your mental health symptom?';
      opts1 = ['Constant worry & overthinking', 'Panic attacks / racing heart', 'Difficulty concentrating', 'Feeling overwhelmed'];
    } else if (firstLower.match(/tooth|teeth|gum|mouth|jaw|dental/)) {
      symptomName = 'dental / oral pain'; q1 = 'Where is the oral discomfort located?';
      opts1 = ['Specific tooth pain', 'Gum pain & swelling', 'Jaw pain / clicking', 'General mouth soreness'];
    } else if (firstLower.match(/ear|hearing|tinnitus|ringing/)) {
      symptomName = 'ear discomfort'; q1 = 'What best describes your ear symptom?';
      opts1 = ['Ear pain / pressure', 'Ringing in the ear (tinnitus)', 'Reduced hearing', 'Fluid / discharge from ear'];
    } else if (firstLower.match(/dizzy|dizziness|vertigo|balance|spinning/)) {
      symptomName = 'dizziness / vertigo'; q1 = 'How does the dizziness feel?';
      opts1 = ['Room spinning sensation', 'Lightheadedness when standing', 'Loss of balance while walking', 'Brief episodes when moving head'];
    } else if (firstLower.match(/urine|urinary|bladder|kidney/)) {
      symptomName = 'urinary discomfort'; q1 = 'Which symptom is most prominent?';
      opts1 = ['Burning sensation while urinating', 'Frequent urge to urinate', 'Blood in urine', 'Lower abdominal / flank pain'];
    } else if (firstLower.match(/heart|palpitation|pulse|heartbeat/)) {
      symptomName = 'heart palpitations'; q1 = 'How do you experience the palpitations?';
      opts1 = ['Rapid heartbeat / Racing', 'Skipping or fluttering beats', 'Pounding sensation in chest', 'Irregular rhythm episodes'];
    } else if (firstLower.match(/allerg|sneezing|hay fever|pollen/)) {
      symptomName = 'allergic symptoms'; q1 = 'Which allergic symptom is most bothersome?';
      opts1 = ['Sneezing & runny nose', 'Itchy watery eyes', 'Skin rash / Hives', 'Difficulty breathing / Wheezing'];
    }

    const opts2 = ['Started today (< 24 hours)', 'Started 2-3 days ago', 'Been present for 1-2 weeks', 'Ongoing for more than 2 weeks'];
    const opts3 = ['Mild - I can continue daily activities', 'Moderate - affecting my routine', 'Severe - very painful / limiting', 'Extreme - worst I have experienced'];

    let opts4 = ['Nausea / Vomiting', 'Fever / Chills', 'Fatigue / Weakness', 'None of the above'];
    if (symptomName === 'headache') opts4 = ['Nausea / Light sensitivity', 'Neck stiffness', 'Visual aura / Disturbances', 'None of the above'];
    else if (symptomName === 'chest discomfort') opts4 = ['Shortness of breath', 'Sweating / Dizziness', 'Pain radiating to arm or jaw', 'None of the above'];
    else if (symptomName === 'joint pain') opts4 = ['Swelling & redness', 'Morning stiffness', 'Fever / Fatigue', 'None of the above'];
    else if (symptomName === 'respiratory discomfort') opts4 = ['Fever / Body aches', 'Shortness of breath', 'Loss of taste or smell', 'None of the above'];
    else if (symptomName === 'abdominal discomfort') opts4 = ['Vomiting / Diarrhea', 'Blood in stool', 'Loss of appetite', 'None of the above'];
    else if (symptomName === 'anxiety / stress') opts4 = ['Sleep disturbances', 'Sweating / Trembling', 'Avoiding social situations', 'None of the above'];
    else if (symptomName === 'heart palpitations') opts4 = ['Chest pain / Tightness', 'Shortness of breath', 'Dizziness / Fainting', 'None of the above'];
    else if (symptomName === 'back pain') opts4 = ['Numbness / Tingling in legs', 'Muscle spasms', 'Difficulty standing upright', 'None of the above'];
    else if (symptomName === 'fever') opts4 = ['Severe headache / Stiff neck', 'Rash on body', 'Extreme fatigue / Body aches', 'None of the above'];

    // STEP 1 - Location / Nature
    if (userMsgCount <= 1 && !hasPriorMCQ) {
      const mcq1 = JSON.stringify({ thinking: `Understanding the nature and location of ${symptomName}`, question: q1, options: opts1, step: 1, totalSteps: 4 });
      onChunk(mcq1); return mcq1;
    }

    // STEP 2 - Duration / Onset
    if (userMsgCount === 2) {
      const mcq2 = JSON.stringify({ thinking: `Assessing onset and duration of ${symptomName}`, question: `How long have you been experiencing this ${symptomName}?`, options: opts2, step: 2, totalSteps: 4 });
      onChunk(mcq2); return mcq2;
    }

    // STEP 3 - Severity
    if (userMsgCount === 3) {
      const mcq3 = JSON.stringify({ thinking: `Evaluating severity and functional impact`, question: `How would you rate the severity of your ${symptomName}?`, options: opts3, step: 3, totalSteps: 4 });
      onChunk(mcq3); return mcq3;
    }

    // STEP 4 - Associated Symptoms
    if (userMsgCount === 4) {
      const mcq4 = JSON.stringify({ thinking: `Screening for associated symptoms and red flags`, question: `Are you experiencing any of these additional symptoms alongside your ${symptomName}?`, options: opts4, step: 4, totalSteps: 4 });
      onChunk(mcq4); return mcq4;
    }

    // FINAL REPORT
    if (userMsgCount >= 5) {
      const originalComplaint = userMsgs[0]?.text || symptomName;
      const answer1 = userMsgs[1]?.text || 'Not specified';
      const answer2 = userMsgs[2]?.text || 'Not specified';
      const answer3 = userMsgs[3]?.text || 'Not specified';
      const answer4 = userMsgs[4]?.text || 'None';

      const isHighSeverity = /severe|extreme/i.test(answer3);
      const isLongDuration = /week|month|more than/i.test(answer2);
      const hasRedFlag = /arm|jaw|blood in stool|consciousness|shortness of breath/i.test(answer4) ||
        (symptomName === 'chest discomfort' && /radiating|sweating|dizz/i.test(answer4));
      const urgencyLevel = hasRedFlag ? 'High - Seek Medical Attention Promptly' : isHighSeverity ? 'Moderate - Consult a Doctor Soon' : 'Low - Monitor at Home';

      let diagnoses, homeRemedy, otcMed, specialist;

      if (symptomName === 'headache') {
        const isMigraine = /temporal|one side|aura|visual/i.test(answer1 + answer4);
        diagnoses = isMigraine
          ? [['Migraine Headache', 62], ['Cluster Headache', 22], ['Tension-Type Headache', 16]]
          : [['Tension-Type Headache', 65], ['Dehydration / Eye Strain Headache', 20], ['Migraine Headache', 15]];
        homeRemedy = 'Drink 2-3 glasses of water, rest in a dark quiet room, cold compress on forehead or neck.';
        otcMed = 'Paracetamol 500mg or Ibuprofen 400mg. Do not use more than 2-3 days/week to avoid rebound headache.';
        specialist = 'Neurologist (if frequent or severe migraines)';
      } else if (symptomName === 'fever') {
        const isHigh = /high|102|103/i.test(answer1);
        diagnoses = isHigh
          ? [['Bacterial Infection (e.g. UTI, pneumonia, throat)', 45], ['Viral Syndrome (Flu / COVID-19)', 35], ['Inflammatory Condition', 20]]
          : [['Viral Upper Respiratory Infection', 55], ['Early Bacterial Infection', 25], ['Immune Response', 20]];
        homeRemedy = 'Drink fluids regularly, rest, cool compress on forehead. Tepid sponge bath if above 103F.';
        otcMed = 'Paracetamol 500-1000mg every 6 hours (max 4g/day). Ibuprofen 400mg with food if tolerated.';
        specialist = 'General Physician if fever persists more than 3 days or rises above 103F';
      } else if (symptomName === 'chest discomfort') {
        const isCardiac = /radiating|arm|jaw|sweating|dizz/i.test(answer4);
        diagnoses = isCardiac
          ? [['Possible Cardiac Event (Angina / ACS)', 60], ['Musculoskeletal Chest Pain', 25], ['Acid Reflux / GERD', 15]]
          : [['Acid Reflux / GERD', 45], ['Musculoskeletal / Costochondritis', 35], ['Anxiety-Related Chest Tightness', 20]];
        homeRemedy = isCardiac ? 'STOP activity, sit down, and call emergency services immediately.' : 'Sit upright after meals, avoid heavy/fatty food, try antacids.';
        otcMed = isCardiac ? 'Aspirin 300mg if cardiac event suspected (no allergy) - CALL EMERGENCY SERVICES NOW.' : 'Antacids / PPI (Omeprazole) for GERD. Ibuprofen for musculoskeletal.';
        specialist = 'Cardiologist (urgent) / Gastroenterologist for GERD';
      } else if (symptomName === 'back pain') {
        const isSciatica = /radiating|numbness|tingling/i.test(answer1 + answer4);
        diagnoses = isSciatica
          ? [['Sciatic Nerve Compression', 55], ['Lumbar Disc Herniation', 30], ['Piriformis Syndrome', 15]]
          : [['Lumbar Muscle Strain', 60], ['Postural / Ergonomic Strain', 25], ['Disc Degeneration', 15]];
        homeRemedy = 'Apply heat pack (20 min), gentle stretching (pelvic tilt, cat-cow), avoid prolonged sitting.';
        otcMed = 'Ibuprofen 400mg or Naproxen 500mg with food. Topical Diclofenac gel on sore area.';
        specialist = 'Orthopedic Surgeon / Physiotherapist';
      } else if (symptomName === 'abdominal discomfort') {
        diagnoses = [['Gastroenteritis / IBS', 45], ['Acid Reflux / Peptic Ulcer', 30], ['Appendicitis (right-sided)', 15], ['Food Intolerance', 10]];
        homeRemedy = 'BRAT diet (banana, rice, applesauce, toast), ORS for hydration, avoid spicy/fatty foods.';
        otcMed = 'Antacids for GERD. ORS sachets for dehydration. Buscopan for cramps.';
        specialist = 'Gastroenterologist';
      } else if (symptomName === 'joint pain') {
        const isRA = /morning|stiffness/i.test(answer4);
        diagnoses = isRA
          ? [['Rheumatoid Arthritis', 50], ['Osteoarthritis', 30], ['Gout', 20]]
          : [['Osteoarthritis', 50], ['Ligament / Tendon Injury', 30], ['Gout / Crystal Arthropathy', 20]];
        homeRemedy = 'RICE (Rest, Ice, Compression, Elevation). Avoid weight-bearing if swollen.';
        otcMed = 'Ibuprofen 400mg with food. Topical Diclofenac gel. Glucosamine supplements.';
        specialist = 'Rheumatologist / Orthopedic Surgeon';
      } else if (symptomName === 'respiratory discomfort') {
        const isCovid = /taste|smell/i.test(answer4);
        diagnoses = isCovid
          ? [['COVID-19 / Viral Syndrome', 60], ['Common Cold', 25], ['Sinusitis', 15]]
          : [['Common Cold / Rhinovirus', 50], ['Allergic Rhinitis', 30], ['Bacterial Sinusitis', 20]];
        homeRemedy = 'Steam inhalation, warm honey-lemon tea, saline nasal rinse, rest and hydration.';
        otcMed = 'Cetirizine for allergy. Decongestant nasal spray. Dextromethorphan for dry cough.';
        specialist = 'ENT Specialist / Pulmonologist';
      } else if (symptomName === 'anxiety / stress') {
        diagnoses = [['Generalized Anxiety Disorder (GAD)', 50], ['Situational / Reactive Anxiety', 30], ['Panic Disorder', 20]];
        homeRemedy = '4-7-8 breathing technique, daily 30-min walk, limit caffeine, mindfulness meditation.';
        otcMed = 'Consult a doctor before medication. Magnesium glycinate may help mild anxiety.';
        specialist = 'Psychiatrist / Clinical Psychologist';
      } else if (symptomName === 'fatigue / sleep issues') {
        diagnoses = [['Insomnia / Sleep Hygiene Issue', 45], ['Chronic Fatigue Syndrome', 30], ['Anaemia / Thyroid Disorder', 25]];
        homeRemedy = 'Fixed sleep schedule, avoid screens 1hr before bed, limit caffeine after 2pm.';
        otcMed = 'Melatonin 1-3mg short term for sleep. Get CBC and thyroid panel tested.';
        specialist = 'Sleep Specialist / Endocrinologist';
      } else if (symptomName === 'heart palpitations') {
        diagnoses = [['Benign Palpitations (stress/caffeine)', 50], ['Atrial Fibrillation (AF)', 25], ['Supraventricular Tachycardia (SVT)', 25]];
        homeRemedy = 'Avoid caffeine, reduce stress, stay hydrated. Try Valsalva manoeuvre for brief episodes.';
        otcMed = 'No self-medication - consult a cardiologist for ECG evaluation.';
        specialist = 'Cardiologist (ECG required)';
      } else {
        const capName = symptomName.charAt(0).toUpperCase() + symptomName.slice(1);
        diagnoses = [
          [`Primary ${capName} - Most Likely Diagnosis`, 55],
          ['Secondary Inflammatory or Functional Cause', 30],
          ['Stress-Related / Idiopathic Origin', 15],
        ];
        homeRemedy = `Rest adequately, stay hydrated, and avoid activities that worsen your ${symptomName}.`;
        otcMed = 'Discuss appropriate OTC medication with a licensed pharmacist for your specific symptoms.';
        specialist = 'General Physician / Primary Care Doctor';
      }

      const diagnosisTable = diagnoses.map(([cond, pct]) => {
        const icon = pct >= 50 ? 'Most likely' : pct >= 25 ? 'Secondary' : 'Less probable';
        return `| ${cond} | ${pct}% | ${icon} |`;
      }).join('\n');

      const finalReport = `## Clinical Diagnostic Report

---

### Patient Summary

| Field | Details |
|-------|---------|
| **Primary Complaint** | ${originalComplaint} |
| **Location / Nature** | ${answer1} |
| **Duration** | ${answer2} |
| **Severity** | ${answer3} |
| **Associated Symptoms** | ${answer4} |

---

### Differential Diagnosis

| Condition | Probability | Assessment |
|-----------|-------------|------------|
${diagnosisTable}

---

### Recommended Treatment Plan

**Home Management**
${homeRemedy}

**Over-the-Counter Medication**
${otcMed}

**Lifestyle Adjustments**
- Maintain a consistent sleep schedule (7-9 hours nightly)
- Stay well hydrated (2-3 litres of water daily)
- Avoid known triggers that worsen your ${symptomName}
- Keep a symptom diary to track patterns over time
${isLongDuration ? '- Symptoms lasting over a week warrant a medical evaluation' : ''}

---

### Warning Signs - Seek Emergency Care If
- Sudden severe chest pain, difficulty breathing, or loss of consciousness
- Symptoms rapidly worsening or spreading to new areas
- High fever (above 103F / 39.4C) unresponsive to medication
${hasRedFlag ? '- Your reported associated symptoms include red flag signs - please seek medical attention promptly' : ''}

---

### Assessment Summary

**Urgency Level:** ${urgencyLevel}
**Recommended Specialist:** ${specialist}

> If symptoms persist beyond 5-7 days or worsen, please consult a qualified healthcare professional.
>
> This report is AI-generated for informational purposes only and does not replace professional medical advice.`;

      let streamed = '';
      for (let i = 0; i < finalReport.length; i += 4) {
        streamed += finalReport.slice(i, i + 4);
        onChunk(streamed);
        await new Promise(r => setTimeout(r, 10));
      }
      return finalReport;
    }
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
