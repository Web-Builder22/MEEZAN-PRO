import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../translations';

export interface ParsedVoiceDescription {
  textNote: string;
  audioDataUrl: string | null;
  durationLabel: string;
}

const VOICE_MARKER_REGEX = /\[VOICE_DESC:([0-9]+:[0-9]{2})\](data:audio\/[^\s]+)/i;

/**
 * Extracts optional text note and embedded base64 voice recording from a transaction description string.
 */
export function parseVoiceDescription(rawDescription?: string): ParsedVoiceDescription {
  if (!rawDescription) {
    return { textNote: '', audioDataUrl: null, durationLabel: '0:00' };
  }

  const match = rawDescription.match(VOICE_MARKER_REGEX);
  if (match) {
    const durationLabel = match[1] || '0:00';
    const audioDataUrl = match[2] || null;
    const textNote = rawDescription.replace(VOICE_MARKER_REGEX, '').trim();
    return {
      textNote,
      audioDataUrl,
      durationLabel
    };
  }

  // Also handle raw data:audio/... string if saved directly
  if (rawDescription.trim().startsWith('data:audio/')) {
    return {
      textNote: '',
      audioDataUrl: rawDescription.trim(),
      durationLabel: '0:00'
    };
  }

  return {
    textNote: rawDescription,
    audioDataUrl: null,
    durationLabel: '0:00'
  };
}

/**
 * Builds the serialized description string combining optional text note and recorded voice audio.
 */
export function buildVoiceDescriptionString(
  textNote: string,
  audioDataUrl: string | null,
  durationLabel = '0:00'
): string {
  const cleanText = textNote.trim();
  if (!audioDataUrl) {
    return cleanText;
  }
  const voiceTag = `[VOICE_DESC:${durationLabel}]${audioDataUrl}`;
  return cleanText ? `${cleanText} ${voiceTag}` : voiceTag;
}

/**
 * Returns a clean, human-readable string for PDF statements, WhatsApp messages, and search filters
 * so raw base64 audio data is never printed as text.
 */
export function formatPlainDescriptionText(
  rawDescription?: string,
  fallback = ''
): string {
  const { textNote, audioDataUrl, durationLabel } = parseVoiceDescription(rawDescription);
  if (audioDataUrl && textNote) {
    return `${textNote} (Voice Note ${durationLabel})`;
  }
  if (audioDataUrl) {
    return `Voice Note (${durationLabel})`;
  }
  return textNote || fallback;
}

function formatSeconds(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

/**
 * Compact inline audio player for playing back a recorded voice description inside ledger tables,
 * mobile transaction cards, and modal previews.
 */
export function VoiceNoteMiniPlayer({
  audioDataUrl,
  durationLabel = '0:00',
  language = 'en',
  onRemove
}: {
  audioDataUrl: string;
  durationLabel?: string;
  language?: Language;
  onRemove?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState(durationLabel);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCurrentTimeLabel(durationLabel);
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [audioDataUrl, durationLabel]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      const audio = new Audio(audioDataUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
          setCurrentTimeLabel(formatSeconds(audio.currentTime));
        }
      };

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration) && durationLabel === '0:00') {
          setCurrentTimeLabel(formatSeconds(audio.duration));
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTimeLabel(
          audio.duration && isFinite(audio.duration)
            ? formatSeconds(audio.duration)
            : durationLabel
        );
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-zinc-800/90 border border-[#059669]/30 dark:border-[#D4AF37]/30 text-xs max-w-full"
    >
      <button
        type="button"
        onClick={togglePlay}
        title={
          isPlaying
            ? language === 'en'
              ? 'Pause voice description'
              : 'آواز روکیں'
            : language === 'en'
            ? 'Play voice description'
            : 'ریکارڈ شدہ آواز سنیں'
        }
        className="h-7 w-7 rounded-lg bg-meezan-btn text-white flex items-center justify-center shrink-0 shadow-2xs cursor-pointer hover:opacity-95 transition-opacity"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 text-[#D4AF37]" />
        ) : (
          <Play className="h-3.5 w-3.5 text-[#D4AF37] ml-0.5" />
        )}
      </button>

      <div className="flex flex-col min-w-[90px] sm:min-w-[110px] flex-1">
        <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold text-[#064E3B] dark:text-emerald-300">
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3 w-3 text-[#059669] dark:text-[#D4AF37] shrink-0" />
            <span>{language === 'en' ? 'Voice Note' : 'آواز نوٹ'}</span>
          </span>
          <span className="font-mono tabular-nums text-slate-600 dark:text-zinc-300">
            {currentTimeLabel}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-emerald-200/70 dark:bg-zinc-700 overflow-hidden mt-1">
          <div
            className="h-full bg-[#059669] dark:bg-[#D4AF37] transition-all duration-150 rounded-full"
            style={{ width: `${isPlaying ? Math.max(progress, 8) : progress}%` }}
          />
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (audioRef.current) {
              audioRef.current.pause();
            }
            onRemove();
          }}
          title={language === 'en' ? 'Delete voice recording' : 'آواز حذف کریں'}
          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Renders a transaction's description anywhere in the UI (Customer Ledger Table, Mobile Cards, Dashboard).
 * If the description contains a saved voice recording, it renders the interactive audio player alongside any text note.
 */
export function TransactionDescriptionView({
  description,
  language = 'en',
  emptyLabel,
  compact = false
}: {
  description?: string;
  language?: Language;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const { textNote, audioDataUrl, durationLabel } = parseVoiceDescription(description);

  if (!textNote && !audioDataUrl) {
    return (
      <span className="text-slate-400 italic">
        {emptyLabel || (language === 'en' ? 'No note added' : 'کوئی تفصیل نہیں')}
      </span>
    );
  }

  if (compact && audioDataUrl) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <VoiceNoteMiniPlayer
          audioDataUrl={audioDataUrl}
          durationLabel={durationLabel}
          language={language}
        />
        {textNote && <span className="truncate">{textNote}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {audioDataUrl && (
        <VoiceNoteMiniPlayer
          audioDataUrl={audioDataUrl}
          durationLabel={durationLabel}
          language={language}
        />
      )}
      {textNote && <span className="break-words">{textNote}</span>}
    </div>
  );
}

interface VoiceDescriptionFieldProps {
  value: string;
  onChange: (newDescription: string) => void;
  language: Language;
  label: string;
  placeholder?: string;
}

/**
 * Description field for the 'Add Transaction' modal that records the user's raw voice audio
 * (without converting voice to text) and saves the voice recording directly as the transaction description.
 */
export default function VoiceDescriptionField({
  value,
  onChange,
  language,
  label,
  placeholder
}: VoiceDescriptionFieldProps) {
  const { textNote, audioDataUrl, durationLabel } = parseVoiceDescription(value);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const latestTextNoteRef = useRef<string>(textNote);

  useEffect(() => {
    latestTextNoteRef.current = textNote;
  }, [textNote]);

  const cleanupRecordingResources = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
    };
  }, []);

  const startVoiceRecording = async () => {
    setErrorMsg('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        language === 'en'
          ? 'Audio recording is not supported in this browser.'
          : 'اس براؤزر میں آواز ریکارڈنگ کی سہولت موجود نہیں۔'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsedSeconds(0);

      // Choose a compact supported audio MIME type
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of preferredTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            selectedMimeType = t;
            break;
          }
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 24000
      };
      if (selectedMimeType) {
        recorderOptions.mimeType = selectedMimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalDurationLabel = formatSeconds(Math.max(1, elapsedRef.current));
        const mimeType = recorder.mimeType || selectedMimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = typeof reader.result === 'string' ? reader.result : null;
          if (base64Audio) {
            const combined = buildVoiceDescriptionString(
              latestTextNoteRef.current,
              base64Audio,
              finalDurationLabel
            );
            onChange(combined);
          }
        };
        reader.readAsDataURL(blob);
        cleanupRecordingResources();
        setIsRecording(false);
      };

      recorder.onerror = () => {
        setErrorMsg(
          language === 'en'
            ? 'Recording failed. Please try again.'
            : 'ریکارڈنگ میں خرابی آئی۔ دوبارہ کوشش کریں۔'
        );
        cleanupRecordingResources();
        setIsRecording(false);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSeconds(elapsedRef.current);
      }, 1000);
    } catch (err: any) {
      cleanupRecordingResources();
      setIsRecording(false);
      setErrorMsg(
        language === 'en'
          ? 'Microphone permission denied. Please allow microphone access to record voice description.'
          : 'مائیکروفون کی اجازت نہیں ملی۔ آواز ریکارڈ کرنے کے لیے مائیک کی اجازت دیں۔'
      );
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupRecordingResources();
        setIsRecording(false);
      }
    } else {
      cleanupRecordingResources();
      setIsRecording(false);
    }
  };

  const handleTextInputChange = (newText: string) => {
    onChange(buildVoiceDescriptionString(newText, audioDataUrl, durationLabel));
  };

  const handleRemoveVoice = () => {
    onChange(buildVoiceDescriptionString(textNote, null));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          {label}
        </label>

        {/* Record / Stop Voice Button */}
        {!isRecording ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startVoiceRecording}
            id="record-voice-desc-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-2xs cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>
              {audioDataUrl
                ? language === 'en'
                  ? 'Re-record Voice'
                  : 'دوبارہ آواز ریکارڈ کریں'
                : language === 'en'
                ? 'Record Voice Description'
                : 'آواز بطور تفصیل ریکارڈ کریں'}
            </span>
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={stopVoiceRecording}
            id="stop-voice-desc-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-extrabold shadow-sm ring-4 ring-red-500/20 cursor-pointer"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>
              {language === 'en'
                ? `Stop & Save (${formatSeconds(elapsedSeconds)})`
                : `محفوظ کریں (${formatSeconds(elapsedSeconds)})`}
            </span>
          </motion.button>
        )}
      </div>

      {/* Active Voice Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
              </span>
              <div className="flex items-end gap-0.5 h-4">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <motion.span
                    key={bar}
                    animate={{ height: ['30%', '100%', '40%'] }}
                    transition={{
                      duration: 0.55,
                      repeat: Infinity,
                      delay: bar * 0.1
                    }}
                    className="w-1 bg-red-600 dark:bg-red-400 rounded-full inline-block"
                  />
                ))}
              </div>
              <span className="text-xs font-extrabold text-red-700 dark:text-red-300">
                {language === 'en'
                  ? 'Recording voice description...'
                  : 'تفصیل کے لیے آواز ریکارڈ ہو رہی ہے...'}
              </span>
            </div>
            <span className="text-xs font-mono font-extrabold text-red-700 dark:text-red-300 tabular-nums">
              {formatSeconds(elapsedSeconds)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Voice Recording Player Preview */}
      {!isRecording && audioDataUrl && (
        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-zinc-900 border border-[#059669]/30 dark:border-[#D4AF37]/30 flex items-center justify-between gap-2">
          <VoiceNoteMiniPlayer
            audioDataUrl={audioDataUrl}
            durationLabel={durationLabel}
            language={language}
            onRemove={handleRemoveVoice}
          />
          <span className="text-[11px] font-bold text-[#059669] dark:text-[#D4AF37] pr-1">
            {language === 'en' ? 'Saved as Description' : 'تفصیل میں محفوظ'}
          </span>
        </div>
      )}

      {/* Optional text input alongside or instead of voice */}
      <input
        type="text"
        value={textNote}
        onChange={(e) => handleTextInputChange(e.target.value)}
        placeholder={
          audioDataUrl
            ? language === 'en'
              ? 'Optional written note (voice description is attached)...'
              : 'اختیاری تحریری نوٹ (آواز محفوظ ہے)...'
            : placeholder ||
              (language === 'en'
                ? 'Type description or tap "Record Voice Description" above...'
                : 'تفصیل لکھیں یا اوپر بٹن دبا کر آواز ریکارڈ کریں...')
        }
        className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
      />

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
