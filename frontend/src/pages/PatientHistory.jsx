import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  apiGetSessionSummary,
  apiListDocuments,
  apiDeleteDocument,
} from '../lib/api-client';
import Toast from '../components/Toast';

// ─── Section metadata ────────────────────────────────────────
const SECTION_META = {
  general:  { label: 'Symptom Check',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '🏥', path: '/general'  },
  research: { label: 'Medical Research', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '🔬', path: '/research' },
  xray:     { label: 'X-Ray Analysis',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  icon: '📷', path: '/xray'     },
  mri:      { label: 'MRI Scan',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: '🧠', path: '/mri'      },
  ct:       { label: 'CT Scan',          color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  icon: '🧬', path: '/ct'       },
};

const FILTER_TABS = [
  { key: 'all',      label: 'All'         },
  { key: 'general',  label: 'Symptom Check' },
  { key: 'research', label: 'Research'    },
  { key: 'xray',     label: 'X-Ray'       },
  { key: 'mri',      label: 'MRI'         },
  { key: 'ct',       label: 'CT Scan'     },
];

// ─── Date grouping helpers ───────────────────────────────────
const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older'];

function getDateGroup(dateStr) {
  const now       = new Date();
  const date      = new Date(dateStr);
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo   = new Date(today.getTime() - 6 * 86_400_000);
  if (date >= today)     return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo)   return 'This Week';
  return 'Older';
}

function groupSessionsByDate(sessions) {
  const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  sessions.forEach(s => groups[getDateGroup(s.createdAt)].push(s));
  return GROUP_ORDER
    .map(label => ({ label, sessions: groups[label] }))
    .filter(g => g.sessions.length > 0);
}

// ─── Format helpers ──────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtCharCount(n) {
  if (!n) return '—';
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(1)}k chars`;
}
function fileIcon(fileType = '') {
  if (fileType === 'application/pdf')   return '📄';
  if (fileType.startsWith('image/'))    return '🖼️';
  return '📃';
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, value, label, accentColor, dark }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: accentColor + '20' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold font-display" style={{ color: 'var(--on-surface)' }}>
          {value ?? '—'}
        </p>
        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--outline)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Session Card ────────────────────────────────────────────
function SessionCard({ session, dark, onResume }) {
  const meta    = SECTION_META[session.section] || SECTION_META.general;
  const preview = session.preview
    ? session.preview.length > 110
      ? session.preview.slice(0, 110) + '…'
      : session.preview
    : 'No preview available.';

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.025)' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon + title */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
            style={{ background: meta.bg }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: 'var(--on-surface)' }}
            >
              {session.title || `${meta.label} Session`}
            </p>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
        </div>

        {/* Date + time */}
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
            {fmtDate(session.createdAt)}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--outline)' }}>
            {fmtTime(session.createdAt)}
          </p>
        </div>
      </div>

      {/* Preview snippet */}
      <p
        className="mt-3 text-xs leading-relaxed"
        style={{
          color: 'var(--on-surface-variant)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {preview}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        {/* Message count */}
        <div className="flex items-center gap-1.5" style={{ color: 'var(--outline)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[11px] font-medium">
            {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Continue Chat */}
        <button
          onClick={() => onResume(session)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold
                     transition-all duration-200 hover:scale-[1.04] active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)', color: '#fff' }}
        >
          Continue Chat
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Document Card ───────────────────────────────────────────
function DocumentCard({ doc, dark, onDelete, deletingFileName }) {
  const isDeleting = deletingFileName === doc.fileName;

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition-all duration-200"
      style={{
        background: dark ? 'rgba(255,255,255,0.025)' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
      }}
    >
      {/* File icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)' }}
      >
        {fileIcon(doc.fileType)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>
          {doc.fileName}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--outline)' }}>
          {fmtDate(doc.createdAt)} · {fmtCharCount(doc.charCount)}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(doc.fileName)}
        disabled={isDeleting}
        title="Delete document"
        className="w-8 h-8 rounded-lg flex items-center justify-center
                   transition-all hover:opacity-70 disabled:opacity-30 shrink-0"
        style={{ color: '#f87171' }}
      >
        {isDeleting ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Recharts custom tooltip ─────────────────────────────────
function ChartTooltip({ active, payload, label, dark }) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  return (
    <div
      className="px-3 py-2 rounded-xl shadow-xl text-xs font-semibold"
      style={{
        background: dark ? '#1e293b' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(122,215,198,0.2)' : '#e2e8f0'}`,
        color: 'var(--on-surface)',
      }}
    >
      <p className="mb-0.5" style={{ color: 'var(--outline)' }}>{label}</p>
      <p style={{ color: '#7ad7c6' }}>
        {count} consultation{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────
function Skeleton({ dark, className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
    />
  );
}

// ════════════════════════════════════════════════════════════
// ─── Patient History Page ────────────────────────────────────
// ════════════════════════════════════════════════════════════
export default function PatientHistory({ theme, onLoadSession }) {
  const dark     = theme === 'dark';
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [summary,      setSummary]      = useState(null);
  const [documents,    setDocuments]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [deletingDoc,  setDeletingDoc]  = useState(null);   // fileName being deleted
  const [toast,        setToast]        = useState({ show: false, message: '' });

  const showToast = (msg) => setToast({ show: true, message: msg });

  // ── Data fetching ──────────────────────────────────────────
  // Both requests run in parallel. Summary provides session list +
  // stats; documents provides the Document Vault list.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, docs] = await Promise.all([
        apiGetSessionSummary(),
        apiListDocuments(),
      ]);
      setSummary(sum);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      showToast('Failed to load history: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Session resume ─────────────────────────────────────────
  // Delegates to the existing handleLoadSession in AppShell (App.jsx),
  // which sets activeSession state and navigates to the correct section
  // page. The ChatPage / ScanAnalysis page then loads the messages via
  // apiGetMessages() using the session id.
  const handleResume = useCallback((session) => {
    if (onLoadSession) {
      onLoadSession({
        id:      session.id,
        section: session.section,
        title:   session.title,
      });
    }
  }, [onLoadSession]);

  // ── Document delete ────────────────────────────────────────
  const handleDeleteDoc = useCallback(async (fileName) => {
    setDeletingDoc(fileName);
    try {
      await apiDeleteDocument(fileName);
      setDocuments(prev => prev.filter(d => d.fileName !== fileName));
      showToast('Document deleted.');
    } catch (err) {
      showToast('Delete failed: ' + err.message);
    } finally {
      setDeletingDoc(null);
    }
  }, []);

  // ── Filter + group sessions ────────────────────────────────
  const filteredSessions = (summary?.sessions || []).filter(
    s => activeFilter === 'all' || s.section === activeFilter
  );
  const groupedSessions = groupSessionsByDate(filteredSessions);

  // ── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6"
        style={{ background: 'var(--bg)' }}
      >
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <Skeleton dark={dark} className="h-8 w-52" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} dark={dark} className="h-24" />)}
          </div>
          <Skeleton dark={dark} className="h-52" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} dark={dark} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-y-auto"
      style={{ background: 'var(--bg)' }}
    >
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* ════ Page Header ════ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold font-display" style={{ color: 'var(--on-surface)' }}>
              Patient History
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--outline)' }}>
              Your complete consultation and health record activity
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                       transition-all hover:opacity-80 active:scale-95"
            style={{
              background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)',
              color: 'var(--primary)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ════ Stats Cards ════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon="🩺"
            value={summary?.totalSessions}
            label="Total Consultations"
            accentColor="#10b981"
            dark={dark}
          />
          <StatCard
            icon="📄"
            value={summary?.totalDocuments}
            label="Uploaded Reports"
            accentColor="#3b82f6"
            dark={dark}
          />
          <StatCard
            icon="📅"
            value={summary?.daysActive}
            label="Days Active"
            accentColor="#8b5cf6"
            dark={dark}
          />
          <StatCard
            icon="💬"
            value={summary?.totalMessages}
            label="Total Messages"
            accentColor="#f59e0b"
            dark={dark}
          />
        </div>

        {/* ════ Activity Chart ════ */}
        {/* Recharts BarChart — consultations per month (last 6 months).
            Custom tooltip matches the app's dark/light theme.          */}
        {summary?.monthlyConsultations?.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: dark ? 'rgba(255,255,255,0.025)' : '#ffffff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
            }}
          >
            <h2
              className="text-sm font-bold mb-1 font-display"
              style={{ color: 'var(--on-surface)' }}
            >
              Consultations Per Month
            </h2>
            <p className="text-[11px] mb-4" style={{ color: 'var(--outline)' }}>
              Last 6 months
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={summary.monthlyConsultations}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip dark={dark} />}
                  cursor={{ fill: dark ? 'rgba(122,215,198,0.04)' : 'rgba(0,121,107,0.04)' }}
                />
                <Bar
                  dataKey="count"
                  fill="#7ad7c6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ════ Consultation Timeline ════ */}
        <div>
          {/* Section filter tabs */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <h2
              className="text-sm font-bold font-display mr-1"
              style={{ color: 'var(--on-surface)' }}
            >
              Consultations
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200"
                  style={{
                    background: activeFilter === tab.key
                      ? 'var(--primary)'
                      : dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    color: activeFilter === tab.key ? '#ffffff' : 'var(--outline)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {filteredSessions.length === 0 && (
            <div
              className="text-center py-16 rounded-2xl"
              style={{
                background: dark ? 'rgba(255,255,255,0.015)' : '#f8fafc',
                border: `1px dashed ${dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
              }}
            >
              <div className="text-4xl mb-3">🩺</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                No consultations found
              </p>
              <p className="text-xs mt-1 mb-5" style={{ color: 'var(--outline)' }}>
                {activeFilter === 'all'
                  ? 'Start a consultation from General Medical or any scan section.'
                  : `No ${SECTION_META[activeFilter]?.label || activeFilter} sessions yet.`}
              </p>
              <button
                onClick={() => navigate('/general')}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white
                           transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #7ad7c6, #006156)' }}
              >
                Start First Consultation
              </button>
            </div>
          )}

          {/* Date-grouped session cards */}
          <div className="space-y-6">
            {groupedSessions.map(group => (
              <div key={group.label}>
                {/* Group header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--outline)' }}
                  >
                    {group.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }}
                  />
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)',
                      color: 'var(--primary)',
                    }}
                  >
                    {group.sessions.length}
                  </span>
                </div>

                {/* Session card grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      dark={dark}
                      onResume={handleResume}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════ Document Vault ════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2
              className="text-sm font-bold font-display"
              style={{ color: 'var(--on-surface)' }}
            >
              Document Vault
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: dark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
                color: '#3b82f6',
              }}
            >
              {documents.length} file{documents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {documents.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl"
              style={{
                background: dark ? 'rgba(255,255,255,0.015)' : '#f8fafc',
                border: `1px dashed ${dark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
              }}
            >
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                No documents uploaded
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--outline)' }}>
                Upload lab reports or prescriptions from the General Medical section.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  dark={dark}
                  onDelete={handleDeleteDoc}
                  deletingFileName={deletingDoc}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding so last card isn't flush with viewport edge */}
        <div className="h-4" />
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: '' })}
        theme={theme}
      />
    </div>
  );
}
