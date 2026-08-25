import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Install Extension — FreelanceFlow AI',
  description:
    'Install the FreelanceFlow AI Chrome extension to generate winning proposals directly from any job listing page.',
};

export default function ExtensionPage() {
  return (
    <main className="container-page py-section">
      <div className="max-w-2xl mx-auto">
        <p className="text-eyebrow mb-4">Chrome Extension</p>
        <h1 className="text-h1 mb-4">Generate Proposals in One Click</h1>
        <p className="text-body-lg text-muted-foreground mb-12">
          The FreelanceFlow AI extension reads the job listing you're viewing, extracts the key
          details, and drafts a tailored proposal — ready to copy and send in seconds.
        </p>

        <section className="mb-12">
          <h2 className="text-h3 mb-6">How to Install</h2>
          <ol className="space-y-6">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <p className="font-semibold mb-1">Download the extension</p>
                <p className="text-muted-foreground text-sm">
                  Download the latest{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">extension.zip</code>{' '}
                  release and unzip it to a folder on your computer.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <p className="font-semibold mb-1">Open Chrome Extensions</p>
                <p className="text-muted-foreground text-sm">
                  Navigate to{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    chrome://extensions
                  </code>{' '}
                  in your browser and enable <strong>Developer Mode</strong> in the top-right
                  corner.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <p className="font-semibold mb-1">Load Unpacked</p>
                <p className="text-muted-foreground text-sm">
                  Click <strong>Load unpacked</strong> and select the unzipped{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">extension/dist</code>{' '}
                  folder. The FreelanceFlow AI icon will appear in your toolbar.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mb-12 p-6 bg-muted rounded-xl border border-border">
          <h2 className="text-h4 mb-3">How to Use</h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Open any job listing on Upwork, Fiverr, Freelancer, or similar platforms.</li>
            <li>Click the FreelanceFlow AI icon in your Chrome toolbar.</li>
            <li>
              Paste the job URL and click <strong>Fetch Job</strong> to extract details.
            </li>
            <li>
              Review the extracted title, skills, and budget — then click{' '}
              <strong>Generate Proposal</strong>.
            </li>
            <li>Copy the generated proposal with one click and paste it into the application.</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-h4 mb-4">Supported Platforms</h2>
          <div className="flex flex-wrap gap-2">
            {['Upwork', 'Fiverr', 'Freelancer.com', 'Toptal', 'Guru', 'PeoplePerHour'].map(
              (platform) => (
                <span
                  key={platform}
                  className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-full text-sm font-medium"
                >
                  {platform}
                </span>
              ),
            )}
          </div>
        </section>

        <div className="flex gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
