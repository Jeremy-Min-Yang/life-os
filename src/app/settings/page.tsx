"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Account and app configuration</p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <div className="flex items-center gap-4">
            {session?.user?.image && (
              <Image
                src={session.user.image}
                alt="Avatar"
                width={48}
                height={48}
                className="rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-white">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader><CardTitle>Data Storage</CardTitle></CardHeader>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Backend</span>
              <span className="text-white">Google Sheets API</span>
            </div>
            <div className="flex justify-between">
              <span>Authentication</span>
              <span className="text-white">Google OAuth (NextAuth)</span>
            </div>
            <div className="flex justify-between">
              <span>Cache Strategy</span>
              <span className="text-white">Server-side in-memory (TTL)</span>
            </div>
          </div>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
          <div className="space-y-2 text-sm text-gray-400">
            {[
              { name: "Tasks", status: "Active", desc: "Daily/Weekly/Monthly/Yearly" },
              { name: "Diary", status: "Active", desc: "Mood-tagged journal entries" },
              { name: "Training", status: "Active", desc: "Swim / Bike / Run with TSS" },
              { name: "Metrics", status: "Active", desc: "Weight, HR, Sleep, Fatigue" },
              { name: "AI Coaching", status: "Coming soon", desc: "Performance analysis" },
            ].map(({ name, status, desc }) => (
              <div key={name} className="flex items-center justify-between py-1">
                <div>
                  <span className="text-white">{name}</span>
                  <span className="text-gray-600 ml-2 text-xs">— {desc}</span>
                </div>
                <span className={status === "Active" ? "text-emerald-400 text-xs" : "text-gray-600 text-xs"}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
