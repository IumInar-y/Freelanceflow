// @polsia:user-owned
import type { Metadata } from 'next';
import { requireAuth } from '@/lib/require-auth';
import { VoiceProfileCard } from './voice-profile-card';

export const metadata: Metadata = { title: 'Voice profile' };

export default async function VoiceProfilePage() {
  await requireAuth();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-h2 font-bold text-foreground">Voice fingerprint</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what your proposal-tailoring AI uses to personalize output.
        </p>
      </div>
      <VoiceProfileCard />
    </main>
  );
}
