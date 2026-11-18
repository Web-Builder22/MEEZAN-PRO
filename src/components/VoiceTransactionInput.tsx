import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, AlertCircle, X, Settings } from 'lucide-react';
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

interface MicErrorState {
  title: string;
  message: string;
  settingsHint?: string;
}

/**
 * Description field for the 'Add Transaction' modal that records the user's raw voice audio
 * (without converting voice to text) and saves the voice recording directly as the transaction description.
 *
 * IMPORTANT PERMISSION GUARANTEE:
 * - Never requests or queries microphone access on mount, login, or navigation.
 * - Microphone permission is checked and requested strictly inside `handleMicButtonClick`
 *   when the user explicitly clicks the microphone button.
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
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micError, setMicError] = useState<MicErrorState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);
  const latestTextNoteRef = useRef<string>(textNote);

  useEffect(() => {
    latestTextNoteRef.current = textNote;
  }, [textNote]);

  /**
   * Stops the active timer and immediately stops & releases all microphone MediaStreamTracks.
   */
  const releaseMicrophoneTracks = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch {
          // Ignore track stop errors if already ended
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Ensure tracks are released if the modal closes or component unmounts mid-recording
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      mediaRecorderRef.current = null;
      releaseMicrophoneTracks();
    };
  }, [releaseMicrophoneTracks]);

  /**
   * Triggered ONLY when the user explicitly clicks the microphone / record button.
   * 1. Checks if the browser supports MediaDevices API.
   * 2. Checks if microphone permission is already granted or denied via Permissions API.
   * 3. Requests microphone access via `navigator.mediaDevices.getUserMedia({ audio: true })`.
   * 4. Starts recording only after permission is granted.
   */
  const handleMicButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard against programmatic or non-user-initiated triggers
    if (e.nativeEvent && e.nativeEvent.isTrusted === false) {
      return;
    }

    if (isRecording || isRequestingPermission) {
      return;
    }

    setMicError(null);

    // 1. Check browser support for MediaDevices API and MediaRecorder
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicError({
        title:
          language === 'en'
            ? 'Voice Recording Not Supported'
            : 'آواز ریکارڈنگ کی سہولت موجود نہیں',
        message:
          language === 'en'
            ? 'Your current browser does not support microphone audio recording. Please use a modern browser such as Chrome, Edge, or Safari over a secure (HTTPS) connection.'
            : 'آپ کا موجودہ براؤزر مائیکروفون ریکارڈنگ کو سپورٹ نہیں کرتا۔ براہ کرم کروم، ایج یا سفاری استعمال کریں۔'
      });
      return;
    }

    setIsRequestingPermission(true);

    try {
      // 2. Check existing microphone permission status if Permissions API is available
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: 'microphone' as PermissionName
          });

          if (permissionStatus.state === 'denied') {
            setIsRequestingPermission(false);
            setMicError({
              title:
                language === 'en'
                  ? 'Microphone Access is Blocked'
                  : 'مائیکروفون کی اجازت بلاک ہے',
              message:
                language === 'en'
                  ? 'Meezan Flow needs microphone access to record your voice note, but permission is currently blocked.'
                  : 'آواز کا نوٹ ریکارڈ کرنے کے لیے مائیکروفون کی اجازت درکار ہے جو اس وقت بلاک ہے۔',
              settingsHint:
                language === 'en'
                  ? 'How to enable: Click the lock or site-settings icon in your browser address bar, set "Microphone" to "Allow", and click Record Voice Description again.'
                  : 'اجازت دینے کا طریقہ: براؤزر کے ایڈریس بار میں لاک (Lock) آئیکن پر کلک کریں، مائیکروفون کو "Allow" کریں اور دوبارہ بٹن دبائیں۔'
            });
            return;
          }
        } catch {
          // Some browsers do not support 'microphone' in navigator.permissions.query;
          // fall through to navigator.mediaDevices.getUserMedia({ audio: true })
        }
      }

      // 3. Request microphone stream (prompts user if state is 'prompt', or resolves immediately if 'granted')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 4. Start recording only after permission is granted and stream is active
      streamRef.current = stream;
      chunksRef.current = [];
      elapsedRef.current = 0;
      isCancelledRef.current = false;
      setElapsedSeconds(0);

      // Choose a compact supported audio MIME type
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      let selectedMimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
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

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = isCancelledRef.current;
        const recordedChunks = [...chunksRef.current];
        const finalDurationLabel = formatSeconds(Math.max(1, elapsedRef.current));
        const mimeType = recorder.mimeType || selectedMimeType || 'audio/webm';

        // Always release microphone tracks immediately when recording stops or is cancelled
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        releaseMicrophoneTracks();
        setIsRecording(false);
        setElapsedSeconds(0);

        if (wasCancelled || recordedChunks.length === 0) {
          return;
        }

        const blob = new Blob(recordedChunks, { type: mimeType });
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
      };

      recorder.onerror = () => {
        releaseMicrophoneTracks();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setMicError({
          title: language === 'en' ? 'Recording Interrupted' : 'ریکارڈنگ میں خرابی',
          message:
            language === 'en'
              ? 'An unexpected error occurred while recording audio. Please try again.'
              : 'آواز ریکارڈ کرتے وقت خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔'
        });
      };

      recorder.start(250);
      setIsRequestingPermission(false);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSeconds(elapsedRef.current);
      }, 1000);
    } catch (err: any) {
      releaseMicrophoneTracks();
      mediaRecorderRef.current = null;
      setIsRequestingPermission(false);
      setIsRecording(false);

      const errorName = err?.name || '';
      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'SecurityError'
      ) {
        setMicError({
          title:
            language === 'en'
              ? 'Microphone Permission Denied'
              : 'مائیکروفون کی اجازت نہیں ملی',
          message:
            language === 'en'
              ? 'You declined microphone access, so voice recording could not start. You can still type your transaction description below.'
              : 'مائیکروفون کی اجازت نہ ملنے کی وجہ سے آواز ریکارڈ نہیں ہو سکی۔ آپ نیچے تحریری تفصیل لکھ سکتے ہیں۔',
          settingsHint:
            language === 'en'
              ? 'To enable microphone access: Click the lock / tune icon next to the URL in your browser address bar, change "Microphone" permission to "Allow", and then click the microphone button again.'
              : 'مائیکروفون آن کرنے کے لیے: اپنے براؤزر کے ایڈریس بار میں لاک آئیکن پر کلک کریں، "Microphone" کو "Allow" کریں، اور دوبارہ مائیک بٹن دبائیں۔'
        });
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setMicError({
          title:
            language === 'en' ? 'No Microphone Detected' : 'کوئی مائیکروفون نہیں ملا',
          message:
            language === 'en'
              ? 'No microphone device was found on your system. Please connect a microphone or headset and try again.'
              : 'آپ کے آلے کے ساتھ کوئی مائیکروفون منسلک نہیں ملا۔ براہ کرم مائیک چیک کریں اور دوبارہ کوشش کریں۔'
        });
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setMicError({
          title:
            language === 'en' ? 'Microphone is Busy' : 'مائیکروفون مصروف ہے',
          message:
            language === 'en'
              ? 'Your microphone is currently being used by another application or browser tab. Please close other apps using the mic and try again.'
              : 'آپ کا مائیکروفون کسی دوسری ایپ میں استعمال ہو رہا ہے۔ براہ کرم اسے بند کر کے دوبارہ کوشش کریں۔'
        });
      } else {
        setMicError({
          title:
            language === 'en'
              ? 'Could Not Access Microphone'
              : 'مائیکروفون تک رسائی ممکن نہیں ہوئی',
          message:
            language === 'en'
              ? 'Unable to start microphone recording. Please check your browser microphone settings and try again.'
              : 'مائیکروفون شروع نہیں ہو سکا۔ براہ کرم اپنے براؤزر کی مائیک سیٹنگز چیک کریں۔'
        });
      }
    }
  };

  /**
   * Stops recording, saves the voice note, and releases all microphone tracks.
   */
  const stopVoiceRecording = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        releaseMicrophoneTracks();
        mediaRecorderRef.current = null;
        setIsRecording(false);
      }
    } else {
      releaseMicrophoneTracks();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  /**
   * Cancels recording without overwriting existing data and immediately releases microphone tracks.
   */
  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    chunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        releaseMicrophoneTracks();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setElapsedSeconds(0);
      }
    } else {
      releaseMicrophoneTracks();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setElapsedSeconds(0);
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          {label}
        </label>

        {/* Record / Stop / Cancel Voice Controls */}
        {!isRecording ? (
          <motion.button
            type="button"
            whileHover={{ scale: isRequestingPermission ? 1 : 1.02 }}
            whileTap={{ scale: isRequestingPermission ? 1 : 0.97 }}
            onClick={handleMicButtonClick}
            disabled={isRequestingPermission}
            id="record-voice-desc-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <Mic className={`h-3.5 w-3.5 text-[#D4AF37] ${isRequestingPermission ? 'animate-pulse' : ''}`} />
            <span>
              {isRequestingPermission
                ? language === 'en'
                  ? 'Checking Mic Permission...'
                  : 'مائیک کی اجازت چیک ہو رہی ہے...'
                : audioDataUrl
                ? language === 'en'
                  ? 'Re-record Voice'
                  : 'دوبارہ آواز ریکارڈ کریں'
                : language === 'en'
                ? 'Record Voice Description'
                : 'آواز بطور تفصیل ریکارڈ کریں'}
            </span>
          </motion.button>
        ) : (
          <div className="flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={cancelVoiceRecording}
              id="cancel-voice-desc-btn"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-extrabold cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'Cancel' : 'منسوخ'}</span>
            </motion.button>

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
          </div>
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

      {/* Friendly Microphone Permission / Hardware Error Banner */}
      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{micError.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setMicError(null)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 p-0.5 rounded cursor-pointer"
                title={language === 'en' ? 'Dismiss' : 'بند کریں'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-amber-800 dark:text-amber-200/90 font-medium leading-relaxed">
              {micError.message}
            </p>
            {micError.settingsHint && (
              <div className="flex items-start gap-1.5 pt-1 text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-white/80 dark:bg-zinc-900/70 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                <Settings className="h-3.5 w-3.5 text-[#059669] shrink-0 mt-0.5" />
                <span>{micError.settingsHint}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

