import { useEffect, useMemo, useState } from 'react';
import nicxsAvatar from './assets/nicxs.webp';

// Brand values from env (VITE_ prefix is required for Vite to expose them to the browser).
const BRAND_TERM = import.meta.env.VITE_BRAND_TERM || 'Brand';
const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Brand Redemption';
// Short logo mark derived from the brand term (e.g. "Siomai" -> "SI").
const BRAND_MARK = BRAND_TERM.slice(0, 2).toUpperCase();

const THEME_KEY = 'app-theme';
// Set once the user dismisses the About modal — used to auto-open it only for new visitors.
const INFO_SEEN_KEY = 'about-seen';
const THEME_OPTIONS = ['light', 'system', 'dark'];

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_KEY);
  return THEME_OPTIONS.includes(stored) ? stored : 'system';
}

function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      root.setAttribute('data-theme', resolved);
    };

    apply();
    window.localStorage.setItem(THEME_KEY, theme);

    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);

  return [theme, setTheme];
}

const initialResponses = {
  send: '',
  verify: ''
};

/* Friendly copy for the send step, keyed by the upstream `code` field. */
const SEND_MESSAGES = {
  0: { state: 'success', title: 'Code sent', text: "We've emailed your verification code. Check your inbox and spam folder." },
  10001: { state: 'error', title: 'Invalid email', text: 'That email address is missing or invalid. Please check it and try again.' },
  10004: { state: 'error', title: 'Session expired', text: 'The server could not authenticate with the upstream service. The access token needs to be refreshed.' }
};

function formatResponse(value) {
  if (!value) return 'No response yet.';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- IMEI helpers (GSMA standard: 14-digit payload + Luhn check) ---------- */

// Luhn check digit for a payload string (every 2nd digit from the right is doubled).
function luhnCheckDigit(payload) {
  let sum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    let d = Number(payload[i]);
    if ((payload.length - i) % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

// True only for a 15-digit string whose Luhn checksum is valid.
function isValidImei(imei) {
  if (!/^[0-9]{15}$/.test(imei)) return false;
  return luhnCheckDigit(imei.slice(0, 14)) === Number(imei[14]);
}

function randomDigit() {
  return String(Math.floor(Math.random() * 10));
}

// Build a valid IMEI from a partial one: keep the given digits, pad with random
// digits up to a 14-digit payload, then append the Luhn check digit.
function completeImei(partial) {
  let payload = String(partial || '').replace(/\D/g, '').slice(0, 14);
  while (payload.length < 14) payload += randomDigit();
  return payload + luhnCheckDigit(payload);
}

// Fully random valid IMEI. Starts with "86" (common China reporting-body prefix).
function generateImei() {
  let payload = '86';
  while (payload.length < 14) payload += randomDigit();
  return payload + luhnCheckDigit(payload);
}

/**
 * Turn a raw response body into a { state, title, text }.
 * Decides success/error from the upstream `code` field — NOT the HTTP status,
 * since errors like "please login" still return HTTP 200.
 *
 * - send:   uses friendly canned copy (SEND_MESSAGES).
 * - verify: headline = the short upstream `info` reason (e.g. "risk reject"),
 *   paragraph = the human-readable `msg` sentence. Both capitalized, each falling
 *   back to the other (then a generic default) when missing.
 */
function interpret(kind, text) {
  if (!text) return null;

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON body (e.g. the server's "No activity found" message) — show as-is.
    return { state: 'error', title: 'Notice', text: capitalize(text) };
  }

  if (json && typeof json.code !== 'undefined') {
    const ok = json.code === 0;

    if (kind === 'verify') {
      const message =
        json.msg || json.info || (ok ? 'Request completed successfully.' : `Unexpected response (code ${json.code}).`);
      const headline = json.info || json.msg || (ok ? 'Success' : 'Error');
      return {
        state: ok ? 'success' : 'error',
        title: capitalize(headline),
        text: capitalize(message)
      };
    }

    if (SEND_MESSAGES[json.code]) return SEND_MESSAGES[json.code];
    return {
      state: ok ? 'success' : 'error',
      title: ok ? 'Success' : 'Something went wrong',
      text: json.msg || json.info || `Unexpected response (code ${json.code}).`
    };
  }

  return { state: 'error', title: 'Notice', text };
}

function isSuccess(kind, text) {
  const result = interpret(kind, text);
  return result?.state === 'success';
}

// True when the response complains specifically about the IMEI (e.g. "imei is invalid").
function mentionsImei(text) {
  try {
    const json = JSON.parse(text);
    return /imei/i.test(`${json.info || ''} ${json.msg || ''}`);
  } catch {
    return /imei/i.test(text || '');
  }
}

async function postForm(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return text;
}

/* ---------- Icons (inline, no dependencies) ---------- */

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 5.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 9h2M13 9h2M9 12h2M13 12h2M9 15h2M13 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m11 11 8 8M16 16l2-2M18.5 18.5l1.8-1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="spin" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.15" fill="currentColor" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M14 5h5v5M19 5l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18.5 16.5 19 18.5 21 19l-2 .5-.5 2-.5-2L16 19l2-.5.5-2Z" fill="currentColor" />
    </svg>
  );
}

function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonitorIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const themeIcons = {
  light: SunIcon,
  system: MonitorIcon,
  dark: MoonIcon
};

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {THEME_OPTIONS.map((option) => {
        const Icon = themeIcons[option];
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            className={`theme-toggle__btn ${active ? 'is-active' : ''}`}
            onClick={() => setTheme(option)}
            title={`${option[0].toUpperCase()}${option.slice(1)} theme`}
          >
            <Icon className="theme-toggle__icon" />
            <span className="theme-toggle__label">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
    </svg>
  );
}

const badgeLabels = {
  idle: 'Awaiting input',
  loading: 'Listening…',
  success: 'Success',
  error: 'Error'
};

function StatusMonitor({ title, subtitle, kind, value, loading }) {
  const result = loading ? null : interpret(kind, value);
  const tone = loading ? 'loading' : result ? result.state : 'idle';

  return (
    <section className={`monitor monitor--${tone}`}>
      <header className="monitor__head">
        <div className="monitor__heading">
          <span className="monitor__dot" aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p className="monitor__subtitle">{subtitle}</p>
          </div>
        </div>
        <span className={`monitor__badge monitor__badge--${tone}`}>
          {loading && <SpinnerIcon className="monitor__badge-spin" />}
          {badgeLabels[tone]}
        </span>
      </header>

      <div className="monitor__body">
        {loading ? (
          <div className="monitor__loading" role="status">
            <span className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="monitor__loading-text">Waiting for server response</span>
          </div>
        ) : !result ? (
          <div className="monitor__idle">No response yet — submit the form to see the result here.</div>
        ) : (
          <>
            <div className={`monitor__message monitor__message--${result.state}`} role="status">
              <span className="monitor__message-icon" aria-hidden="true">
                {result.state === 'success' ? <CheckIcon /> : <AlertIcon />}
              </span>
              <div>
                <p className="monitor__message-title">{result.title}</p>
                <p className="monitor__message-text">{result.text}</p>
              </div>
            </div>
            <details className="monitor__raw">
              <summary>Raw response</summary>
              <pre className="monitor__pre">{formatResponse(value)}</pre>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

const CREDITS = [
  {
    name: 'Nicxs',
    role: 'Web Developer',
    url: 'https://phcorner.org/members/1568161/',
    avatar: nicxsAvatar
  },
  {
    name: 'Brendan666',
    role: 'Web Designer and Developer',
    url: 'https://phcorner.org/members/2539053/',
    avatar: null // resolved at open time to a fresh random image (see openInfo)
  }
];

function InfoModal({ onClose, brendanAvatar }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <div className="modal__heading">
            <span className="modal__badge" aria-hidden="true">
              <InfoIcon />
            </span>
            <div>
              <h2 id="about-title">About {BRAND_NAME}</h2>
              <p className="modal__subtitle">Project context · usage · credits</p>
            </div>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="modal__body">
          <section className="modal__section">
            <h3>What it does</h3>
            <p>
              {BRAND_NAME} provides a <strong>Spotify redemption link</strong> based on your device
              IMEI. After a successful request, the redemption link is delivered to the email you
              provided — granting <strong>3–4 months of Spotify Premium</strong>.
            </p>
          </section>

          <section className="modal__section">
            <h3>How to use</h3>
            <ol className="modal__steps">
              <li>Enter your <strong>email address</strong>.</li>
              <li>Enter your 15-digit <strong>IMEI</strong> — or use <em>Generate</em> / <em>Auto-fill</em>.</li>
              <li>Press <strong>Send code</strong>; a verification code is emailed to you.</li>
              <li>Enter the code and press <strong>Verify</strong>.</li>
              <li>Read the outcome in the response panel on the right.</li>
            </ol>
            <div className="modal__note">
              <InfoIcon className="modal__note-icon" />
              <p>
                <strong>“Risk reject”?</strong> It means your current IP has been flagged or detected
                by the brand. Switch to a <strong>proxy or VPN</strong> and try again.
              </p>
            </div>
          </section>

          <section className="modal__section">
            <h3>Credits</h3>
            <div className="credit-grid">
              {CREDITS.map((person) => {
                const avatar = person.name === 'Brendan666' ? brendanAvatar : person.avatar;
                return (
                  <a
                    key={person.name}
                    className="credit-card"
                    href={person.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img className="credit-card__avatar" src={avatar} alt={person.name} />
                    <div className="credit-card__meta">
                      <span className="credit-card__name">PHC - {person.name}</span>
                      <span className="credit-card__role">{person.role}</span>
                    </div>
                    <ExternalIcon className="credit-card__link" />
                  </a>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [email, setEmail] = useState('');
  const [imei, setImei] = useState('');
  const [code, setCode] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [responses, setResponses] = useState(initialResponses);
  const [showInfo, setShowInfo] = useState(false);
  const [brendanAvatar, setBrendanAvatar] = useState('');

  useEffect(() => {
    document.title = BRAND_NAME;
  }, []);

  function openInfo() {
    // Random image API, freshly seeded each time the modal opens (timestamp-based).
    setBrendanAvatar(`https://picsum.photos/seed/${Date.now()}/160`);
    setShowInfo(true);
  }

  function closeInfo() {
    // Remember the dismissal so the modal doesn't auto-open on future visits.
    window.localStorage.setItem(INFO_SEEN_KEY, '1');
    setShowInfo(false);
  }

  // Auto-open the About modal once, for first-time visitors only.
  useEffect(() => {
    if (!window.localStorage.getItem(INFO_SEEN_KEY)) {
      openInfo();
    }
  }, []);

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const imeiIsValid = useMemo(() => isValidImei(imei), [imei]);
  const canSend = emailIsValid && !isSending && !hasSentCode;
  const canVerify = hasSentCode && emailIsValid && imeiIsValid && code.trim().length >= 4 && !isVerifying;

  async function handleSendCode(event) {
    event.preventDefault();
    setIsSending(true);
    setStatus('Sending verification code...');

    try {
      const text = await postForm('/api/send-code', { email, imei });
      setResponses((current) => ({ ...current, send: text }));

      // Only advance to the verify step when the upstream actually accepted it
      // (code 0). Errors like "please login" still return HTTP 200.
      if (isSuccess('send', text)) {
        setHasSentCode(true);
        setStatus('Code sent');
      } else {
        setStatus('Send failed');
      }
    } catch (error) {
      setResponses((current) => ({ ...current, send: error.message }));
      setStatus('Send failed');
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setIsVerifying(true);
    setStatus('Verifying code...');

    try {
      const text = await postForm('/api/verify-code', { email, imei, code });
      setResponses((current) => ({ ...current, verify: text }));

      if (isSuccess('verify', text)) {
        setStatus('Verification complete');
      } else {
        setStatus('Verification failed');
        // If the API rejected the IMEI specifically, clear it so it can be re-entered.
        if (mentionsImei(text)) setImei('');
      }
    } catch (error) {
      setResponses((current) => ({ ...current, verify: error.message }));
      setStatus('Verification failed');
    } finally {
      setIsVerifying(false);
      // The code is single-use: once a verify response is in, clear it and return
      // to the send step so the user must request a fresh code to try again.
      setHasSentCode(false);
      setCode('');
    }
  }

  function resetFlow() {
    setEmail('');
    setImei('');
    setCode('');
    setHasSentCode(false);
    setIsSending(false);
    setIsVerifying(false);
    setStatus('Ready');
    setResponses(initialResponses);
  }

  const statusTone = status.toLowerCase().replaceAll(' ', '-').replaceAll('...', '');

  return (
    <main className="page-shell">
      <div className="ambient" aria-hidden="true">
        <span className="ambient__blob ambient__blob--one" />
        <span className="ambient__blob ambient__blob--two" />
        <span className="ambient__blob ambient__blob--three" />
      </div>

      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" title={BRAND_TERM} aria-label={BRAND_TERM}>{BRAND_MARK}</span>
          <span className="topbar__name">{BRAND_NAME}</span>
        </div>
        <div className="topbar__actions">
          <button type="button" className="icon-btn" onClick={openInfo} aria-label="About this project" title="About">
            <InfoIcon />
          </button>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <section className="workspace" aria-labelledby="page-title">
        <div className="panel form-panel">
          <div className="title-row">
            <div className="brand">
              <span className="brand__mark" title={BRAND_TERM} aria-label={BRAND_TERM}>{BRAND_MARK}</span>
              <div>
                <p className="eyebrow">{BRAND_NAME}</p>
                <h1 id="page-title">Verification flow</h1>
              </div>
            </div>
            <span className={`status-pill status-pill--${statusTone}`}>
              <span className="status-pill__dot" aria-hidden="true" />
              {status}
            </span>
          </div>

          <p className="form-intro">
            Confirm device ownership to unlock your redemption. We&apos;ll email a one-time code
            tied to your IMEI.
          </p>

          <form className="redeem-form" onSubmit={hasSentCode ? handleVerifyCode : handleSendCode}>
            <div className="field">
              <span className="field__label">Email address</span>
              <div className={`input-wrap ${emailIsValid ? 'input-wrap--valid' : ''}`}>
                <MailIcon className="input-wrap__icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  disabled={hasSentCode}
                  required
                />
                {emailIsValid && <CheckIcon className="input-wrap__check" />}
              </div>
            </div>

            <div className="field">
              <span className="field__label">
                IMEI
                <span className="field__hint">{imei.length}/15</span>
              </span>
              <div className={`input-wrap ${imeiIsValid ? 'input-wrap--valid' : ''}`}>
                <DeviceIcon className="input-wrap__icon" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={imei}
                  onChange={(event) => setImei(event.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="15 digit IMEI"
                  disabled={hasSentCode && isVerifying}
                />
                {imeiIsValid && <CheckIcon className="input-wrap__check" />}
              </div>
              <div className="field__tools">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setImei(generateImei())}
                  disabled={hasSentCode && isVerifying}
                  title="Generate a random valid IMEI"
                >
                  <SparkleIcon /> Generate
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setImei((current) => completeImei(current))}
                  disabled={(hasSentCode && isVerifying) || imei.length === 0 || imei.length >= 15}
                  title="Fill the remaining digits to make a valid IMEI"
                >
                  <SparkleIcon /> Auto-fill{imei.length > 0 && imei.length < 15 ? ` (${15 - imei.length} left)` : ''}
                </button>
              </div>
            </div>

            {hasSentCode && (
              <div className="field field--reveal">
                <span className="field__label">Verification code</span>
                <div className="input-wrap">
                  <KeyIcon className="input-wrap__icon" />
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.trim())}
                    placeholder="Code from your inbox"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="actions">
              {!hasSentCode ? (
                <button type="submit" className="btn btn--primary" disabled={!canSend}>
                  {isSending ? (
                    <>
                      <SpinnerIcon className="btn__icon" /> Sending…
                    </>
                  ) : (
                    <>
                      Send code <ArrowIcon className="btn__icon" />
                    </>
                  )}
                </button>
              ) : (
                <button type="submit" className="btn btn--primary" disabled={!canVerify}>
                  {isVerifying ? (
                    <>
                      <SpinnerIcon className="btn__icon" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify <CheckIcon className="btn__icon" />
                    </>
                  )}
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={resetFlow}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="response-grid">
          <StatusMonitor
            title="Send code response"
            subtitle="Outbound verification request"
            kind="send"
            value={responses.send}
            loading={isSending}
          />
          <StatusMonitor
            title="Verify response"
            subtitle="Code validation result"
            kind="verify"
            value={responses.verify}
            loading={isVerifying}
          />
        </div>
      </section>

      {showInfo && <InfoModal onClose={closeInfo} brendanAvatar={brendanAvatar} />}
    </main>
  );
}
