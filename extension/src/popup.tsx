import type React from 'react';
import { useEffect, useState } from 'react';
import '@fontsource-variable/bricolage-grotesque';

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

const STEP_ORDER: Step[] = ['input', 'job', 'proposal'];
const STEP_LABELS: Record<Step, string> = {
  input: 'Link',
  job: 'Job',
  proposal: 'Proposal',
};

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [autofilled, setAutofilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [proposal, setProposal] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getActiveTabUrl().then((tabUrl) => {
      if (tabUrl && isJobListingUrl(tabUrl)) {
        setUrl(tabUrl);
        setAutofilled(true);
      }
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
        setError(data.error ?? 'Could not read that listing. Check the URL and try again.');
      } else {
        setJob(data as JobDetails);
        setAutofilled(false);
        setStep('job');
      }
    } catch {
      setError('Cannot reach the FreelanceFlow server. Make sure it is running.');
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
        setError(data.error ?? 'Generation failed. Try again.');
      } else {
        setProposal(data.proposal as string);
        setStep('proposal');
      }
    } catch {
      setError('Cannot reach the FreelanceFlow server. Make sure it is running.');
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
    setAutofilled(false);
    setJob(null);
    setProposal('');
    setError('');
    setCopied(false);
  }

  return (
    <div className="ff">
      <header className="ff-head">
        <div className="ff-mark" aria-hidden="true">
          F
        </div>
        <div className="ff-brand">
          <span className="ff-name">FreelanceFlow AI</span>
          <span className="ff-tag">Proposal generator</span>
        </div>
        <nav className="ff-rail" aria-label={`Step ${STEP_ORDER.indexOf(step) + 1} of 3`}>
          {STEP_ORDER.map((s) => (
            <span
              key={s}
              className={`ff-rail-seg${s === step ? ' is-current' : ''}${
                STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(step) ? ' is-done' : ''
              }`}
              title={STEP_LABELS[s]}
            />
          ))}
        </nav>
      </header>

      {step === 'input' && (
        <section key="input" className="ff-step">
          <label className="ff-eyebrow" htmlFor="ff-url">
            Job listing link
          </label>
          <input
            id="ff-url"
            className="ff-input"
            type="url"
            placeholder="Paste an Upwork or Freelancer URL…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setAutofilled(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url && !loading) fetchJob();
            }}
          />
          {autofilled && !loading && <p className="ff-hint">Pulled from this tab — edit if needed.</p>}
          {error && (
            <p className="ff-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="ff-btn ff-btn-primary"
            onClick={fetchJob}
            disabled={loading || !url}
          >
            {loading ? (
              <>
                <span className="ff-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                Reading listing
              </>
            ) : (
              'Read job listing'
            )}
          </button>
        </section>
      )}

      {step === 'job' && job && (
        <section key="job" className="ff-step">
          <article className="ff-jobcard">
            <p className="ff-meta">
              <span className="ff-platform">{job.platform}</span>
              {job.budget && <span className="ff-budget">{job.budget}</span>}
            </p>
            <h1 className="ff-jobtitle">{job.title}</h1>
            {(job.skills?.length ?? 0) > 0 && (
              <ul className="ff-skills">
                {job.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </article>
          {error && (
            <p className="ff-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="ff-btn ff-btn-primary"
            onClick={generateProposal}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ff-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                Writing proposal
              </>
            ) : (
              'Write my proposal'
            )}
          </button>
          <button type="button" className="ff-back" onClick={reset}>
            Use a different link
          </button>
        </section>
      )}

      {step === 'proposal' && (
        <section key="proposal" className="ff-step">
          <div className="ff-doc">
            <div className="ff-dochead" aria-hidden="true" />
            <pre className="ff-docbody">{proposal}</pre>
          </div>
          {error && (
            <p className="ff-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className={`ff-btn ${copied ? 'ff-btn-copied' : 'ff-btn-primary'}`}
            onClick={copyProposal}
          >
            {copied ? 'Copied to clipboard' : 'Copy proposal'}
          </button>
          <button type="button" className="ff-back" onClick={reset}>
            Start a new proposal
          </button>
        </section>
      )}
    </div>
  );
}
