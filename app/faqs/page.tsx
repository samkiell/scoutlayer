'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface AccordionItemProps {
  question: string;
  answer: string;
}

function AccordionItem({ question, answer }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-display font-medium text-text hover:text-action transition-colors"
      >
        <span>{question}</span>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 pt-1 border-t border-border/50 text-sm text-text-muted leading-relaxed font-body">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQs() {
  const items = [
    {
      question: 'What is ScoutLayer?',
      answer: 'ScoutLayer is an AI-first venture sourcing and screening platform designed to evaluate and verify founder applications objectively, utilizing automated verifiers rather than rely on traditional warm introductions.',
    },
    {
      question: 'How does outbound sourcing work?',
      answer: 'Our autonomous sourcing agents scan designated public directories (such as GitHub) based on keywords provided by the investor, extracting and structuring raw talent signals without accessing private repositories.',
    },
    {
      question: 'What does the Trust Score mean?',
      answer: 'The Trust Score represents the confidence level of a claim verified by a verifier agent. Claims scoring above 70% are considered verified and colored in trust green, while claims with lower confidence or conflicts are flagged in amber.',
    },
    {
      question: 'What is the Founder Score?',
      answer: 'The Founder Score is a persistent rating stored in our database that reflects track records and verified credentials. It acts as an input to the Screening engine but does not reset or average with other metrics.',
    },
    {
      question: 'Who can apply to ScoutLayer?',
      answer: 'Any startup founder seeking verification and screening can apply by providing company info, a pitch deck link, and their active development profiles directly through our dashboard.',
    },
    {
      question: 'Is this a real investment platform?',
      answer: 'No. ScoutLayer is an experimental research prototype built for the Hack-Nation 6th Global AI Hackathon. No real financial or capital investment transactions are executed through the platform.',
    },
    {
      question: 'Is my submitted data safe?',
      answer: 'All submitted profiles and credentials are secure. Data is passed only to our verified processing endpoints (MongoDB, OpenAI, Groq, Tavily) to perform scoring, and is never sold or shared.',
    },
    {
      question: 'Which hackathon was this built for?',
      answer: 'ScoutLayer was developed for Challenge 02 (The VC Brain) of the Hack-Nation 6th Global AI Hackathon in partnership with Maschmeyer Group.',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-text-muted hover:text-action transition-colors mb-8 inline-block">
          ← Back
        </Link>

        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Frequently Asked Questions</h1>
          <p className="text-text-muted text-sm font-body">Answers to common questions about the ScoutLayer screening engine.</p>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <AccordionItem key={idx} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
