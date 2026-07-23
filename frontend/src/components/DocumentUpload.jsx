import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadAndIndexDocument, listUserDocuments, deleteUserDocument } from '../lib/rag';

export default function DocumentUpload({ theme, onClose }) {
  const dark = theme === 'dark';
  const { user } = useAuth();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    const docs = await listUserDocuments(user.id);
    setDocuments(docs);
  };

  const handleUpload = async (files) => {
    if (!user || !files.length) return;
    setError('');
    setUploading(true);

    for (const file of files) {
      try {
        setUploadProgress(`Processing ${file.name}...`);

        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          setError(t('too_large', { name: file.name }));
          continue;
        }

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
          setError(t('unsupported_format', { name: file.name }));
          continue;
        }

        setUploadProgress(`${t('extracting')} ${file.name}...`);
        await new Promise(r => setTimeout(r, 100)); // Let UI update

        // Show specific progress for images (Vision AI takes longer)
        if (file.type.startsWith('image/')) {
          setUploadProgress(`Reading handwriting with AI — ${file.name}...`);
        } else {
          setUploadProgress(`${t('generating_embeddings')} ${file.name}...`);
        }
        const result = await uploadAndIndexDocument(file, user.id);

        setUploadProgress(`Done — ${result.textLength} characters extracted from ${file.name}`);
      } catch (err) {
        setError(t('failed_process', { name: file.name, error: err.message }));
      }
    }

    setUploading(false);
    setUploadProgress('');
    await loadDocuments();
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    handleUpload(files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const handleDelete = async (fileName) => {
    if (!user) return;
    const ok = await deleteUserDocument(fileName, user.id);
    if (ok) {
      setDocuments(d => d.filter(doc => doc.fileName !== fileName));
    }
  };

  const fileIcon = (type) => {
    if (type === 'application/pdf') return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    );
    if (type?.startsWith('image/')) return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden animate-fadeIn"
        style={{ background: dark ? 'var(--surface)' : '#ffffff', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)', color: 'var(--primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold font-display" style={{ color: 'var(--on-surface)' }}>{t('upload_medical_reports')}</h3>
              <p className="text-[11px]" style={{ color: 'var(--outline)' }}>{t('upload_subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-70"
            style={{ color: 'var(--outline)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Upload Zone */}
        <div className="px-6 py-5">
          <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${dragOver ? 'scale-[1.02]' : ''}`}
            style={{
              borderColor: dragOver ? 'var(--primary)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
              background: dragOver
                ? (dark ? 'rgba(122,215,198,0.04)' : 'rgba(0,121,107,0.02)')
                : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,image/*,application/pdf,text/plain" multiple hidden onChange={handleFileInput} />

            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: dark ? 'rgba(122,215,198,0.06)' : 'rgba(0,121,107,0.04)', color: 'var(--primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
              {dragOver ? t('drop_here') : t('drag_drop')}
            </p>
            <p className="text-xs" style={{ color: 'var(--outline)' }}>
              {t('file_limit')}
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl animate-fadeIn"
              style={{ background: dark ? 'rgba(122,215,198,0.04)' : 'rgba(0,121,107,0.03)' }}>
              <div className="w-5 h-5 border-2 border-t-[var(--primary)] rounded-full animate-spin"
                style={{ borderColor: 'var(--outline-variant)', borderTopColor: 'var(--primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>{uploadProgress}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl animate-fadeIn"
              style={{ background: dark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', color: '#ef4444' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="px-6 pb-5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3 font-display" style={{ color: 'var(--outline)' }}>
              {t('indexed_documents')} ({documents.length})
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl group"
                  style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: dark ? 'rgba(122,215,198,0.08)' : 'rgba(0,121,107,0.06)', color: 'var(--primary)' }}>
                      {fileIcon(doc.fileType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>{doc.fileName}</p>
                      <p className="text-[10px]" style={{ color: 'var(--outline)' }}>
                        {new Date(doc.createdAt).toLocaleDateString()} · {doc.charCount ? `${(doc.charCount / 1024).toFixed(1)} KB` : '0 KB'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(doc.fileName)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    style={{ color: '#ef4444' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="px-6 pb-5">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-[11px]"
            style={{ background: dark ? 'rgba(122,215,198,0.03)' : 'rgba(0,121,107,0.02)', color: 'var(--outline)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--primary)' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{t('upload_info')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
