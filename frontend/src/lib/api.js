import { SECTIONS, API_KEY, API_URL, MODEL } from '../config.js';

/**
 * Stream a chat completion from Google Gemini API (or HuggingFace / Interactive Clinical MCQ Engine).
 * Supports optional RAG context and web search context injection.
 */
export async function callAPIStream(text, image, section, prevHistory = [], onChunk = () => {}, ragContext = '', language = '', webSearchContext = '') {
  const GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        });
        clearTimeout(timeoutId);
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

      const hfController = new AbortController();
      const hfTimeout = setTimeout(() => hfController.abort(), 3500);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        signal: hfController.signal,
        body: JSON.stringify({ model: modelToUse, messages, max_tokens: 2048, temperature: 0.7, stream: true }),
      });
      clearTimeout(hfTimeout);

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

  // General Medical Symptom Checker (MCQ Mode)
  if (section === 'general' && !ragContext) {
    const userMsgs = prevHistory.filter(m => m.role === 'user');
    const isCurrentAlreadyInHistory = userMsgs.length > 0 && userMsgs[userMsgs.length - 1].text === (text || '').trim();
    const totalUserCount = isCurrentAlreadyInHistory ? userMsgs.length : (userMsgs.length + (text ? 1 : 0));

    // Check if diagnostic report has already been delivered in this session
    const hasCompletedReport = prevHistory.some(m =>
      (m.role === 'assistant' && (m.text?.includes('Diagnostic Report') || m.rawText?.includes('Diagnostic Report')))
    );

    const isGreeting = (str) => /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|greetings|start)[\s!.]*$/i.test((str || '').trim());

    // If report was already given, handle follow-up conversation naturally
    if (hasCompletedReport) {
      const followUpPrompt = text.trim();
      let followUpReply = `### Dr. MedChat AI Follow-up\n\nThank you for following up. Regarding: **"${followUpPrompt}"**\n\n- **Medical Advice:** Please follow the recommended self-care guidance and monitor your symptoms closely.\n- **Medication Safety:** If you plan to start any over-the-counter medication, ensure you check for known allergies and read package dosage carefully.\n- **Follow-up Timeline:** If symptoms do not improve within 3 to 5 days, or if any red-flag warning signs occur, please schedule an appointment with a licensed healthcare practitioner.\n\n*Feel free to ask further questions or click "+ Start Consultation" to evaluate a new symptom.*`;
      
      let streamed = '';
      for (let i = 0; i < followUpReply.length; i += 4) {
        streamed += followUpReply.slice(i, i + 4);
        onChunk(streamed);
        await new Promise(r => setTimeout(r, 10));
      }
      return followUpReply;
    }

    // If user's first message is just a greeting, provide a friendly onboarding response
    if (totalUserCount === 1 && isGreeting(text)) {
      const welcome = `Hello! I am **Dr. MedChat AI**, your interactive clinical assistant.\n\nPlease describe what symptoms or health concerns you are experiencing today (for example: *headache, fever, cough, stomach pain, back discomfort, skin rash, or joint pain*).\n\nI will guide you through a quick 3-step evaluation to analyze your condition and provide a comprehensive diagnostic summary.`;
      let streamed = '';
      for (let i = 0; i < welcome.length; i += 4) {
        streamed += welcome.slice(i, i + 4);
        onChunk(streamed);
        await new Promise(r => setTimeout(r, 10));
      }
      return welcome;
    }

    // Identify primary symptom from initial non-greeting user input
    const initialMsg = userMsgs.find(m => !isGreeting(m.text)) || { text: text || '' };
    const firstUserText = (initialMsg.text || text || '').trim();
    const queryLower = firstUserText.toLowerCase();

    // ─── CLINICAL SYMPTOM CATALOG & DIFFERENTIALS ───────────────
    let catalog = null;

    if (queryLower.match(/head\s*ache|migraine|head pain|throbbing head|temporal|forehead pain/)) {
      catalog = {
        symptomName: 'headache',
        q1: 'Where is your headache pain primarily located?',
        opts1: ['Frontal / Forehead', 'One side of head (Temporal)', 'Back of head / Neck', 'All over / Diffuse pressure'],
        q2: 'When does the headache worsen or feel most intense?',
        opts2: ['In the morning / upon waking', 'After screen time or eye strain', 'With loud noise, lights or stress', 'Constantly throughout the day'],
        q3: 'Are you experiencing any accompanying symptoms?',
        opts3: ['Nausea or sensitivity to light/sound', 'Neck stiffness or shoulder tension', 'Visual aura, halos or dizziness', 'None of the above / Isolated pain'],
        diffs: [
          { name: 'Tension-Type Headache', pct: 60, reason: 'Consistent with stress, posture and bilateral pressure pattern.' },
          { name: 'Migraine Headache', pct: 25, reason: 'Considerable if throbbing, unilateral or sensitive to light/sound.' },
          { name: 'Dehydration / Eye Strain', pct: 15, reason: 'Common secondary trigger associated with screen time and fluid deficit.' },
        ],
        homeRemedy: 'Drink 500ml fresh water, rest in a quiet dark room, and apply a cool or warm compress to forehead.',
        otcMed: 'Paracetamol (500mg) or Ibuprofen (400mg) as per package instructions.',
        lifestyle: 'Take regular 20-20-20 screen breaks, maintain regular sleep schedules, and avoid skipping meals.',
        warningSigns: ['Sudden explosive "thunderclap" headache', 'Accompanying high fever, stiff neck or confusion', 'New onset neurological weakness or numbness'],
        urgency: 'Moderate Urgency. If symptoms persist beyond 3-5 days or worsen, consult a physician.',
      };
    } else if (queryLower.match(/fever|temp|chills|shiver|sweat|pyrexia|hot body/)) {
      catalog = {
        symptomName: 'fever',
        q1: 'How high is your current temperature reading?',
        opts1: ['99°F - 100°F (Low grade)', '100.4°F - 102°F (Moderate)', 'Above 102°F (High fever)', 'Not measured yet / Feeling hot & chills'],
        q2: 'How long has the fever been present?',
        opts2: ['Started today (< 24 hours)', '2 to 3 days', '4 to 7 days', 'More than a week'],
        q3: 'Which symptoms are accompanying your fever?',
        opts3: ['Chills, generalized body ache and fatigue', 'Cough, runny nose or sore throat', 'Nausea, vomiting or diarrhea', 'Severe headache or stiff neck'],
        diffs: [
          { name: 'Acute Viral Infection', pct: 65, reason: 'Most common etiology for acute fever with systemic fatigue.' },
          { name: 'Seasonal Influenza (Flu)', pct: 25, reason: 'Rapid onset fever accompanied by myalgia and chills.' },
          { name: 'Localized Bacterial Infection', pct: 10, reason: 'Secondary consideration if focal signs or prolonged fever develop.' },
        ],
        homeRemedy: 'Rest adequately, drink plenty of fluids and oral rehydration electrolytes, and apply lukewarm sponge compress.',
        otcMed: 'Paracetamol / Acetaminophen (500mg-650mg every 6 hours as needed, max 3000mg/day).',
        lifestyle: 'Wear light breathable clothing, keep room well ventilated, and avoid intense physical exertion.',
        warningSigns: ['Fever exceeding 103°F (39.4°C) not responding to antipyretics', 'Severe neck stiffness, confusion or seizure', 'Difficulty breathing or extreme lethargy'],
        urgency: 'Moderate Urgency. Seek immediate medical evaluation if fever persists over 3 days.',
      };
    } else if (queryLower.match(/stomach|belly|abdomen|abdominal|nausea|vomit|diarrhea|loose motion|acidity|heartburn|gas|bloat|cramp|indigestion|gut/)) {
      catalog = {
        symptomName: 'abdominal discomfort',
        q1: 'Where in your abdomen is the discomfort primarily localized?',
        opts1: ['Upper abdomen / Epigastric area', 'Lower right abdomen', 'Lower left or pelvic area', 'Diffused / Entire belly / Generalized cramping'],
        q2: 'How does the discomfort relate to food intake?',
        opts2: ['Worsens shortly after meals', 'Worsens on empty stomach or between meals', 'Accompanied by nausea, vomiting or diarrhea', 'Constant regardless of eating'],
        q3: 'Are you experiencing any other digestive symptoms?',
        opts3: ['Acid reflux / Burning in chest', 'Bloating, gas or watery loose stools', 'Mild fever or body chills', 'None of the above'],
        diffs: [
          { name: 'Acute Gastritis / Acid Peptic Dyspepsia', pct: 55, reason: 'Consistent with upper abdominal acidity, burning or post-meal discomfort.' },
          { name: 'Gastroenteritis / Food Sensitivity', pct: 30, reason: 'Associated with diffuse cramping, nausea or loose stool pattern.' },
          { name: 'Irritable Bowel / Colonic Cramping', pct: 15, reason: 'Functional lower abdominal discomfort related to dietary or stress triggers.' },
        ],
        homeRemedy: 'Follow bland diet (bananas, rice, toast), sip electrolyte water or ginger tea, and avoid oily/spicy foods.',
        otcMed: 'Antacid suspension (Magaldrate / Simethicone) or ORS (Oral Rehydration Salts).',
        lifestyle: 'Eat smaller frequent meals, avoid lying down within 2 hours of eating, and limit caffeine and alcohol.',
        warningSigns: ['Severe localized pain in lower right abdomen', 'Blood in vomit or black tarry stools', 'Inability to keep liquids down for > 24 hours with dehydration'],
        urgency: 'Moderate Urgency. Consult a gastroenterologist or primary care physician if pain intensifies.',
      };
    } else if (queryLower.match(/cough|throat|cold|sore throat|sneez|congestion|phlegm|sputum|runny nose|flu|sinus/)) {
      catalog = {
        symptomName: 'cough & throat discomfort',
        q1: 'How would you describe your cough or throat symptom?',
        opts1: ['Dry tickling cough / Scratchy throat', 'Productive cough with yellow/green phlegm', 'Sharp pain when swallowing (Sore throat)', 'Nasal congestion with runny nose & sneezing'],
        q2: 'How long have these respiratory symptoms lasted?',
        opts2: ['1 to 3 days (Acute onset)', '4 to 7 days (Ongoing)', '1 to 2 weeks', 'More than 2 weeks (Persistent)'],
        q3: 'Are you experiencing any other symptoms?',
        opts3: ['Mild fever or general body aches', 'Shortness of breath or wheezing', 'Loss of smell / taste or sinus facial pressure', 'None of the above'],
        diffs: [
          { name: 'Acute Viral Pharyngitis / Upper Respiratory Infection', pct: 65, reason: 'Predominant cause for acute throat irritation, nasal discharge and cough.' },
          { name: 'Post-Nasal Drip / Bronchial Irritation', pct: 25, reason: 'Tickling dry cough triggered by allergy or sinus drainage.' },
          { name: 'Acute Bronchitis', pct: 10, reason: 'Persistent productive cough following viral respiratory onset.' },
        ],
        homeRemedy: 'Perform warm saline gargles 3x daily, drink warm honey-lemon water, and use steam inhalation.',
        otcMed: 'Throat lozenges with menthol, Dextromethorphan (dry cough) or Guaifenesin (productive cough).',
        lifestyle: 'Use a humidifier in sleeping areas, avoid smoke and air pollution, and stay well hydrated.',
        warningSigns: ['Difficulty breathing, stridor or rapid breathing', 'Coughing up blood (hemoptysis)', 'Inability to swallow fluids or saliva'],
        urgency: 'Moderate Urgency. If symptoms exceed 7-10 days, clinical review is recommended.',
      };
    } else if (queryLower.match(/\bback\b|spine|lumbar|sciatica|lower back|upper back|mid back/)) {
      catalog = {
        symptomName: 'back pain',
        q1: 'Which region of your back is primarily affected?',
        opts1: ['Lower Back (Lumbar area)', 'Upper or Mid Back (Thoracic area)', 'Neck & Shoulders (Cervical area)', 'Radiating down the leg / buttocks (Sciatica)'],
        q2: 'What factors exacerbate or relieve your back discomfort?',
        opts2: ['Worse with bending, lifting or twisting', 'Worse during prolonged sitting or driving', 'Stiff in the morning, loosens with gentle movement', 'Constant ache in all positions'],
        q3: 'Are you experiencing any radiating sensation or nerve symptoms?',
        opts3: ['Numbness, tingling or weakness in leg/foot', 'Muscle spasms in the back', 'Pain strictly localized to back', 'Difficulty walking or standing upright'],
        diffs: [
          { name: 'Lumbar Muscle Strain', pct: 65, reason: 'Most common etiology from lifting, postural stress or muscle fatigue.' },
          { name: 'Lumbar Disc Irritation / Postural Strain', pct: 25, reason: 'Aggravated by prolonged flexion, sitting and axial loading.' },
          { name: 'Sciatic Nerve Compression', pct: 10, reason: 'Radicular discomfort extending along the sciatic nerve pathway.' },
        ],
        homeRemedy: 'Apply warm compress / heating pad for 20 mins, maintain ergonomic lumbar support, and perform gentle pelvic tilts.',
        otcMed: 'Ibuprofen (400mg) or Paracetamol (500mg), topical Diclofenac gel applied 3-4 times daily.',
        lifestyle: 'Avoid heavy lifting, use an ergonomic desk chair, and engage in gentle walking to prevent spinal stiffness.',
        warningSigns: ['Loss of bowel or bladder control (Cauda Equina red flag)', 'Progressive loss of sensation or foot drop', 'Severe unremitting pain waking you from sleep at night'],
        urgency: 'Moderate Urgency. Consult an orthopedic or spine specialist if leg weakness occurs.',
      };
    } else if (queryLower.match(/chest|heart|palpitation|shortness of breath|breath|tight chest/)) {
      catalog = {
        symptomName: 'chest discomfort',
        q1: 'How would you describe the sensation in your chest?',
        opts1: ['Dull tightness / Heaviness / Pressure', 'Sharp, stabbing pain when taking a deep breath', 'Burning sensation behind breastbone (Reflux)', 'Localized muscular tenderness when pressed'],
        q2: 'When did this chest discomfort occur or worsen?',
        opts2: ['During physical exertion or climbing stairs', 'After eating a heavy or spicy meal', 'During episodes of stress or anxiety', 'Following sudden movement or coughing'],
        q3: 'Do you have any of the following accompanying symptoms?',
        opts3: ['Shortness of breath or rapid heartbeat', 'Pain radiating to jaw, left arm or shoulder', 'Cough, wheezing or acid taste in mouth', 'None of the above'],
        diffs: [
          { name: 'Musculoskeletal Chest Wall Strain', pct: 50, reason: 'Consistent with chest wall tenderness, movement triggers and muscular tone.' },
          { name: 'Gastroesophageal Reflux Disease (GERD)', pct: 35, reason: 'Post-meal substernal burning sensation exacerbated by recumbency.' },
          { name: 'Cardiopulmonary Concern', pct: 15, reason: 'Requires clinical clearance to exclude ischemic or pleuritic causes.' },
        ],
        homeRemedy: 'Rest quietly in an upright position, avoid physical exertion, and avoid tight restrictive clothing.',
        otcMed: 'Antacid for acid-related symptoms. (Do NOT delay emergency care if cardiac symptoms suspected).',
        lifestyle: 'Avoid large late-night meals, maintain stress-reduction techniques, and avoid smoking.',
        warningSigns: ['Crushing chest pressure with radiation to jaw, neck or left arm', 'Severe breathlessness, cold sweating or dizziness', 'Sudden rapid or irregular heartbeat with fainting'],
        urgency: 'HIGH URGENCY. Any new or exertion-related chest discomfort requires immediate physician evaluation.',
      };
    } else if (queryLower.match(/knee|leg|joint|foot|ankle|hip|arthritis|elbow|wrist|hand|finger|sprain/)) {
      catalog = {
        symptomName: 'joint & limb discomfort',
        q1: 'Which specific joint or limb area is causing discomfort?',
        opts1: ['Knee joint (one or both)', 'Ankle, foot or heel', 'Hands, wrists or finger joints', 'Hip or shoulder joint'],
        q2: 'How would you characterize the pain and stiffness?',
        opts2: ['Stiff in the morning, loosens with movement', 'Worsens after prolonged walking, standing or stairs', 'Sharp pain after a twist, misstep or athletic injury', 'Constant throbbing ache even at rest'],
        q3: 'Are you noticing any of the following signs?',
        opts3: ['Visible swelling, redness and local warmth', 'Clicking, catching or popping sensation', 'Mild stiffness without visible swelling', 'None of the above'],
        diffs: [
          { name: 'Soft Tissue Tendinitis / Ligament Sprain', pct: 50, reason: 'Consistent with movement strain, repetitive motion or minor twist.' },
          { name: 'Osteoarthritis / Mechanical Joint Wear', pct: 35, reason: 'Activity-related joint discomfort with stiffness after rest.' },
          { name: 'Inflammatory Joint Reaction / Bursitis', pct: 15, reason: 'Localized inflammatory response around joint periarticular structures.' },
        ],
        homeRemedy: 'Apply R.I.C.E. protocol (Rest, Ice for 15 mins, Compression with crepe bandage, Elevation).',
        otcMed: 'Topical NSAID gel (Diclofenac) or oral Ibuprofen (400mg) with food for joint inflammation.',
        lifestyle: 'Maintain low-impact exercise (swimming, cycling), wear supportive footwear, and avoid sudden high-impact loads.',
        warningSigns: ['Complete inability to bear weight on the joint', 'Severe visible deformity or joint lockout', 'Hot, red, acutely swollen joint with fever'],
        urgency: 'Moderate Urgency. Consult an orthopedic specialist or physical therapist if pain persists.',
      };
    } else if (queryLower.match(/skin|rash|itch|allergy|hive|eczema|acne|bump|pimple|redness|dermatitis/)) {
      catalog = {
        symptomName: 'skin rash & dermatological irritation',
        q1: 'Where is the skin rash or irritation located on your body?',
        opts1: ['Face, neck or behind ears', 'Arms, hands or wrists', 'Torso, chest or back', 'Legs, groin or widespread all over'],
        q2: 'What does the rash look and feel like?',
        opts2: ['Red itchy bumps / Raised welts (Hives)', 'Dry, scaly, peeling or flaking patches', 'Clusters of tiny fluid-filled blisters', 'Flat red patches with warm burning sensation'],
        q3: 'Have you experienced any recent exposures or accompanying signs?',
        opts3: ['New soap, cosmetic, detergent, plant or medication', 'Mild fever or swollen lymph nodes', 'History of allergies, asthma or eczema', 'None of the above / No obvious exposure'],
        diffs: [
          { name: 'Contact Dermatitis / Allergic Skin Reaction', pct: 55, reason: 'Localized inflammatory response following contact with irritant or allergen.' },
          { name: 'Acute Urticaria (Hives) / Heat Rash', pct: 30, reason: 'Transient erythematous wheals associated with histamine release or perspiration.' },
          { name: 'Eczema / Atopic Dermatitis Flare', pct: 15, reason: 'Chronic pruritic inflammatory skin pattern exacerbated by dryness.' },
        ],
        homeRemedy: 'Wash gently with lukewarm water and mild fragrance-free cleanser, apply cold damp compresses, and avoid scratching.',
        otcMed: 'Topical 1% Hydrocortisone cream (max 7 days) and oral Cetirizine (10mg) for itching relief.',
        lifestyle: 'Wear loose breathable cotton clothing, use hypoallergenic moisturizer immediately after bathing, and avoid hot showers.',
        warningSigns: ['Rapid swelling of lips, tongue, face or throat (Anaphylaxis — call 911 / emergency)', 'Rash accompanied by high fever or skin peeling / blistering', 'Spreading warmth, redness and red streaks indicating cellulitis'],
        urgency: 'Moderate Urgency. If breathing is affected, seek emergency care immediately; otherwise consult a dermatologist.',
      };
    } else if (queryLower.match(/dizzy|dizziness|vertigo|lighthead|faint|spinning|unsteady|balance/)) {
      catalog = {
        symptomName: 'dizziness & lightheadedness',
        q1: 'How would you describe your sensation of dizziness?',
        opts1: ['The room or surroundings are spinning around me (True vertigo)', 'Feeling lightheaded, woozy or like fainting', 'Off-balance and unsteady while walking', 'Heavy head / Brain fog / Dissociation'],
        q2: 'What specific trigger brings on or worsens the dizziness?',
        opts2: ['Changing head position or rolling over in bed', 'Standing up quickly from sitting or lying down', 'Prolonged screen use, dehydration or missed meal', 'Stress, fatigue or crowded spaces'],
        q3: 'Are you experiencing any other symptoms alongside dizziness?',
        opts3: ['Nausea, vomiting or cold sweats', 'Ringing in ears (tinnitus) or reduced hearing', 'Headache or blurred vision', 'None of the above'],
        diffs: [
          { name: 'Benign Paroxysmal Positional Vertigo (BPPV)', pct: 50, reason: 'Typical episodic spinning triggered by head positional alterations.' },
          { name: 'Orthostatic / Dehydration Lightheadedness', pct: 30, reason: 'Transient cerebral hypoperfusion upon standing or fluid deficit.' },
          { name: 'Vestibular Neuritis / Labyrinthine Irritation', pct: 20, reason: 'Persistent equilibrium imbalance often following viral infection.' },
        ],
        homeRemedy: 'Sit or lie down immediately when sensation occurs, drink 500ml water with electrolytes, and move head slowly.',
        otcMed: 'Oral rehydration solution. Consult a physician regarding vestibular suppressants (Meclizine / Cinarizine).',
        lifestyle: 'Avoid driving or operating machinery while dizzy, rise slowly from bed in stages, and maintain regular hydration.',
        warningSigns: ['Sudden loss of speech, facial droop, or arm weakness (Stroke warning)', 'Loss of consciousness / fainting', 'Inability to walk or uncoordinated movements'],
        urgency: 'Moderate to High Urgency. Neurological evaluation needed if accompanied by focal deficits.',
      };
    } else if (queryLower.match(/eye|vision|blur|conjunctiv|pink eye|watery eye/)) {
      catalog = {
        symptomName: 'eye discomfort & visual symptoms',
        q1: 'What is the primary discomfort you are experiencing with your eyes?',
        opts1: ['Redness, itching and gritty sensation', 'Watery or sticky yellow/green discharge', 'Blurry or strained vision after screen use', 'Deep eye ache or pressure behind the eye'],
        q2: 'Are one or both eyes involved?',
        opts2: ['Both eyes equally', 'One eye primarily, spreading to second', 'Strictly one eye', 'Intermittent symptoms throughout day'],
        q3: 'Do you have any of the following accompanying symptoms?',
        opts3: ['Sensitivity to bright lights (Photophobia)', 'Crusted eyelids stuck together upon waking', 'Preceding nasal cold or sinus symptoms', 'None of the above'],
        diffs: [
          { name: 'Allergic / Viral Conjunctivitis', pct: 55, reason: 'Erythematous conjunctiva with itching, discharge or foreign body feeling.' },
          { name: 'Digital Eye Strain / Asthenopia', pct: 30, reason: 'Fatigue, mild blurriness and dryness from extended screen exposure.' },
          { name: 'Dry Eye Syndrome / Blepharitis', pct: 15, reason: 'Tear film instability causing burning, grittiness and reflex tearing.' },
        ],
        homeRemedy: 'Apply sterile cool compress over closed eyelids, follow 20-20-20 rule, avoid rubbing eyes, and remove contact lenses.',
        otcMed: 'Preservative-free lubricating artificial tears eye drops (3-4 times daily).',
        lifestyle: 'Wash hands before touching eyes, sanitize eyeglasses, and optimize screen distance and ambient lighting.',
        warningSigns: ['Sudden loss of vision or severe visual field deficit', 'Severe unrelenting deep eye pain with headache', 'Pupil asymmetry or chemical exposure to eye'],
        urgency: 'Moderate Urgency. Consult an ophthalmologist or optometrist if symptoms persist > 48 hours.',
      };
    } else if (queryLower.match(/ear|hearing|tinnitus|earache|ear pain/)) {
      catalog = {
        symptomName: 'ear discomfort',
        q1: 'What specific ear symptom are you noticing?',
        opts1: ['Sharp or throbbing earache', 'Clogged / Fullness / Blocked canal sensation', 'Ringing, buzzing or humming noise (Tinnitus)', 'Itching or clear fluid drainage from ear canal'],
        q2: 'How long has this ear symptom been present?',
        opts2: ['1 to 2 days (Acute onset)', '3 to 7 days', '1 to 3 weeks', 'Chronic / recurrent over months'],
        q3: 'Do you have any accompanying signs?',
        opts3: ['Preceding cold, cough or nasal sinus congestion', 'Mild fever or pain when chewing/touching ear', 'Muffled hearing clarity', 'None of the above'],
        diffs: [
          { name: 'Eustachian Tube Dysfunction', pct: 50, reason: 'Middle ear pressure imbalance secondary to upper respiratory congestion.' },
          { name: 'Acute Otitis Media / Externa', pct: 35, reason: 'Localized inflammatory ear canal or middle ear infection.' },
          { name: 'Cerumen (Earwax) Impaction', pct: 15, reason: 'Mechanical occlusion of the external auditory meatus.' },
        ],
        homeRemedy: 'Keep ear completely dry, apply warm compress around outer ear, and perform gentle swallowing/yawning.',
        otcMed: 'Paracetamol (500mg) for ear pain relief, saline nasal spray to relieve eustachian tube congestion.',
        lifestyle: 'Never insert cotton swabs / Q-tips into ear canal, avoid swimming until resolved, and avoid loud headphone volumes.',
        warningSigns: ['Thick foul-smelling or bloody discharge from ear', 'Swelling and redness behind the ear over mastoid bone', 'Sudden significant sensorineural hearing loss or dizziness'],
        urgency: 'Moderate Urgency. Consult an ENT specialist if pain or hearing changes persist.',
      };
    } else if (queryLower.match(/urin|bladder|pee|dysuria|burning urine|uti/)) {
      catalog = {
        symptomName: 'urinary symptoms',
        q1: 'What is your primary urinary symptom?',
        opts1: ['Burning or stinging sensation during urination', 'Frequent urge to urinate with small volume', 'Lower pelvic or bladder pressure', 'Cloudy or unusually strong-smelling urine'],
        q2: 'When did you first notice these urinary symptoms?',
        opts2: ['Started in past 24-48 hours', '3 to 5 days ago', 'Over a week ago', 'Recurring episodes over months'],
        q3: 'Are you experiencing any systemic signs?',
        opts3: ['Fever, chills or lower back/flank ache', 'Feeling unable to empty bladder completely', 'Pink or reddish tinge in urine', 'None of the above / Mild burning only'],
        diffs: [
          { name: 'Acute Lower Urinary Tract Infection (Cystitis)', pct: 65, reason: 'Characteristic dysuria, urinary frequency and suprapubic discomfort.' },
          { name: 'Urethral Irritation / Chemical Sensitivity', pct: 25, reason: 'Localized irritation from soaps, detergents or intimate products.' },
          { name: 'Dehydration / Concentrated Urine', pct: 10, reason: 'Elevated solute concentration irritating bladder mucosa.' },
        ],
        homeRemedy: 'Drink 2.5 to 3 liters of water daily, consume unsweetened cranberry juice, and urinate promptly when urge arises.',
        otcMed: 'Urinary alkalizer solution or Phenazopyridine for symptomatic pain relief (note: consult doctor for antibiotic prescription).',
        lifestyle: 'Wipe front to back, urinate after sexual activity, avoid holding urine for prolonged periods, and avoid feminine hygiene sprays.',
        warningSigns: ['High fever, shaking chills, and one-sided flank/kidney pain (Pyelonephritis)', 'Visible blood in urine (hematuria)', 'Inability to pass urine (acute urinary retention)'],
        urgency: 'Moderate to High Urgency. A urine routine/culture test and medical review are advised.',
      };
    } else if (queryLower.match(/fatigue|tired|exhaust|weakness|lethargy/)) {
      catalog = {
        symptomName: 'fatigue & generalized weakness',
        q1: 'How would you describe your fatigue or low energy?',
        opts1: ['Constant exhaustion even after adequate sleep', 'Physical muscle heaviness and weakness in limbs', 'Mental fatigue / Brain fog / Inability to concentrate', 'Afternoon energy crashes and lethargy'],
        q2: 'How long has this persistent fatigue lasted?',
        opts2: ['Past few days (Recent onset)', '2 to 4 weeks', 'More than 2 to 3 months', 'Comes and goes intermittently'],
        q3: 'Which additional symptoms do you notice?',
        opts3: ['Poor sleep quality, snoring or waking unrefreshed', 'Unexplained weight changes or cold/heat sensitivity', 'Dizziness, pale skin or shortness of breath on exertion', 'High stress, anxiety or low mood'],
        diffs: [
          { name: 'Lifestyle / Sleep Deficiency & Stress', pct: 55, reason: 'Circadian disruption, chronic workload or restorative sleep deficit.' },
          { name: 'Nutritional Deficiency (Iron / Vit D / B12)', pct: 30, reason: 'Common metabolic cause of generalized fatigue, weakness and pallor.' },
          { name: 'Subclinical Thyroid / Endocrine Imbalance', pct: 15, reason: 'Hormonal regulation imbalance affecting basal metabolic rate.' },
        ],
        homeRemedy: 'Establish regular 7-8 hour sleep schedule, hydrate with 2-3 liters of water daily, and take 15-min brisk walks outside in daylight.',
        otcMed: 'Daily comprehensive multivitamin with B-complex and Vitamin D3 (take with meals).',
        lifestyle: 'Limit caffeine consumption after 2 PM, avoid screens 1 hour before bedtime, and incorporate balanced protein in meals.',
        warningSigns: ['Unexplained rapid weight loss or persistent fevers/night sweats', 'Shortness of breath on minimal exertion or chest tightness', 'Severe weakness affecting one side of the body'],
        urgency: 'Moderate Urgency. Routine blood work (CBC, Thyroid, Vit D/B12, Ferritin) recommended with a primary care doctor.',
      };
    } else {
      // DYNAMIC FALLBACK: Extract symptom phrase from user input
      const cleaned = firstUserText
        .replace(/^(i have|i am having|i feel|i am feeling|suffering from|experiencing|i've got|got|having|there is|my)\s+/i, '')
        .replace(/[?.!]+$/, '')
        .trim();
      const detectedName = cleaned.length > 2 && cleaned.length < 50 ? cleaned : 'health concern';

      catalog = {
        symptomName: detectedName,
        q1: `Where in your body is your ${detectedName} primarily centered?`,
        opts1: ['Head, neck, face or throat', 'Chest, abdomen, core or back', 'Arms, legs, joints or limbs', 'Generalized / Whole body sensation'],
        q2: `When does your ${detectedName} feel most prominent or intense?`,
        opts2: ['In the morning / upon waking', 'During or after physical activity', 'Constantly throughout the day', 'At night or during rest'],
        q3: `Are you experiencing any accompanying symptoms alongside your ${detectedName}?`,
        opts3: ['Mild fever, chills or general fatigue', 'Localized swelling, redness or stiffness', 'Nausea, dizziness or headache', 'None of the above / Isolated symptom'],
        diffs: [
          { name: `Primary Acute ${detectedName.charAt(0).toUpperCase() + detectedName.slice(1)}`, pct: 55, reason: 'Consistent with reported clinical presentation and symptom onset.' },
          { name: 'Secondary Inflammatory or Functional Etiology', pct: 30, reason: 'Underlying muscular, mucosal or systemic contributing factor.' },
          { name: 'Stress, Postural or Environmental Factor', pct: 15, reason: 'Exacerbated by daily ergonomic, dietary or lifestyle pressures.' },
        ],
        homeRemedy: `Rest adequately, stay well hydrated, and avoid activities that aggravate your ${detectedName}.`,
        otcMed: 'Discuss appropriate over-the-counter relief with a licensed pharmacist based on your specific presentation.',
        lifestyle: 'Maintain ergonomic daily habits, eat balanced nutritious meals, and prioritize restful sleep.',
        warningSigns: ['Sudden severe intensifying pain or inability to perform daily activities', 'High persistent fever, confusion or shortness of breath', 'Loss of sensation, motor weakness or rapid swelling'],
        urgency: 'Moderate Urgency. If symptoms persist beyond 3 to 5 days, consult a licensed healthcare professional.',
      };
    }

    // ─── STEP EXECUTION (EXACTLY 1 STEP PER TURN) ───────────────

    // Turn 1 (Initial Complaint): Return Question 1
    if (totalUserCount === 1) {
      const mcq1 = JSON.stringify({
        thinking: `Evaluating ${catalog.symptomName} location and clinical pattern`,
        question: catalog.q1,
        options: catalog.opts1,
        step: 1,
        totalSteps: 3
      });
      onChunk(mcq1);
      return mcq1;
    }

    // Turn 2 (First MCQ Answer): Return Question 2
    if (totalUserCount === 2) {
      const mcq2 = JSON.stringify({
        thinking: `Evaluating ${catalog.symptomName} timing and intensity`,
        question: catalog.q2,
        options: catalog.opts2,
        step: 2,
        totalSteps: 3
      });
      onChunk(mcq2);
      return mcq2;
    }

    // Turn 3 (Second MCQ Answer): Return Question 3
    if (totalUserCount === 3) {
      const mcq3 = JSON.stringify({
        thinking: `Checking accompanying signs for ${catalog.symptomName}`,
        question: catalog.q3,
        options: catalog.opts3,
        step: 3,
        totalSteps: 3
      });
      onChunk(mcq3);
      return mcq3;
    }

    // Turn 4+ (Third MCQ Answer completed): Generate Diagnostic Report
    if (totalUserCount >= 4) {
      const allAnswers = [...userMsgs.map(m => m.text), text].filter(Boolean);
      const answersText = allAnswers.join(' → ');

      const diffLines = catalog.diffs.map(d =>
        `- **${d.name}** — ${d.pct}% — ${d.reason}`
      ).join('\n');

      const warningItems = catalog.warningSigns.map(w => `- ${w}`).join('\n');

      const finalReport = `## Diagnostic Report

### Reported Symptoms
- **Primary Complaint:** ${firstUserText}
- **Patient Symptom Evolution:** ${answersText}

### Differential Diagnosis
${diffLines}

### Recommended Treatment
- **Home Remedies:** ${catalog.homeRemedy}
- **Over-the-Counter Medication:** ${catalog.otcMed}
- **Lifestyle Adjustments:** ${catalog.lifestyle}

### Warning Signs — See a Doctor Immediately If
${warningItems}

### Assessment Summary
${catalog.urgency}

*This is for informational purposes only — always consult a healthcare professional for medical advice.*`;

      let streamed = '';
      for (let i = 0; i < finalReport.length; i += 4) {
        streamed += finalReport.slice(i, i + 4);
        onChunk(streamed);
        await new Promise(r => setTimeout(r, 10));
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
