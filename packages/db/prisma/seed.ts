/**
 * packages/db/prisma/seed.ts
 *
 * Portfolio demo seed — creates two organisations, four users across all RBAC
 * roles, realistic projects/tasks/comments, and a live Stripe test subscription.
 *
 * Prerequisites (in packages/db/.env  OR  apps/web/.env.local):
 *   DATABASE_URL=...
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_PRO_PRICE_ID=price_...
 *
 * Run:
 *   yarn workspace @shipyard/db db:seed
 */

import { PrismaPg } from "@prisma/adapter-pg";
import {
  MemberRole,
  PrismaClient,
  Priority,
  ProjectStatus,
  SubscriptionStatus,
  SubscriptionTier,
  TaskStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";
import Stripe from "stripe";

// ── Env loading ───────────────────────────────────────────────────────────────
// Load packages/db/.env first, then fall back to apps/web/.env.local for
// Stripe keys so either location works without duplicating secrets.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });

const { STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID } = process.env;

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY missing — add it to packages/db/.env or apps/web/.env.local"
  );
}
if (!STRIPE_PRO_PRICE_ID) {
  throw new Error(
    "STRIPE_PRO_PRICE_ID missing — add it to packages/db/.env or apps/web/.env.local"
  );
}

// ── Clients ───────────────────────────────────────────────────────────────────
// Prisma 7 requires the PG driver adapter — mirrors src/index.ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

// ── Shared demo password ──────────────────────────────────────────────────────
const DEMO_PASSWORD = "Demo1234!";

// ── Date helpers ──────────────────────────────────────────────────────────────
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ── Types ─────────────────────────────────────────────────────────────────────
type WithId = { id: string };

type HorizonMembers = {
  jordanH: WithId;
  aliceH: WithId;
  bobH: WithId;
  carolH: WithId;
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding Shipyard demo data…\n");

  // 1. Wipe everything — TRUNCATE with CASCADE handles all FK ordering
  await clearDatabase();

  // 2. Hash password once — reused for all demo users
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 3. Users ─────────────────────────────────────────────────────────────────
  const [jordan, alice, bob, carol] = await Promise.all([
    createUser("Jordan Rivera", "jordan@horizon-labs.io", hash, "0ea5e9"),
    createUser("Alice Chen", "alice@horizon-labs.io", hash, "8b5cf6"),
    createUser("Bob Martin", "bob@horizon-labs.io", hash, "10b981"),
    createUser("Carol Lee", "carol@horizon-labs.io", hash, "f59e0b"),
  ]);
  console.log("  ✓ Users");

  // 4. Stripe — real test customer + 30-day trialing subscription ────────────
  console.log("  Creating Stripe test customer + subscription…");
  const stripeData = await setupStripe(
    "Horizon Labs",
    jordan.email!,
    STRIPE_PRO_PRICE_ID!
  );
  console.log("  ✓ Stripe");

  // 5. Organisations ─────────────────────────────────────────────────────────
  const [horizon, reef] = await Promise.all([
    prisma.organization.create({
      data: {
        name: "Horizon Labs",
        slug: "horizon-labs",
        subscriptionTier: SubscriptionTier.PRO,
        stripeCustomerId: stripeData.customerId,
        isActive: true,
        // Nested create — Subscription.organizationId gets set automatically
        subscription: {
          create: {
            stripeSubscriptionId: stripeData.subscriptionId,
            stripePriceId: STRIPE_PRO_PRICE_ID!,
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: stripeData.periodStart,
            currentPeriodEnd: stripeData.periodEnd,
            cancelAtPeriodEnd: false,
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        name: "Reef Digital",
        slug: "reef-digital",
        subscriptionTier: SubscriptionTier.FREE,
        isActive: true,
      },
    }),
  ]);
  console.log("  ✓ Organisations");

  // 6. Members ───────────────────────────────────────────────────────────────
  // Horizon Labs: 4 roles across the full RBAC hierarchy
  // Reef Digital: Jordan is the sole owner (FREE tier demo)
  const [jordanH, aliceH, bobH, carolH, jordanR] = await Promise.all([
    prisma.member.create({
      data: {
        userId: jordan.id,
        organizationId: horizon.id,
        role: MemberRole.OWNER,
        joinedAt: daysAgo(60),
      },
    }),
    prisma.member.create({
      data: {
        userId: alice.id,
        organizationId: horizon.id,
        role: MemberRole.ADMIN,
        joinedAt: daysAgo(55),
      },
    }),
    prisma.member.create({
      data: {
        userId: bob.id,
        organizationId: horizon.id,
        role: MemberRole.MEMBER,
        joinedAt: daysAgo(50),
      },
    }),
    prisma.member.create({
      data: {
        userId: carol.id,
        organizationId: horizon.id,
        role: MemberRole.VIEWER,
        joinedAt: daysAgo(45),
      },
    }),
    prisma.member.create({
      data: {
        userId: jordan.id,
        organizationId: reef.id,
        role: MemberRole.OWNER,
        joinedAt: daysAgo(30),
      },
    }),
  ]);
  console.log("  ✓ Members");

  const hm: HorizonMembers = { jordanH, aliceH, bobH, carolH };

  // 7. Teams (Horizon Labs only) ─────────────────────────────────────────────
  const [engTeam] = await Promise.all([
    prisma.team.create({
      data: {
        organizationId: horizon.id,
        name: "Engineering",
        description: "Full-stack and infrastructure engineering",
        members: {
          create: [
            { memberId: jordanH.id },
            { memberId: aliceH.id },
            { memberId: bobH.id },
          ],
        },
      },
    }),
    prisma.team.create({
      data: {
        organizationId: horizon.id,
        name: "Design",
        description: "Product design and UX research",
        members: {
          create: [{ memberId: carolH.id }],
        },
      },
    }),
  ]);
  console.log("  ✓ Teams");

  // 8. Projects ──────────────────────────────────────────────────────────────
  const [analytics, portal, pipeline, q3Sprint, legacy, sdk] =
    await Promise.all([
      // Horizon Labs — active projects
      prisma.project.create({
        data: {
          organizationId: horizon.id,
          name: "Analytics Dashboard",
          description:
            "Real-time SaaS analytics — custom widgets, D3 charts, multi-source data connectors",
          status: ProjectStatus.ACTIVE,
          teams: { create: [{ teamId: engTeam.id }] },
        },
      }),
      prisma.project.create({
        data: {
          organizationId: horizon.id,
          name: "Customer Portal",
          description:
            "Self-serve portal — billing management, support tickets, onboarding flows",
          status: ProjectStatus.ACTIVE,
        },
      }),
      prisma.project.create({
        data: {
          organizationId: horizon.id,
          name: "Data Pipeline v2",
          description:
            "Event ingestion overhaul — TypeScript ETL, schema validation, dead-letter queue",
          status: ProjectStatus.ACTIVE,
        },
      }),
      // Horizon Labs — historical
      prisma.project.create({
        data: {
          organizationId: horizon.id,
          name: "Q3 Launch Sprint",
          description: "Q3 product launch — completed October 2025",
          status: ProjectStatus.COMPLETED,
        },
      }),
      prisma.project.create({
        data: {
          organizationId: horizon.id,
          name: "Legacy CRM Migration",
          description: "v1 data warehouse migration to PostgreSQL — archived",
          status: ProjectStatus.ARCHIVED,
        },
      }),
      // Reef Digital (FREE tier) — single project
      prisma.project.create({
        data: {
          organizationId: reef.id,
          name: "Open Source SDK",
          description: "TypeScript SDK for the Reef Digital public API",
          status: ProjectStatus.ACTIVE,
        },
      }),
    ]);
  console.log("  ✓ Projects");

  // 9. Tasks ─────────────────────────────────────────────────────────────────
  // position is per-project per-status column (Kanban ordering)
  await seedAnalyticsTasks(analytics.id, hm);
  await seedPortalTasks(portal.id, hm);
  await seedPipelineTasks(pipeline.id, hm);
  await seedQ3SprintTasks(q3Sprint.id, hm);
  await seedLegacyTasks(legacy.id, hm);
  await seedSdkTasks(sdk.id, { jordanR });
  console.log("  ✓ Tasks");

  // 10. Comments ─────────────────────────────────────────────────────────────
  // Fetch the IN_PROGRESS tasks for Analytics Dashboard to attach discussion threads
  const analyticsTasks = await prisma.task.findMany({
    where: { projectId: analytics.id, status: TaskStatus.IN_PROGRESS },
    orderBy: { position: "asc" },
  });
  await seedComments(analyticsTasks, hm);
  console.log("  ✓ Comments");

  // 11. Activity logs ────────────────────────────────────────────────────────
  await seedActivityLogs({
    horizonId: horizon.id,
    reefId: reef.id,
    analyticsId: analytics.id,
    portalId: portal.id,
    pipelineId: pipeline.id,
    q3SprintId: q3Sprint.id,
    legacyId: legacy.id,
    sdkId: sdk.id,
    hm,
    jordanR,
  });
  console.log("  ✓ Activity logs");

  console.log(`
✅ Seed complete!

  Org:  Horizon Labs  (PRO — Stripe trialing)  →  /horizon-labs
  Org:  Reef Digital  (FREE)                   →  /reef-digital

  Password for all demo accounts: ${DEMO_PASSWORD}

  jordan@horizon-labs.io  →  Jordan Rivera  (OWNER — Horizon Labs + Reef Digital)
  alice@horizon-labs.io   →  Alice Chen     (ADMIN  — Horizon Labs)
  bob@horizon-labs.io     →  Bob Martin     (MEMBER — Horizon Labs)
  carol@horizon-labs.io   →  Carol Lee      (VIEWER — Horizon Labs)
  `);
}

// ── Helper: create a verified user with hashed password ───────────────────────
async function createUser(
  name: string,
  email: string,
  hash: string,
  bgColor: string
) {
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("");
  return prisma.user.create({
    data: {
      name,
      email,
      emailVerified: new Date(),
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=${bgColor}`,
      password: { create: { hash } },
    },
  });
}

// ── Helper: Stripe customer + trialing subscription ───────────────────────────
async function setupStripe(
  orgName: string,
  ownerEmail: string,
  priceId: string
) {
  const customer = await stripe.customers.create({
    name: orgName,
    email: ownerEmail,
    metadata: { env: "test", seeded: "true" },
  });

  // trial_period_days creates an immediately active trialing subscription
  // without requiring a payment method — ideal for portfolio demos.
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    trial_period_days: 30,
  });

  // current_period_start/end were removed from the top-level Subscription
  // object in recent Stripe API versions — calculate from trial length instead.
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    customerId: customer.id,
    subscriptionId: sub.id,
    periodStart,
    periodEnd,
  };
}

// ── Helper: wipe all tables with a single TRUNCATE CASCADE ────────────────────
async function clearDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "WebhookEvent", "EmailLog", "Presence", "Comment",
      "ActivityLog", "Task", "ProjectTeam", "Project",
      "TeamMember", "Team", "Subscription", "Invitation",
      "Member", "Organization", "Password",
      "Account", "Session", "VerificationToken", "User"
    CASCADE
  `);
  console.log("  ✓ Cleared");
}

// ── Task seeds ────────────────────────────────────────────────────────────────

async function seedAnalyticsTasks(projectId: string, m: HorizonMembers) {
  await prisma.task.createMany({
    data: [
      // ── TODO ────────────────────────────────────────────────────────────
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Implement real-time metric streaming via WebSocket",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysFromNow(7),
      },
      {
        projectId,
        title: "Add CSV and Excel export for all report types",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        position: 1,
        dueDate: daysFromNow(14),
      },
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Mobile responsive layout for dashboard widgets",
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        position: 2,
        dueDate: daysFromNow(21),
      },
      // ── IN_PROGRESS ──────────────────────────────────────────────────────
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Build custom date range picker component",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysFromNow(3),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Integrate Google Analytics GA4 data source",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        position: 1,
        dueDate: daysFromNow(5),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Set up automated weekly email digest reports",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        position: 2,
        dueDate: daysFromNow(10),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "D3.js time-series chart for user retention metrics",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        position: 3,
        dueDate: daysFromNow(4),
      },
      // ── DONE ─────────────────────────────────────────────────────────────
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Design system setup and component library",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysAgo(30),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "User authentication with SSO support",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 1,
        dueDate: daysAgo(25),
      },
      {
        projectId,
        assigneeId: m.jordanH.id,
        title: "PostgreSQL schema design and initial migrations",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 2,
        dueDate: daysAgo(20),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "tRPC API layer with end-to-end type safety",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 3,
        dueDate: daysAgo(15),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Dashboard layout with draggable widget panels",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        position: 4,
        dueDate: daysAgo(10),
      },
      // ── CANCELLED ────────────────────────────────────────────────────────
      {
        projectId,
        title: "Redis caching layer for dashboard queries",
        description:
          "Deprioritised — switched to Postgres materialised views instead.",
        status: TaskStatus.CANCELLED,
        priority: Priority.MEDIUM,
        position: 0,
      },
    ],
  });
}

async function seedPortalTasks(projectId: string, m: HorizonMembers) {
  await prisma.task.createMany({
    data: [
      // TODO
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Support ticket submission and status tracking",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysFromNow(10),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Knowledge base article editor with rich text support",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        position: 1,
        dueDate: daysFromNow(20),
      },
      // IN_PROGRESS
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Customer onboarding flow redesign",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        position: 0,
        dueDate: daysFromNow(3),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Account settings page with billing management",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        position: 1,
        dueDate: daysFromNow(7),
      },
      // DONE
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Figma wireframes for all portal screens",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysAgo(20),
      },
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Navigation and sidebar layout implementation",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        position: 1,
        dueDate: daysAgo(15),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "User profile page and avatar upload",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        position: 2,
        dueDate: daysAgo(10),
      },
    ],
  });
}

async function seedPipelineTasks(projectId: string, m: HorizonMembers) {
  await prisma.task.createMany({
    data: [
      // TODO
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Dead letter queue for permanently failed ingestion jobs",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysFromNow(10),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "PagerDuty alerting for pipeline SLA breaches",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        position: 1,
        dueDate: daysFromNow(20),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "JSON schema validation for incoming event payloads",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        position: 2,
        dueDate: daysFromNow(7),
      },
      // IN_PROGRESS
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Migrate ETL batch jobs from Python to TypeScript",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        position: 0,
        dueDate: daysFromNow(5),
      },
      // DONE
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Event ingestion REST API with rate limiting",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysAgo(15),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Multi-region read replica configuration",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 1,
        dueDate: daysAgo(10),
      },
    ],
  });
}

async function seedQ3SprintTasks(projectId: string, m: HorizonMembers) {
  // All tasks are DONE since the project is COMPLETED
  await prisma.task.createMany({
    data: [
      {
        projectId,
        assigneeId: m.jordanH.id,
        title: "Soft launch to beta user cohort (500 users)",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 0,
        dueDate: daysAgo(45),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Load test with 10 000 concurrent sessions",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 1,
        dueDate: daysAgo(50),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title: "Security penetration test and vulnerability remediation",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 2,
        dueDate: daysAgo(55),
      },
      {
        projectId,
        assigneeId: m.jordanH.id,
        title: "Launch metrics dashboard for executive readout",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        position: 3,
        dueDate: daysAgo(60),
      },
      {
        projectId,
        assigneeId: m.carolH.id,
        title: "Product Hunt listing and press kit assets",
        status: TaskStatus.DONE,
        priority: Priority.LOW,
        position: 4,
        dueDate: daysAgo(62),
      },
    ],
  });
}

async function seedLegacyTasks(projectId: string, m: HorizonMembers) {
  // All tasks are DONE — project is ARCHIVED
  await prisma.task.createMany({
    data: [
      {
        projectId,
        assigneeId: m.aliceH.id,
        title:
          "Audit legacy CRM data schema and document field mappings to new model",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysAgo(120),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title:
          "Write ETL extraction scripts for contacts, accounts, and opportunity records",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 1,
        dueDate: daysAgo(110),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title:
          "Transform and normalise 480 000 contact records into target schema",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 2,
        dueDate: daysAgo(100),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title:
          "Data validation suite — reconcile row counts and null-rate thresholds",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 3,
        dueDate: daysAgo(95),
      },
      {
        projectId,
        assigneeId: m.jordanH.id,
        title:
          "Parallel-run both systems and diff daily transaction outputs for 2 weeks",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 4,
        dueDate: daysAgo(85),
      },
      {
        projectId,
        assigneeId: m.aliceH.id,
        title:
          "Train sales team on new CRM workflows and self-service reporting",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        position: 5,
        dueDate: daysAgo(80),
      },
      {
        projectId,
        assigneeId: m.jordanH.id,
        title:
          "Hard cutover execution — redirect all integrations to new CRM endpoints",
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        position: 6,
        dueDate: daysAgo(75),
      },
      {
        projectId,
        assigneeId: m.bobH.id,
        title: "Decommission legacy CRM instance and revoke API credentials",
        status: TaskStatus.DONE,
        priority: Priority.LOW,
        position: 7,
        dueDate: daysAgo(70),
      },
    ],
  });
}

async function seedSdkTasks(projectId: string, m: { jordanR: WithId }) {
  await prisma.task.createMany({
    data: [
      // TODO
      {
        projectId,
        assigneeId: m.jordanR.id,
        title: "Write full API reference documentation",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysFromNow(14),
      },
      {
        projectId,
        title: "Add Python SDK bindings alongside TypeScript",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        position: 1,
        dueDate: daysFromNow(30),
      },
      // IN_PROGRESS
      {
        projectId,
        assigneeId: m.jordanR.id,
        title: "Publish v1.0.0 release to npm registry",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        position: 0,
        dueDate: daysFromNow(5),
      },
      // DONE
      {
        projectId,
        assigneeId: m.jordanR.id,
        title: "Core SDK with full TypeScript types and generics",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        position: 0,
        dueDate: daysAgo(10),
      },
    ],
  });
}

// ── Comments: realistic discussion threads on IN_PROGRESS tasks ───────────────
async function seedComments(
  inProgressTasks: { id: string }[],
  m: HorizonMembers
) {
  const [datePickerTask, ga4Task] = inProgressTasks;

  if (datePickerTask) {
    await prisma.comment.createMany({
      data: [
        {
          taskId: datePickerTask.id,
          authorId: m.bobH.id,
          content:
            "Blocked on the design spec — @Carol can you share the Figma link for the range picker states?",
          createdAt: daysAgo(4),
        },
        {
          taskId: datePickerTask.id,
          authorId: m.carolH.id,
          content:
            "Just shared access! The design covers single-date, range, and time-zone-aware modes. Let me know if anything needs clarifying.",
          createdAt: daysAgo(3),
        },
        {
          taskId: datePickerTask.id,
          authorId: m.bobH.id,
          content:
            "Perfect — starting implementation today. Targeting a draft PR by Friday.",
          createdAt: daysAgo(2),
        },
      ],
    });
  }

  if (ga4Task) {
    await prisma.comment.createMany({
      data: [
        {
          taskId: ga4Task.id,
          authorId: m.aliceH.id,
          content:
            "GA4 API OAuth verification adds ~2 days to the timeline. Flagging to Jordan — should we use a service account approach instead?",
          createdAt: daysAgo(5),
        },
        {
          taskId: ga4Task.id,
          authorId: m.jordanH.id,
          content:
            "Go ahead with service account for now — we can add OAuth in v1.1. Unblocks you immediately.",
          createdAt: daysAgo(5),
        },
        {
          taskId: ga4Task.id,
          authorId: m.aliceH.id,
          content:
            "Service account is working — pulling live GA4 data in staging. Closing this out by Thursday EOD.",
          createdAt: daysAgo(2),
        },
      ],
    });
  }
}

// ── Activity logs: full lifecycle audit trail ─────────────────────────────────
async function seedActivityLogs(ctx: {
  horizonId: string;
  reefId: string;
  analyticsId: string;
  portalId: string;
  pipelineId: string;
  q3SprintId: string;
  legacyId: string;
  sdkId: string;
  hm: HorizonMembers;
  jordanR: WithId;
}) {
  const {
    horizonId,
    reefId,
    analyticsId,
    portalId,
    pipelineId,
    q3SprintId,
    legacyId,
    sdkId,
    hm,
    jordanR,
  } = ctx;

  await prisma.activityLog.createMany({
    data: [
      // ── Horizon Labs: org bootstrapping ──────────────────────────────────
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "org_created",
        entityType: "Organization",
        entityId: horizonId,
        metadata: { name: "Horizon Labs" },
        createdAt: daysAgo(90),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "subscription_upgraded",
        entityType: "Organization",
        entityId: horizonId,
        metadata: { from: "FREE", to: "PRO", plan: "Monthly" },
        createdAt: daysAgo(88),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "team_created",
        entityType: "Team",
        entityId: "horizon-engineering-team",
        metadata: { name: "Engineering" },
        createdAt: daysAgo(86),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "team_created",
        entityType: "Team",
        entityId: "horizon-design-team",
        metadata: { name: "Design" },
        createdAt: daysAgo(85),
      },
      // ── Horizon Labs: member onboarding ───────────────────────────────────
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "invitation_sent",
        entityType: "Member",
        entityId: hm.aliceH.id,
        metadata: { email: "alice@horizon-labs.io", role: "ADMIN" },
        createdAt: daysAgo(82),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "member_joined",
        entityType: "Member",
        entityId: hm.aliceH.id,
        metadata: { name: "Alice Harper", role: "ADMIN" },
        createdAt: daysAgo(80),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "invitation_sent",
        entityType: "Member",
        entityId: hm.bobH.id,
        metadata: { email: "bob@horizon-labs.io", role: "MEMBER" },
        createdAt: daysAgo(78),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "member_joined",
        entityType: "Member",
        entityId: hm.bobH.id,
        metadata: { name: "Bob Martin", role: "MEMBER" },
        createdAt: daysAgo(76),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "invitation_sent",
        entityType: "Member",
        entityId: hm.carolH.id,
        metadata: { email: "carol@horizon-labs.io", role: "MEMBER" },
        createdAt: daysAgo(74),
      },
      {
        organizationId: horizonId,
        memberId: hm.carolH.id,
        action: "member_joined",
        entityType: "Member",
        entityId: hm.carolH.id,
        metadata: { name: "Carol Davis", role: "MEMBER" },
        createdAt: daysAgo(72),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "member_role_changed",
        entityType: "Member",
        entityId: hm.carolH.id,
        metadata: { name: "Carol Davis", from: "MEMBER", to: "VIEWER" },
        createdAt: daysAgo(70),
      },
      // ── Horizon Labs: Analytics Dashboard lifecycle ───────────────────────
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "project_created",
        entityType: "Project",
        entityId: analyticsId,
        metadata: { name: "Analytics Dashboard" },
        createdAt: daysAgo(68),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "analytics-task-auth",
        metadata: { title: "User authentication with SSO support" },
        createdAt: daysAgo(66),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "analytics-task-ga4",
        metadata: { title: "Integrate GA4 real-time events API" },
        createdAt: daysAgo(66),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_assigned",
        entityType: "Task",
        entityId: "analytics-task-auth",
        metadata: {
          title: "User authentication with SSO support",
          assignee: "Alice Harper",
        },
        createdAt: daysAgo(65),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "analytics-task-auth",
        metadata: {
          title: "User authentication with SSO support",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(63),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "analytics-task-auth",
        metadata: {
          title: "User authentication with SSO support",
          from: "IN_PROGRESS",
          to: "DONE",
        },
        createdAt: daysAgo(58),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "analytics-task-ga4",
        metadata: {
          title: "Integrate GA4 real-time events API",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(55),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "comment_added",
        entityType: "Task",
        entityId: "analytics-task-ga4",
        metadata: {
          preview:
            "GA4 API OAuth verification adds ~2 days to the timeline — flagging early",
        },
        createdAt: daysAgo(50),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_priority_changed",
        entityType: "Task",
        entityId: "analytics-task-ga4",
        metadata: {
          title: "Integrate GA4 real-time events API",
          from: "MEDIUM",
          to: "HIGH",
        },
        createdAt: daysAgo(48),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "analytics-task-datepicker",
        metadata: { title: "Build custom date range picker component" },
        createdAt: daysAgo(10),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_assigned",
        entityType: "Task",
        entityId: "analytics-task-datepicker",
        metadata: {
          title: "Build custom date range picker component",
          assignee: "Bob Martin",
        },
        createdAt: daysAgo(10),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "analytics-task-datepicker",
        metadata: {
          title: "Build custom date range picker component",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(7),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "comment_added",
        entityType: "Task",
        entityId: "analytics-task-datepicker",
        metadata: {
          preview:
            "Use the existing design token set for the calendar — Figma link in Notion",
        },
        createdAt: daysAgo(5),
      },
      // ── Horizon Labs: Customer Portal lifecycle ───────────────────────────
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "project_created",
        entityType: "Project",
        entityId: portalId,
        metadata: { name: "Customer Portal" },
        createdAt: daysAgo(60),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "portal-task-billing",
        metadata: {
          title: "Self-serve subscription upgrade and downgrade flow",
        },
        createdAt: daysAgo(58),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "portal-task-support",
        metadata: {
          title: "In-app support ticket creation with file attachments",
        },
        createdAt: daysAgo(57),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "portal-task-billing",
        metadata: {
          title: "Self-serve subscription upgrade flow",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(45),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "portal-task-support",
        metadata: {
          title: "In-app support ticket creation",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(40),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "comment_added",
        entityType: "Task",
        entityId: "portal-task-support",
        metadata: {
          preview:
            "File size limit set to 10 MB per attachment, max 5 files per ticket",
        },
        createdAt: daysAgo(12),
      },
      // ── Horizon Labs: Data Pipeline v2 lifecycle ──────────────────────────
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "project_created",
        entityType: "Project",
        entityId: pipelineId,
        metadata: { name: "Data Pipeline v2" },
        createdAt: daysAgo(52),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "pipeline-task-ingestion",
        metadata: { title: "Event ingestion REST API with rate limiting" },
        createdAt: daysAgo(50),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_assigned",
        entityType: "Task",
        entityId: "pipeline-task-ingestion",
        metadata: {
          title: "Event ingestion REST API with rate limiting",
          assignee: "Alice Harper",
        },
        createdAt: daysAgo(49),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "pipeline-task-ingestion",
        metadata: {
          title: "Event ingestion REST API with rate limiting",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(20),
      },
      // ── Horizon Labs: Q3 Launch Sprint (COMPLETED) ────────────────────────
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "project_created",
        entityType: "Project",
        entityId: q3SprintId,
        metadata: { name: "Q3 Launch Sprint" },
        createdAt: daysAgo(80),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "q3-task-beta",
        metadata: { title: "Soft launch to beta user cohort (500 users)" },
        createdAt: daysAgo(78),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "q3-task-beta",
        metadata: {
          title: "Soft launch to beta user cohort",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(65),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "q3-task-beta",
        metadata: {
          title: "Soft launch to beta user cohort",
          from: "IN_PROGRESS",
          to: "DONE",
        },
        createdAt: daysAgo(55),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "project_status_changed",
        entityType: "Project",
        entityId: q3SprintId,
        metadata: { name: "Q3 Launch Sprint", from: "ACTIVE", to: "COMPLETED" },
        createdAt: daysAgo(45),
      },
      // ── Horizon Labs: Legacy CRM Migration (ARCHIVED) ─────────────────────
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "project_created",
        entityType: "Project",
        entityId: legacyId,
        metadata: { name: "Legacy CRM Migration" },
        createdAt: daysAgo(130),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "legacy-task-schema",
        metadata: {
          title: "Audit legacy CRM data schema and document field mappings",
        },
        createdAt: daysAgo(128),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "legacy-task-schema",
        metadata: {
          title: "Audit legacy CRM data schema",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(122),
      },
      {
        organizationId: horizonId,
        memberId: hm.bobH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "legacy-task-schema",
        metadata: {
          title: "Audit legacy CRM data schema",
          from: "IN_PROGRESS",
          to: "DONE",
        },
        createdAt: daysAgo(118),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "task_created",
        entityType: "Task",
        entityId: "legacy-task-cutover",
        metadata: {
          title:
            "Hard cutover execution — redirect all integrations to new CRM",
        },
        createdAt: daysAgo(115),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_priority_changed",
        entityType: "Task",
        entityId: "legacy-task-cutover",
        metadata: {
          title: "Hard cutover execution",
          from: "HIGH",
          to: "URGENT",
        },
        createdAt: daysAgo(90),
      },
      {
        organizationId: horizonId,
        memberId: hm.jordanH.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "legacy-task-cutover",
        metadata: {
          title: "Hard cutover execution",
          from: "IN_PROGRESS",
          to: "DONE",
        },
        createdAt: daysAgo(75),
      },
      {
        organizationId: horizonId,
        memberId: hm.aliceH.id,
        action: "project_status_changed",
        entityType: "Project",
        entityId: legacyId,
        metadata: {
          name: "Legacy CRM Migration",
          from: "ACTIVE",
          to: "ARCHIVED",
        },
        createdAt: daysAgo(70),
      },
      // ── Reef Digital: org bootstrapping ──────────────────────────────────
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "org_created",
        entityType: "Organization",
        entityId: reefId,
        metadata: { name: "Reef Digital" },
        createdAt: daysAgo(30),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "project_created",
        entityType: "Project",
        entityId: sdkId,
        metadata: { name: "Open Source SDK" },
        createdAt: daysAgo(28),
      },
      // ── Reef Digital: Open Source SDK lifecycle ───────────────────────────
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_created",
        entityType: "Task",
        entityId: "sdk-task-core",
        metadata: { title: "Core SDK client with plugin architecture" },
        createdAt: daysAgo(27),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_created",
        entityType: "Task",
        entityId: "sdk-task-auth",
        metadata: { title: "OAuth 2.0 PKCE authentication module" },
        createdAt: daysAgo(26),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "sdk-task-core",
        metadata: {
          title: "Core SDK client with plugin architecture",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(25),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "sdk-task-core",
        metadata: {
          title: "Core SDK client with plugin architecture",
          from: "IN_PROGRESS",
          to: "DONE",
        },
        createdAt: daysAgo(15),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_status_changed",
        entityType: "Task",
        entityId: "sdk-task-auth",
        metadata: {
          title: "OAuth 2.0 PKCE authentication module",
          from: "TODO",
          to: "IN_PROGRESS",
        },
        createdAt: daysAgo(12),
      },
      {
        organizationId: reefId,
        memberId: jordanR.id,
        action: "task_created",
        entityType: "Task",
        entityId: "sdk-task-docs",
        metadata: { title: "API reference docs and quickstart guide" },
        createdAt: daysAgo(5),
      },
    ],
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
