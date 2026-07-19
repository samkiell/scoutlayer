'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, PlusCircle, Award, Activity, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import PipelineStepper from '@/components/PipelineStepper';
import { toast } from 'sonner';

export default function FounderDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<{
    hasApplied: boolean;
    hasActiveApplication?: boolean;
    application?: any;
    applications?: any[];
    founder?: any;
  } | null>(null);

  const [deletingApp, setDeletingApp] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const confirmDeleteApp = async () => {
    if (!deletingApp) return;
    setDeletingInProgress(true);
    try {
      const res = await fetch(`/api/applications/${deletingApp._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Application deleted");
        const reloadRes = await fetch('/api/applications');
        const reloadData = await reloadRes.json();
        if (reloadData.success) {
          setAppData(reloadData);
        } else {
          setAppData((prev) => {
            if (!prev) return null;
            const filtered = (prev.applications || []).filter((a: any) => a._id !== deletingApp._id);
            const nextApp = filtered[0] ?? null;
            return {
              ...prev,
              hasApplied: filtered.length > 0,
              hasActiveApplication: filtered.some((a: any) => ['sourced', 'screening', 'screened', 'diligence', 'diligenced'].includes(a.status)),
              application: nextApp,
              applications: filtered,
            };
          });
        }
      } else {
        toast.error(data.error || "Failed to delete application");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete application");
    } finally {
      setDeletingInProgress(false);
      setIsDeleteModalOpen(false);
      setDeletingApp(null);
    }
  };

  // Auth Guard: Only founders allowed. Redirect investors.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'founder') {
        router.push(role === 'investor' ? '/investor/dashboard' : '/role-select');
      } else {
        // Fetch application status
        fetch('/api/applications')
          .then((res) => res.json())
          .then((data) => {
            setAppData(data);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-action" />
      </div>
    );
  }

  const hasApplied = appData?.hasApplied ?? false;
  const application = appData?.application;
  const founder = appData?.founder;
  const hasActiveApplication = appData?.hasActiveApplication ?? false;
  // Eligible to start a new application: at least one 'decided' app but none active.
  const isDecidedAndEligible = hasApplied && application?.status === 'decided' && !hasActiveApplication;

  // Map application.status to stepper index (sourced -> 0, screening -> 1, diligence -> 2, decided -> 3)
  const getStageIndex = (statusStr?: string) => {
    switch (statusStr) {
      case 'sourced':
        return 0;
      case 'screening':
        return 1;
      case 'screened':
      case 'diligence':
      case 'diligenced':
        return 2;
      case 'decided':
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(application?.status);
  const founderScore = founder?.founderScore?.value;

  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      {/* Calm, generous whitespace — Notion-like per PRD */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-16 flex flex-col gap-12">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-border">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Founder Hub</h1>
            <p className="text-text-muted text-sm mt-2">Manage your application and track your real-time founder score.</p>
          </div>
          {!hasApplied && (
            <Link
              href="/founder/apply"
              className="flex items-center gap-2 px-5 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Apply to ScoutLayer
            </Link>
          )}
        </div>

        {hasApplied ? (
          <>
            {/* Analytics Summary */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Founder Score */}
              <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className="p-3 bg-action/10 rounded-xl text-action">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Founder Score</span>
                  <div className="font-data text-2xl font-semibold mt-0.5">
                    {founderScore ? (
                      <>
                        {founderScore}
                        <span className="text-text-muted text-base">/100</span>
                      </>
                    ) : (
                      <span className="text-text-muted text-sm font-normal">Not yet scored</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pipeline Status */}
              <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className="p-3 bg-trust/10 rounded-xl text-trust">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Pipeline Status</span>
                  <div className="font-data text-lg font-semibold mt-0.5 uppercase text-trust">
                    {application?.status || 'sourced'}
                  </div>
                </div>
              </div>
            </div>

            {/* Eligible for a new application (most recent is decided, none active) */}
            {isDecidedAndEligible && (
              <div className="bg-surface border border-trust/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-text">Decision complete</h3>
                  <p className="text-text-muted text-sm mt-1">
                    Your previous application reached a final decision. You&apos;re now eligible to submit a new one.
                  </p>
                </div>
                <Link
                  href="/founder/apply"
                  className="flex items-center gap-2 px-5 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shrink-0"
                >
                  <PlusCircle className="h-4 w-4" />
                  Start New Application
                </Link>
              </div>
            )}

            {/* Stepper Card */}
            <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6">
              <h3 className="font-display text-lg font-bold text-text">Application Pipeline</h3>
              <PipelineStepper currentStage={currentStageIndex} />
            </div>

            {/* GitHub Signals Card */}
            {founder?.structuredProfile?.githubUrl && (
              <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-lg font-bold text-text">GitHub Signals</h3>
                  {founder.structuredProfile.coldStart && (
                    <span className="text-[10px] font-data font-semibold bg-flag/15 text-flag px-2.5 py-1 rounded border border-flag/30 uppercase tracking-wider">
                      Limited public signal
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg border border-border rounded-xl p-4">
                    <span className="text-xs text-text-muted uppercase tracking-wider">Followers</span>
                    <div className="font-data text-xl font-bold mt-1 text-text">
                      {founder.structuredProfile.followers ?? 0}
                    </div>
                  </div>
                  <div className="bg-bg border border-border rounded-xl p-4">
                    <span className="text-xs text-text-muted uppercase tracking-wider">Public Repos</span>
                    <div className="font-data text-xl font-bold mt-1 text-text">
                      {founder.structuredProfile.publicRepos ?? 0}
                    </div>
                  </div>
                </div>

                {founder.structuredProfile.topRepos && founder.structuredProfile.topRepos.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Top Repositories</span>
                    <div className="grid gap-2">
                      {founder.structuredProfile.topRepos.slice(0, 3).map((repo: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-bg/50 border border-border/50 rounded-xl px-4 py-3 min-w-0">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-action hover:underline inline-block truncate max-w-[150px] sm:max-w-[250px]"
                          >
                            {repo.name}
                          </a>
                          <div className="flex items-center gap-1 font-data text-xs text-text-muted">
                            <span>⭐</span>
                            <span>{repo.stars}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Application Data (Read-only) */}
            <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6">
              <h3 className="font-display text-lg font-bold text-text">Submitted Details</h3>

              <div className="grid gap-6">
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Company Name</span>
                  <p className="text-text mt-1 text-base font-medium">{application?.companyInfo?.name}</p>
                </div>

                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">One-liner Pitch</span>
                  <p className="text-text mt-1 text-sm">{application?.companyInfo?.oneLiner}</p>
                </div>

                {application?.companyInfo?.description && (
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Description / Context</span>
                    <p className="text-text-muted mt-1 text-sm whitespace-pre-wrap leading-relaxed">
                      {application.companyInfo.description}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Pitch Deck Link</span>
                  <div className="mt-1">
                    <a
                      href={application?.deck}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-action hover:underline text-sm font-semibold"
                    >
                      View Pitch Deck
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Past Applications Section */}
            <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6">
              <h3 className="font-display text-lg font-bold text-text">Past Applications</h3>
              <div className="flex flex-col gap-4">
                {(appData?.applications || []).map((appItem: any) => (
                  <div
                    key={appItem._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-bg/40 hover:border-action/20 transition-all"
                  >
                    <div>
                      <h4 className="font-display font-bold text-text text-sm">{appItem.companyInfo?.name}</h4>
                      <p className="text-xs text-text-muted mt-1">
                        Submitted on {new Date(appItem.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-data font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        appItem.status === 'decided'
                          ? 'bg-trust/10 text-trust border-trust/20'
                          : 'bg-action/10 text-action border-action/20'
                      }`}>
                        {appItem.status}
                      </span>
                      <button
                        onClick={() => {
                          setDeletingApp(appItem);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-flag/30 text-flag hover:bg-flag/10 transition-colors cursor-pointer min-h-[38px] flex items-center justify-center font-semibold"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl py-20 px-6 text-center bg-surface/20">
            <div className="p-4 bg-surface border border-border rounded-xl mb-6">
              <FileText className="h-8 w-8 text-text-muted" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">No Applications Submitted</h2>
            <p className="text-text-muted text-sm max-w-sm mt-2 mb-8">
              You haven&apos;t submitted any pitch decks or company information yet. Get started by clicking the button below.
            </p>
            <Link
              href="/founder/apply"
              className="px-6 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              Submit Application
            </Link>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {isDeleteModalOpen && deletingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-display text-lg font-bold text-text mb-2">Confirm Removal</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Delete this application for <strong className="text-text">{deletingApp.companyInfo?.name}</strong>? This removes all screening, diligence, and memo data. This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingInProgress}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingApp(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-bg border border-border text-text hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingInProgress}
                onClick={confirmDeleteApp}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-flag hover:bg-flag/90 text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deletingInProgress ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
