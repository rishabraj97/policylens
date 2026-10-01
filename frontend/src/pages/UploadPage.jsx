import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  File,
  X,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Lock,
  Cpu,
  FileCode,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/common/Button';
import GlowCard from '../components/common/GlowCard';
import api from '../services/api';

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_TYPES = ['application/pdf', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Real Upload State: 'Idle' | 'Selected' | 'Uploading' | 'Processing' | 'Success' | 'Error'
  const [uploadState, setUploadState] = useState('Idle');
  const [uploadStatusText, setUploadStatusText] = useState('');

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndSetFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    // Check extension
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      setErrorMessage(
        `Unsupported file type "${extension}". Please upload a regulatory PDF (.pdf) or Plain Text (.txt) policy file.`
      );
      setUploadState('Error');
      return;
    }

    // Check size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > MAX_FILE_SIZE_MB) {
      setErrorMessage(
        `File is too large (${sizeInMB.toFixed(1)} MB). The maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`
      );
      setUploadState('Error');
      return;
    }

    setSelectedFile(file);
    setUploadState('Selected');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage('');
    setUploadState('Idle');
    setUploadStatusText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or upload a document before proceeding.');
      return;
    }

    try {
      setErrorMessage('');
      setUploadState('Uploading');
      setUploadStatusText('Uploading document to engine...');

      // Dynamic feedback while server extracts UTF-8 clauses with PyMuPDF
      const timer = setTimeout(() => {
        setUploadStatusText('Extracting clauses & preserving page boundaries...');
      }, 700);

      // Real multipart API upload
      const response = await api.uploadDocument(selectedFile);
      clearTimeout(timer);

      setUploadState('Success');
      setUploadStatusText('Extraction complete!');

      // Navigate to /analysis with the real extracted document and content
      navigate('/analysis', {
        state: {
          document: response.document,
          content: response.content,
          success: response.success,
        },
      });
    } catch (err) {
      setUploadState('Error');
      setErrorMessage(err.message || 'Failed to upload and extract document. Make sure FastAPI backend is active.');
    }
  };

  const isUploadingOrProcessing = uploadState === 'Uploading' || uploadState === 'Processing';

  return (
    <PageContainer maxWidth="max-w-4xl">
      {/* Background ambient lighting */}
      <div className="ambient-glow w-96 h-96 bg-cyan-500/10 top-1/4 left-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Page Header */}
      <div className="mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/40 mb-3 shadow-[0_0_12px_rgba(0,245,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real Document Ingestion Pipeline</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Upload a Policy
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
          Give PolicyLens a document. We'll turn complexity into clear compliance actions.
        </p>
      </div>

      <div className="space-y-6 relative z-10">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs sm:text-sm animate-fadeIn shadow-lg">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-semibold text-rose-300">Upload Notice: </span>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="ml-auto text-rose-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* High-Tech Drag and Drop Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !selectedFile && !isUploadingOrProcessing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all duration-300 backdrop-blur-xl ${
            isUploadingOrProcessing ? 'cursor-wait' : 'cursor-pointer'
          } ${
            dragActive
              ? 'border-neon-cyan bg-cyan-950/40 shadow-[0_0_35px_rgba(0,245,212,0.3)] scale-[0.99]'
              : selectedFile
              ? 'border-emerald-500/50 bg-[#0F172A]/90 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
              : 'border-slate-700/80 hover:border-cyan-500/50 bg-[#0B1020]/80 hover:shadow-[0_0_25px_rgba(0,245,212,0.12)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={handleFileChange}
            disabled={isUploadingOrProcessing}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="w-18 h-18 p-4 rounded-2xl bg-[#0F172A] border border-cyan-500/30 text-neon-cyan mb-5 shadow-[0_0_25px_rgba(0,245,212,0.2)] transition-transform group-hover:scale-105">
                <UploadCloud className="w-9 h-9" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Drag and drop your policy file here
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md">
                Upload regulations, contractual policies, or statutory drafts in PDF or TXT format.
              </p>

              <div className="mt-6">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 text-xs"
                >
                  Browse Local Files
                </Button>
              </div>

              {/* Supported format badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-400">
                <span className="px-2.5 py-1 bg-[#0F172A] border border-slate-700/80 rounded-lg text-slate-300">
                  PDF (PyMuPDF)
                </span>
                <span className="px-2.5 py-1 bg-[#0F172A] border border-slate-700/80 rounded-lg text-slate-300">
                  TXT (Plain Text)
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Max size: {MAX_FILE_SIZE_MB}MB</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-300">
                Document Selected &amp; Validated
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Ready for ingestion: click "Analyse Document" to extract clauses with page boundary preservation.
              </p>
            </div>
          )}
        </div>

        {/* Selected File Details & Extraction Status Card */}
        {selectedFile && (
          <GlowCard glowColor="emerald" elevated className="p-5 border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                  <File className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1 text-xs font-mono text-slate-400">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span className="uppercase text-cyan-400 font-bold">
                      {selectedFile.name.split('.').pop()}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready for analysis
                    </span>
                  </div>
                </div>
              </div>

              {/* Status or Remove Button */}
              <div className="flex items-center gap-3 shrink-0">
                {isUploadingOrProcessing ? (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-neon-cyan text-xs font-mono font-medium shadow-[0_0_15px_rgba(0,245,212,0.2)]">
                    <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
                    <span>{uploadStatusText}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </GlowCard>
        )}

        {/* Action Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>PyMuPDF extraction engine with UTF-8 normalization.</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleAnalyze}
            disabled={!selectedFile || isUploadingOrProcessing}
            loading={isUploadingOrProcessing}
            icon={ArrowRight}
            iconPosition="right"
            className="w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-[0_0_25px_rgba(0,245,212,0.4)]"
          >
            {isUploadingOrProcessing ? uploadStatusText : 'Analyse Document →'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

