---
title: "VibeLog Unified Product Consensus"
tags: [vibelog, product-strategy, life-memory, consensus]
status: active
created: 2026-08-07
---

# Decision

Pursue the direction. Define VibeLog as a **private, source-backed life-memory companion**, not an always-on public clone.

The strategic shift is **publish first -> remember first**. Private evidence and memory become the source of truth; reflection, publishing, delegation, and any future family or legacy persona are permissioned outputs.

North-star promise:

> VibeLog remembers what matters, proves where it came from, and helps turn it into action—in your voice and under your control.

# Why this direction

- Ambient memory is validated but already competitive: Omi and Amazon Bee cover capture, recall, patterns, and actions.
- The durable opening is the complete trusted loop: private evidence -> grounded memory -> useful reflection -> approved action -> selective sharing.
- Microsoft lifelogging research argues for selectivity and user-valued memory jobs rather than indiscriminate total capture.
- Limitless/Rewind's transition after acquisition makes portability and vendor survival part of the core product promise.
- The inspected VibeLog checkout at `/Users/zang/vibelog`, commit `9312533`, is a useful seed: deliberate browser capture, transcription, RAG, per-user memory, publishing, and social output already exist.

# Phase 0: prove one loop

Run a 14-day Yan-only dogfood. If the loop is useful and trustworthy, expand to a 30-day alpha with 8-12 founders or creators.

1. Capture a deliberate voice note, text, photo, file/link, calendar event, or consented meeting.
2. Build an editable private timeline of ideas, decisions, commitments, people, and moments.
3. Answer questions with links to exact evidence, confidence, and a visible `unknown` state.
4. Produce a short daily/weekly distillation and one useful proposed next step.
5. Turn a selected memory into a VibeLog draft, task, or sandboxed project brief only after approval.
6. Let the user keep, correct, forget, export, and change the audience of every item.

Do not use capture hours, extracted-memory count, posts, or generated agent output as success metrics. Measure source-backed recall, commitments resolved, corrections, useful outputs, and regretted interventions.

Proposed expansion gate: week-four retention at least 60%, median capture on five days/week, three spontaneous recall queries/user/week, at least 70% of cited memories accepted as accurate, and under five minutes/day spent correcting. These are proposed product thresholds, not external benchmarks. Any serious privacy or consent incident is a stop.

# Architecture decisions before implementation

## 1. Privacy boundaries are structural

Use hard separation:

```text
local raw vault -> derived private memory vault -> one-way approved share library
```

Do not implement private/public as flags inside one model-searchable index. Public answers and agent tools must be technically incapable of querying private blobs, embeddings, or keys. Captured speech is untrusted data, never an instruction or authorization.

## 2. Do not inherit the current memory prototype as the lifelong model

The current service stores server-readable fact strings through an admin client and extracts a narrow set of regex matches. Preserve useful code, but design a new event contract and threat-model cross-user/admin access, captured-content prompt injection, deletion propagation, and accidental publication before ingesting intimate data.

Use distinct layers:

1. Observation: immutable source clip, note, photo, or imported event.
2. Extraction: transcript, OCR, people, topics, and tasks.
3. Memory claim: source IDs, confidence, validity, and correction history.
4. Composition: digest, post, brief, or persona response; never treated as evidence.
5. Action: an approved external side effect with authority and an audit record.

## 3. Consent and revocation belong in every event

Every event involving another person needs an authority/consent record, allowed purposes and audiences, and revocation state. Without one, restrict it to short-lived local processing. Revocation or redaction must cascade through source media, transcripts, claims, embeddings, summaries, caches, and public projections.

## 4. Benchmark simple grounded retrieval first

Preserve evidence and create a seeded recall, contradiction, and false-attribution test harness before building a complex knowledge graph or aggressive summary hierarchy. A 2026 continuous-lifelog benchmark found its evaluated sophisticated memory systems did not beat simple RAG; this is one benchmark, not a universal result. Source: https://aclanthology.org/2026.findings-acl.351.pdf

## 5. Portability is day-one scope

Provide human-readable export, documented schema, correction/version history, deletion, and a recovery plan from the first alpha. Keep raw media local with rolling expiry unless pinned; sync only derived source-referenced memories until a real end-to-end encryption, key recovery, and deletion design is reviewed. Do not call ordinary server-side encryption end-to-end encryption.

# Platform sequence

- Keep the PWA for deliberate capture, timeline, recall, review, publishing, and device management.
- Add native mobile and desktop collectors only after Phase 0 proves value. Native code is required for credible long-running capture and OS integrations; a PWA cannot be the universal sensor layer.
- Integrate existing wearables before considering proprietary hardware.
- Treat a Mac mini as an optional local hub. Add UniFi event ingestion only after the consent, retention, and privacy-zone model exists.

# Non-negotiable guardrails

- Private by default; granular audience and purpose permissions.
- Raw media expires by default; chosen memories may persist with provenance.
- Recording is unmistakably visible and consent-aware.
- Intimate, health, mood, sexuality, and relationship inferences are disabled by default and never presented as diagnoses or causal facts.
- Agents may research and prototype in a sandbox. Messaging, spending, deployment, publication, account changes, and other external side effects require scoped approval and an audit trail.
- Any future public or posthumous persona is visibly labeled as AI, limited to an approved corpus, and cannot invent new beliefs or commitments.

# Deferred branches

Always-on cameras, ambient mobile recording, dating, a visual clone, posthumous agency, and unsupervised idea-to-product shipping are separate later products with separate value evidence, consent contracts, and safety cases.

# Evidence anchors

- Omi product overview: https://help.omi.me/en/articles/13135007-overview
- Amazon Bee: https://www.aboutamazon.com/news/devices/bee-amazon-wearable-ai-device-new-features
- Limitless/Rewind transition: https://www.limitless.ai/
- Microsoft Research, Beyond Total Capture: https://www.microsoft.com/en-us/research/uploads/prod/2020/04/Beyond-total-capture.pdf
- Apple recording disclosure requirement: https://developer.apple.com/app-store/review/guidelines/
- Android foreground-service constraints: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- Quebec Law 25 overview: https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25

# First coder task

Audit the current checkout against this Phase 0 contract and produce a build-ready specification covering owned/reusable code, the new event and consent schema, threat model, retrieval benchmark, deletion/export path, UI states, tests, and an isolated dogfood rollout. Do not begin ambient capture or a full-site rewrite before that review.

# Remaining implementation choices

- Which two integrations follow deliberate voice capture.
- Whether Phase 0 synchronizes derived memories only or also selected encrypted raw evidence.
- Which local model/device mix meets acceptable transcription, battery, and cost targets.
