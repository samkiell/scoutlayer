import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — ScoutLayer',
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <article className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-text-muted hover:text-action transition-colors mb-8 inline-block">
          ← Back
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="font-data text-xs text-text-muted mb-12">Last updated: July 2026</p>

        <div className="flex flex-col gap-10 text-sm text-text-muted leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">What We Collect</h2>
            <p className="mb-3">
              When you sign in with Google, we receive your name, email address, and profile picture.
              If you submit a founder application, we store the company information, website URL,
              description, and pitch deck link you provide.
            </p>
            <p>
              For outbound sourcing, we collect publicly available data from platforms such as GitHub
              (public repos, profile info, contribution history). We do not access private repositories
              or non-public information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">How We Use It</h2>
            <p>
              Your data is used exclusively within ScoutLayer for AI-driven screening, claim
              verification, and investment memo generation. We do not sell your data, use it for
              advertising, or share it with third parties beyond the service providers required to
              operate the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">Third-Party Processors</h2>
            <p>The following services process data as part of ScoutLayer&apos;s pipeline:</p>
            <ul className="mt-2 flex flex-col gap-1.5 list-disc list-inside">
              <li><strong className="text-text">MongoDB Atlas</strong> — database storage</li>
              <li><strong className="text-text">Groq</strong> — LLM inference for screening and memo generation</li>
              <li><strong className="text-text">OpenAI</strong> — select reasoning-heavy analysis calls</li>
              <li><strong className="text-text">Tavily</strong> — web search for claim verification</li>
              <li><strong className="text-text">Vercel</strong> — application hosting</li>
              <li><strong className="text-text">Google OAuth</strong> — authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">Hackathon Prototype Disclaimer</h2>
            <p>
              ScoutLayer is a prototype built for the Hack-Nation 6th Global AI Hackathon. It is not a
              production service. Data retention, security practices, and availability are best-effort
              for the duration of the hackathon and demo period. Do not submit sensitive or confidential
              business information that you are not comfortable sharing with AI processing services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">Your Rights</h2>
            <p>
              You can request deletion of your account and associated data by contacting the builder
              through the project&apos;s GitHub repository. Upon request, we will remove your data from
              our database within a reasonable timeframe.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-text mb-3">Contact</h2>
            <p>
              For privacy-related questions, reach out via the project&apos;s GitHub repository or
              contact the builder directly through the hackathon organizers.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
