import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipyard — Project management for dev teams",
};

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Ship faster, together.
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Shipyard is a lightweight project management tool for small dev
            teams. No bloat. Just Kanban, tasks, and real-time collaboration.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-8 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Get started free
          </Link>
          <a
            href="https://github.com/just4heshan/shipyard-app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input px-8 text-sm font-medium transition-colors hover:bg-accent"
          >
            View on GitHub
          </a>
        </div>

        <p className="text-sm text-muted-foreground">
          Free for 1 project · No credit card required
        </p>
      </div>
    </main>
  );
}
