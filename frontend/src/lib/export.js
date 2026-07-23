/**
 * Export diagnosis as a professional medical report (PDF-ready).
 * Extracts the diagnostic report from AI responses and formats it
 * as a clean clinical document — no chat logs.
 */
export function exportDiagnosis(messages, sectionName = 'General Medical', patientData = null) {
  if (!messages.length) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const reportId = 'MCR-' + now.getFullYear() + '-' + Date.now().toString(36).toUpperCase().slice(-6);

  // Extract patient symptoms from user messages
  const patientSymptoms = messages
    .filter(m => m.role === 'user' && m.text)
    .map(m => m.text)
    .filter(t => t.length > 2);

  // Find the diagnostic report from AI (the longest AI message, or one containing "Diagnostic Report")
  const aiMessages = messages.filter(m => m.role === 'assistant' && m.text && m.text.length > 50);
  const reportMsg = aiMessages.find(m => m.text.includes('Diagnostic Report') || m.text.includes('Probable Causes') || m.text.includes('Assessment Summary'))
    || aiMessages[aiMessages.length - 1];

  if (!reportMsg) {
    const win = window.open('', '_blank');
    win.document.write('<html><body><h1>No diagnostic report available</h1><p>Complete a consultation first.</p></body></html>');
    win.document.close();
    return;
  }

  // Convert markdown to clean HTML
  const reportHtml = convertReportToHTML(reportMsg.text);

  const patientNameVal = patientData?.name || 'Anonymous';
  const patientAgeVal = patientData?.age ? `${patientData.age} Yrs` : 'N/A';
  const patientGenderVal = patientData?.gender || 'N/A';

  const html = `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title>Medical Diagnostic Report — ${reportId}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.7; background: #fff; }
      .page { max-width: 800px; margin: 0 auto; padding: 48px; }

      /* Header */
      .report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #0d9488; margin-bottom: 32px; }
      .header-left h1 { font-family: 'Manrope', sans-serif; font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
      .header-left .subtitle { font-size: 13px; color: #64748b; font-weight: 500; }
      .header-right { text-align: right; }
      .header-right .logo { font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 800; color: #0d9488; margin-bottom: 4px; }
      .header-right .meta { font-size: 11px; color: #94a3b8; line-height: 1.6; }

      /* Info Grid */
      .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 32px; }
      .info-card { background: #f8fafc; border-radius: 12px; padding: 16px 20px; border-left: 3px solid #0d9488; }
      .info-card .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
      .info-card .value { font-size: 14px; font-weight: 600; color: #0f172a; }

      /* Patient Symptoms */
      .symptoms-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
      .symptoms-box h3 { font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; color: #0d9488; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
      .symptoms-box ul { list-style: none; padding: 0; }
      .symptoms-box li { font-size: 13px; color: #334155; padding: 4px 0 4px 20px; position: relative; line-height: 1.6; }
      .symptoms-box li::before { content: ''; position: absolute; left: 4px; top: 12px; width: 6px; height: 6px; border-radius: 50%; background: #0d9488; }

      /* Report Content */
      .report-body { margin-bottom: 32px; }
      .report-body h2 { font-family: 'Manrope', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; padding: 16px 0 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
      .report-body h3 { font-family: 'Manrope', sans-serif; font-size: 15px; font-weight: 700; color: #0f766e; background: #f0fdfa; padding: 10px 16px; border-radius: 8px; border-left: 3px solid #0d9488; margin: 24px 0 12px; }
      .report-body h4 { font-size: 14px; font-weight: 700; color: #334155; margin: 16px 0 8px; }
      .report-body p { font-size: 13px; color: #334155; line-height: 1.8; margin-bottom: 10px; text-align: justify; }
      .report-body ul, .report-body ol { padding-left: 8px; margin: 8px 0 16px; list-style: none; }
      .report-body li { font-size: 13px; color: #334155; padding: 5px 0 5px 22px; position: relative; line-height: 1.7; }
      .report-body li::before { content: ''; position: absolute; left: 4px; top: 13px; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, #0d9488, #059669); }
      .report-body strong { font-weight: 700; color: #0f172a; }
      .report-body em { font-style: italic; color: #64748b; font-size: 12px; }
      .report-body hr { border: none; height: 1px; background: #e2e8f0; margin: 24px 0; }

      /* Urgency Badge */
      .urgency { display: inline-block; padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }
      .urgency-low { background: #dcfce7; color: #166534; }
      .urgency-moderate { background: #fef3c7; color: #92400e; }
      .urgency-high { background: #fecaca; color: #991b1b; }

      /* Footer */
      .footer { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e2e8f0; }
      .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
      .disclaimer p { font-size: 11px; color: #92400e; line-height: 1.6; margin: 0; }
      .disclaimer strong { color: #78350f; }
      .footer-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8; }
      .footer-bottom .brand { font-family: 'Manrope', sans-serif; font-weight: 800; color: #0d9488; font-size: 12px; }

      /* Signature Line */
      .signature { margin-top: 40px; display: flex; justify-content: flex-end; }
      .sig-box { text-align: center; min-width: 200px; }
      .sig-line { border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 11px; color: #64748b; }

      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { padding: 24px; }
        .no-print { display: none; }
      }
    </style>
  </head><body>
    <div class="page">
      <!-- Header -->
      <div class="report-header">
        <div class="header-left">
          <h1>Medical Diagnostic Report</h1>
          <div class="subtitle">${sectionName} — AI-Assisted Clinical Assessment</div>
        </div>
        <div class="header-right">
          <div class="logo">MedChat AI</div>
          <div class="meta">
            Report ID: ${reportId}<br>
            Generated: ${dateStr}<br>
            Time: ${timeStr}
          </div>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Patient Name</div>
          <div class="value">${escapeHtml(patientNameVal)}</div>
        </div>
        <div class="info-card">
          <div class="label">Age / Gender</div>
          <div class="value">${escapeHtml(patientAgeVal)} / ${escapeHtml(patientGenderVal)}</div>
        </div>
        <div class="info-card">
          <div class="label">Department</div>
          <div class="value">${sectionName}</div>
        </div>
      </div>

      <!-- Patient-Reported Symptoms -->
      <div class="symptoms-box">
        <h3>&#x1F4CB; Patient-Reported Symptoms</h3>
        <ul>
          ${patientSymptoms.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>

      <!-- Attached Scan Image (if available) -->
      ${patientData?.scanImage ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; text-align: center;">
        <h3 style="font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 12px; text-align: left; display: flex; align-items: center; gap: 8px;">
          📸 Attached Diagnostic Scan
        </h3>
        <img src="${patientData.scanImage}" style="max-height: 280px; max-width: 100%; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
      </div>
      ` : ''}

      <!-- Differential Diagnosis Chart -->
      ${buildDiffDxChart(reportMsg.text)}

      <!-- Diagnostic Report -->
      <div class="report-body">
        ${reportHtml}
      </div>

      <!-- Signature -->
      <div class="signature">
        <div class="sig-box">
          <div style="font-size: 13px; font-weight: 700; color: #0d9488; margin-bottom: 8px;">MedChat AI</div>
          <div class="sig-line">AI Diagnostic Engine</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="disclaimer">
          <p><strong>Disclaimer:</strong> This report is generated by an AI-powered clinical decision support system and is intended for informational purposes only. It does not constitute a medical diagnosis, professional medical advice, or a doctor-patient relationship. Always consult a qualified healthcare professional for any medical concerns. Do not disregard professional medical advice or delay seeking it based on this report.</p>
        </div>
        <div class="footer-bottom">
          <span class="brand">MedChat AI</span>
          <span>Powered by Gemma 3 27B · Report ${reportId} · ${dateStr}</span>
        </div>
      </div>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertReportToHTML(text) {
  let h = text;
  // Remove markdown code fences
  h = h.replace(/```[\s\S]*?```/g, '');
  // Bold
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // HR
  h = h.replace(/^---+$/gm, '<hr/>');
  // H2
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  // H3
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  // H4
  h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  // List items
  h = h.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  h = h.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>');
  // Numbered lists
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Paragraphs
  h = h.split('\n\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h[2-4]|ul|ol|li|hr|div|blockquote)/.test(p)) return p;
    return `<p>${p}</p>`;
  }).join('');
  // Clean up extra newlines
  h = h.replace(/\n/g, '<br/>');
  // Remove empty paragraphs
  h = h.replace(/<p>\s*<\/p>/g, '');
  return h;
}

function buildDiffDxChart(text) {
  const colors = ['#0d9488', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
  const lines = text.split('\n');
  const items = [];
  for (const line of lines) {
    const m = line.match(/\*\*(.+?)\*\*\s*[—–-]\s*(\d+)%\s*[—–-]\s*(.+)/);
    if (m) items.push({ name: m[1].trim(), pct: parseInt(m[2]), detail: m[3].trim(), color: colors[items.length % colors.length] });
  }
  if (items.length < 2) return '';

  return `<div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px;">
    <h3 style="font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; color: #0d9488; margin-bottom: 16px;">Differential Diagnosis — Probability Distribution</h3>
    ${items.map(it => `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(it.name)}</span>
          <span style="font-size: 14px; font-weight: 800; color: ${it.color};">${it.pct}%</span>
        </div>
        <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden;">
          <div style="width: ${it.pct}%; height: 100%; background: ${it.color}; border-radius: 6px;"></div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.5;">${escapeHtml(it.detail)}</p>
      </div>
    `).join('')}
  </div>`;
}
