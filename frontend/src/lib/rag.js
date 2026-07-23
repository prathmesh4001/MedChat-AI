import { apiUploadDocument, apiListDocuments, apiDeleteDocument, apiGetDocumentsContext } from './api-client';

// ─── PDF Text Extraction ─────────────────────────────────
export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return fullText.trim();
}

// ─── Image Text Extraction (Gemini Flash Vision) ────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT = `You are a medical document OCR specialist. Extract ALL text from this medical document image.

RULES:
1. Extract EVERY piece of text you can read — printed AND handwritten.
2. For handwritten text that is difficult to read, make your best interpretation and mark uncertain words with [?] after them.
3. Preserve the document structure: headers, patient info, vitals, prescriptions, notes.
4. For prescriptions, extract: drug name, dosage, frequency, duration.
5. For vitals, extract: BP, pulse, SpO2, temperature, weight, height, RBS, etc.
6. If you see a doctor's signature area, note the doctor's name and credentials if visible.
7. Output the extracted text in a clean, structured format.
8. Do NOT add any analysis or interpretation — just extract the raw text content.
9. If parts are completely illegible, mark them as [illegible].

Format your output as:
--- DOCUMENT HEADER ---
(clinic name, address, phone, etc.)

--- PATIENT INFORMATION ---
Name: ...
Age/Sex: ...
Date: ...
Registration/ID: ...

--- VITALS ---
(all measured values)

--- CLINICAL NOTES ---
(chief complaints, observations)

--- PRESCRIPTION ---
1. Drug name — dose — frequency — duration
2. ...

--- ADDITIONAL NOTES ---
(any other text on the document)`;

export async function extractTextFromImage(file) {
  const base64Full = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const base64Data = base64Full.split(',')[1];
  const mimeType = file.type || 'image/jpeg';

  // ─── Try Gemini Flash first ───
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `${EXTRACTION_PROMPT}\n\nExtract all text from this medical document image. Read both printed and handwritten text carefully.` },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (extractedText && extractedText.trim().length > 50) {
          return `[Extracted from image: ${file.name} — via Gemini Flash]\n\n${extractedText.trim()}`;
        }
      }
    } catch (err) {
      console.warn('Gemini extraction error, falling back to HuggingFace:', err.message);
    }
  }

  // ─── Fallback: HuggingFace Vision model ───
  try {
    const { API_KEY, API_URL, MODEL } = await import('../config');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all text from this medical document image.' },
              { type: 'image_url', image_url: { url: base64Full } },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content;
      if (extractedText && extractedText.trim().length > 50) {
        return `[Extracted from image: ${file.name} — via HuggingFace]\n\n${extractedText.trim()}`;
      }
    }
  } catch (err) {
    console.error('HuggingFace extraction also failed:', err);
  }

  return `[Medical Image: ${file.name}] — Image uploaded but text extraction failed. The AI will analyze this image visually during chat.`;
}

// ─── Upload & Store Document ─────────────────────────────
// Extracts text from file then saves to MongoDB via backend API
export async function uploadAndIndexDocument(file, userId) {
  // Extract text based on file type
  let text = '';
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    text = await extractTextFromPDF(file);
  } else if (fileType.startsWith('image/')) {
    text = await extractTextFromImage(file);
  } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
    text = await file.text();
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  if (!text || text.trim().length === 0) {
    throw new Error('No text could be extracted from the file');
  }

  // Save to backend (MongoDB)
  await apiUploadDocument(file.name, fileType, text);

  return {
    fileName: file.name,
    fileType,
    textLength: text.length,
    pages: (text.match(/--- Page \d+ ---/g) || []).length || 1,
  };
}

// ─── Get All User Documents Context (for RAG injection) ──
export async function getUserDocumentsContext(userId) {
  try {
    return await apiGetDocumentsContext();
  } catch (err) {
    console.error('Failed to get documents context:', err);
    return '';
  }
}

// ─── Format RAG Context (backward compat) ────────────────
export function formatRAGContext(results) {
  return typeof results === 'string' ? results : '';
}

// ─── List User Documents ─────────────────────────────────
export async function listUserDocuments(userId) {
  try {
    return await apiListDocuments();
  } catch (err) {
    console.error('List documents error:', err);
    return [];
  }
}

// ─── Delete User Document ────────────────────────────────
export async function deleteUserDocument(fileName, userId) {
  try {
    await apiDeleteDocument(fileName);
    return true;
  } catch (err) {
    console.error('Delete document error:', err);
    return false;
  }
}
