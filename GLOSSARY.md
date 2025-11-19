# Proof-of-Code Glossary

**Version 1.0**
**Last Updated:** November 2025

This glossary defines key terms used in the Proof-of-Code protocol specification.

---

## A

**Attestation**
A cryptographically signed proof of a contribution, containing metadata (who, what, when, where), contributor signature, and attestor signature. Attestations are the fundamental unit of input to the scoring engine.

**Attestor**
A trusted entity (e.g., GitHub, GitLab, self-hosted git server, or custom service) that signs and timestamps contributions. Attestors provide tamper-evident proof that a contribution occurred.

**Anti-Sybil**
Mechanisms designed to prevent a single entity from creating multiple fake identities to gain unfair consensus weight. Includes identity proofs, reputation accrual, and behavioral analysis.

---

## B

**Block Proposer**
A validator selected (via weighted random sampling) to create a new block containing attestations. Selection probability is proportional to consensus weight.

**BSL (Business Source License)**
A license that allows code to be open-source with usage restrictions for a specified period (the "change date"), after which it converts to a fully permissive license (e.g., MIT).

---

## C

**Consensus Weight**
A contributor's influence over block production and finality, proportional to their scored contributions in the current epoch. Higher weight = higher probability of being selected as block proposer.

**Contribution**
A discrete, verifiable unit of work: commit, pull request, code review, issue, test, security audit, or design document. Contributions are the "work" in Proof-of-Code.

**Contributor**
An entity (human or AI-assisted human) producing attestable contributions. Contributors earn consensus weight and $CODE tokens.

**CVSS (Common Vulnerability Scoring System)**
An industry-standard framework for rating the severity of security vulnerabilities (0-10 scale). Used in scoring security audits.

---

## D

**DAO (Decentralized Autonomous Organization)**
A governance structure where protocol decisions are made by token/reputation-weighted voting, rather than centralized authority.

**DID (Decentralized Identifier)**
A W3C standard for self-sovereign digital identities. Each contributor controls a DID (e.g., `did:key:z6Mk...`) mapped to cryptographic keys.

**Diminishing Returns**
A scoring mechanism that reduces per-contribution rewards if a contributor exceeds human-plausible activity rates (e.g., >100 commits/day).

---

## E

**Epoch**
A fixed time period (24 hours in Proof-of-Code) during which attestations are batched, scores computed, and consensus weights updated.

**Equivocation**
The act of submitting conflicting attestations or block proposals. Penalized by weight reduction or slashing.

---

## F

**Finality**
The state where a block is considered immutable and cannot be reverted. Achieved when 2/3+ of weighted validators vote to confirm the block.

**Foundation**
The Proof-of-Code Foundation, a neutral nonprofit steward of the protocol specification, governance facilitator, and administrator of the humanitarian treasury.

---

## G

**GPG (GNU Privacy Guard)**
An implementation of the OpenPGP standard for cryptographic signing and encryption. Used to sign commits and attestations.

---

## L

**LOC (Lines of Code)**
A metric counting added/removed lines in a commit. Logarithmically normalized in scoring to prevent "code bloat" gaming.

**Liveness**
The property that the blockchain continues to produce and finalize blocks, even if some validators are offline or malicious.

---

## P

**PCIP (Proof-of-Code Improvement Proposal)**
A formal proposal for protocol changes, submitted via the RFC process. Requires community discussion and DAO vote for adoption.

**Proof-of-Code**
A blockchain consensus mechanism where validators earn rewards and consensus weight through verifiable contributions (code, reviews, audits, etc.) instead of computational work (PoW) or capital stake (PoS).

**Proof-of-Stake (PoS)**
A consensus mechanism where validators lock capital (tokens) to earn the right to propose blocks. Criticized for plutocracy.

**Proof-of-Work (PoW)**
A consensus mechanism where validators expend computational energy (hashrate) to propose blocks. Criticized for energy waste.

---

## R

**Reputation Score**
A separate metric (distinct from consensus weight) tracking a contributor's historical quality and trustworthiness. Used to determine voting weight in governance.

**RFC (Request for Comments)**
A public process for proposing and discussing protocol changes. Similar to BIPs (Bitcoin) or EIPs (Ethereum).

---

## S

**Scoring Engine**
The deterministic algorithm that transforms attestations into contribution scores. Must be transparent, reproducible, and gaming-resistant.

**Sigstore**
A keyless code-signing system using transparency logs and short-lived certificates. Provides future-proof attestation without long-term key management.

**Slashing**
The penalty (loss of weight, reputation, or tokens) applied to validators or contributors who provably misbehave (e.g., double-signing, fraud).

**Sybil Attack**
An attack where a single entity creates many fake identities to gain disproportionate influence. Mitigated by identity proofs and reputation systems.

---

## V

**Validator**
A node that verifies attestations, computes scores, proposes blocks, and votes on finality. Validators earn a share of block rewards for infrastructure costs.

---

## W

**Weighted Random Sampling**
The algorithm for selecting block proposers, where probability of selection is proportional to consensus weight. Ensures fairness while rewarding high contributors.

---

## Symbols & Notation

- **$CODE**: The native token of the Proof-of-Code blockchain.
- **S_commit**: Score for a commit contribution.
- **W_i**: Consensus weight of contributor _i_.
- **Σ(S_all)**: Sum of all contribution scores in the current epoch.
- **2/3+**: Two-thirds supermajority (67%+), required for finality.

---

**For full definitions and context, see [WHITEPAPER.md](./WHITEPAPER.md).**

---

**License:** CC BY 4.0
**Maintained by:** The Proof-of-Code Foundation
