import type React from 'react';
import { useEffect, useState } from 'react';

declare const __BACKEND_URL__: string;
const BACKEND_URL = __BACKEND_URL__;

interface JobDetails {
  title: string;
  description: string;
  skills: string[];
  budget: string;
  platform: string;
}

type Step = 'input' | 'job' | 'proposal';

const JOB_BOARD_HOSTS = ['upwork.com', 'freelancer.com', 'freelancer.ca', 'guru.com', 'fiverr.com'];

function isJobListingUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return JOB_BOARD_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function getActiveTabUrl(): Promise<string | null> {
  if (!chrome?.tabs?.query) return null;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid #1e293b',
  },
  logo: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #e67e22, #f39c12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 0,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '11px',
    color: '#64748b',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '13px',
    outline: 'none',
  },
  primaryBtn: {
    width: '100%',
    padding: '9px 12px',
    background: 'linear-gradient(135deg, #e67e22, #f39c12)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  secondaryBtn: {
    width: '100%',
    padding: '9px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  successBtn: {
    width: '100%',
    padding: '9px 12px',
    background: '#15803d',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
  },
  jobTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '6px',
    lineHeight: '1.3',
  },
  platformBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '20px',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  row: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginBottom: '8px',
  },
  metaLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  metaValue: {
    fontSize: '12px',
    color: '#cbd5e1',
  },
  skillsWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  skill: {
    padding: '2px 8px',
    background: '#0f172a',
    border: '1px solid #e67e22',
    borderRadius: '20px',
    fontSize: '11px',
    color: '#e67e22',
  },
  textarea: {
    width: '100%',
    height: '200px',
    padding: '10px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '12px',
    lineHeight: '1.6',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
  },
  error: {
    padding: '8px 10px',
    background: '#450a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '12px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0',
    textAlign: 'center' as const,
    width: '100%',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginRight: '6px',
    verticalAlign: 'middle',
  },
};

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [proposal, setProposal] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getActiveTabUrl().then((tabUrl) => {
      if (tabUrl && isJobListingUrl(tabUrl)) setUrl(tabUrl);
    });
  }, []);

  async function fetchJob() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fetch-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to fetch job details.');
      } else {
        setJob(data as JobDetails);
        setStep('job');
      }
    } catch {
      setError('Network error — make sure the FreelanceFlow AI server is running.');
    } finally {
      setLoading(false);
    }
  }

  async function generateProposal() {
    if (!job) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate proposal.');
      } else {
        setProposal(data.proposal as string);
        setStep('proposal');
      }
    } catch {
      setError('Network error — make sure the FreelanceFlow AI server is running.');
    } finally {
      setLoading(false);
    }
  }

  function copyProposal() {
    navigator.clipboard.writeText(proposal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setStep('input');
    setUrl('');
    setJob(null);
    setProposal('');
    setError('');
    setCopied(false);
  }

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.header}>
        <div style={styles.logo}>F</div>
        <div style={styles.headerText}>
          <span style={styles.title}>FreelanceFlow AI</span>
          <span style={styles.subtitle}>Proposal Generator</span>
        </div>
      </div>

      {step === 'input' && (
        <>
          <div>
            <div style={styles.label}>Job Listing URL</div>
            <input
              style={styles.input}
              type="url"
              placeholder="https://www.upwork.com/jobs/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url && !loading) fetchJob();
              }}
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="button"
            style={{ ...styles.primaryBtn, opacity: loading || !url ? 0.6 : 1 }}
            onClick={fetchJob}
            disabled={loading || !url}
          >
            {loading ? (
              <>
                <span style={styles.spinner} />
                Fetching…
              </>
            ) : (
              'Fetch Job Details'
            )}
          </button>
        </>
      )}

      {step === 'job' && job && (
        <>
          <div style={styles.card}>
            <span style={styles.platformBadge}>{job.platform}</span>
            <div style={styles.jobTitle}>{job.title}</div>
            {job.budget && (
              <div style={styles.row}>
                <span style={styles.metaLabel}>Budget</span>
                <span style={styles.metaValue}>{job.budget}</span>
              </div>
            )}
            {(job.skills?.length ?? 0) > 0 && (
              <div style={styles.row}>
                <span style={styles.metaLabel}>Skills</span>
                <div style={styles.skillsWrap}>
                  {job.skills.map((s) => (
                    <span key={s} style={styles.skill}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="button"
            style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}
            onClick={generateProposal}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={styles.spinner} />
                Generating…
              </>
            ) : (
              'Generate Proposal'
            )}
          </button>
          <button type="button" style={styles.link} onClick={reset}>
            Start over
          </button>
        </>
      )}

      {step === 'proposal' && (
        <>
          <div style={styles.label}>Your Proposal</div>
          <textarea style={styles.textarea} readOnly value={proposal} />
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="button"
            style={copied ? styles.successBtn : styles.primaryBtn}
            onClick={copyProposal}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button type="button" style={styles.link} onClick={reset}>
            Start over with a new job
          </button>
        </>
      )}
    </div>
  );
}
