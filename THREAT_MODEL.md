# Proof-of-Code Threat Model

**Version 1.0**
**Last Updated:** November 2025

This document outlines potential attack vectors, adversarial strategies, and mitigation mechanisms for the Proof-of-Code protocol.

---

## 1. Threat Categories

### 1.1 Sybil Attacks

**Attack:** Adversary creates many fake identities (DIDs) to inflate consensus weight.

**Vectors:**

- Mass GitHub account creation with bot-generated commits.
- Self-hosted git servers generating fake attestations.
- Stolen or compromised developer identities.

**Mitigations:**

- **Identity Proofs:** Require verified GitHub/GitLab accounts (age > 90 days, prior activity).
- **Progressive Trust:** New contributors start at 0.5x weight multiplier for 90 days.
- **Behavioral Analysis:** Flag contributors with abnormal activity patterns (>100 commits/day).
- **Multi-Attestor Consensus:** Require attestations from multiple independent sources for high-value contributions.
- **Proof-of-Humanity (Future):** Integrate with Worldcoin, BrightID, or similar systems for high-reputation contributors.

---

### 1.2 Contribution Fraud

#### 1.2.1 Code Plagiarism

**Attack:** Copy/paste code from other projects without attribution to earn weight.

**Mitigations:**

- **Content-Addressed Hashing:** Hash of code diff → reject identical content seen before.
- **Cosine Similarity Analysis:** Detect near-duplicate commits across repos.
- **Cross-Repo Checks:** Validators query public git databases (e.g., GitHub API) to detect copied code.
- **Community Reporting:** Allow contributors to flag plagiarism; DAO investigates.

#### 1.2.2 Commit Spam

**Attack:** Submit thousands of trivial commits (e.g., whitespace changes, typo fixes) to farm weight.

**Mitigations:**

- **LOC Normalization:** Logarithmic scaling prevents linear reward for code bloat.
- **Diminishing Returns:** Exponential decay if contribution rate exceeds human-plausible thresholds.
- **Quality Heuristics:** Reject commits with high churn (add/remove same lines repeatedly).
- **Review Requirements:** High-frequency contributors require peer reviews to earn full weight.

#### 1.2.3 Fake Reviews

**Attack:** Create fake "review rings" where contributors approve each other's low-quality PRs.

**Mitigations:**

- **Review Quality Checks:** Reject trivial reviews ("LGTM" with no comments on large PRs).
- **Graph Centrality Analysis:** Detect if review patterns form isolated cliques.
- **Time-to-Review Requirements:** Minimum review time based on lines changed (e.g., 1 minute per 100 LOC).
- **Reputation Weighting:** High-reputation reviewers earn more weight; new reviewers earn less.

---

### 1.3 Attestor Compromise

#### 1.3.1 Malicious Attestor

**Attack:** A compromised or malicious attestor (e.g., rogue GitLab instance) signs fraudulent attestations.

**Mitigations:**

- **Attestor Reputation System:** Validators track attestor reliability; downrank/blacklist unreliable attestors.
- **Multi-Attestor Requirements:** High-value contributions require multiple attestor signatures.
- **Transparency Logs:** Attestors publish signed attestation logs; validators can audit.
- **Decentralized Attestors:** Encourage self-hosted git with Sigstore (keyless, transparency-log-backed).

#### 1.3.2 Attestation Replay

**Attack:** Re-submit old attestations to earn weight multiple times.

**Mitigations:**

- **Temporal Uniqueness:** Content hash + timestamp → reject duplicates.
- **Nonce/Sequence Numbers:** Each attestation includes monotonically increasing nonce.
- **Epoch Boundaries:** Attestations valid only for epoch in which they were created.

---

### 1.4 Validator Attacks

#### 1.4.1 Double-Proposal (Equivocation)

**Attack:** A validator proposes two conflicting blocks at the same height to disrupt finality.

**Mitigations:**

- **Slashing:** Validators caught double-proposing lose 5% of consensus weight.
- **Cryptographic Evidence:** Signatures on conflicting blocks prove misbehavior.
- **Gossip Protocol:** Validators broadcast evidence of equivocation to network.

#### 1.4.2 Censorship

**Attack:** A validator with high consensus weight refuses to include attestations from certain contributors.

**Mitigations:**

- **Block Proposer Rotation:** No single validator can censor indefinitely (weighted random sampling ensures turnover).
- **Inclusion Proofs:** Contributors can prove their attestations were excluded; DAO can penalize censoring validators.
- **Mempool Transparency:** Pending attestations visible to all validators.

#### 1.4.3 Long-Range Attack

**Attack:** Adversary creates alternate chain history from genesis, accumulating fake contributions.

**Mitigations:**

- **Checkpointing:** Periodic finality checkpoints signed by 2/3+ validators; cannot revert past checkpoint.
- **Weak Subjectivity:** New validators sync from recent checkpoint, not genesis.
- **Attestation Anchoring:** Anchor attestation Merkle roots to Bitcoin/Ethereum for tamper-evidence.

---

### 1.5 Economic Attacks

#### 1.5.1 Contribution Market

**Attack:** Contributors sell their weight/tokens to buyers who want consensus power without contributing.

**Mitigations:**

- **Non-Transferable Weight:** Consensus weight tied to DID, not tradable.
- **Reputation Decay:** Weight decays if contributor stops contributing (encourages continuous participation).
- **Governance Voting:** Even if tokens are sold, governance voting weighted by reputation (non-tradable).

#### 1.5.2 Bribery

**Attack:** Adversary bribes validators to include fraudulent attestations or exclude legitimate ones.

**Mitigations:**

- **Transparent Scoring:** All score computations public; community can audit.
- **Slashing for Fraud:** Validators caught accepting bribes lose weight + reputation ban.
- **Whistleblower Rewards:** Contributors who expose bribery earn bonus weight.

---

### 1.6 Privacy Attacks

#### 1.6.1 Contributor Deanonymization

**Attack:** Analyze on-chain attestations to link DIDs to real-world identities.

**Mitigations:**

- **Minimal On-Chain Data:** Store only contribution hashes, not raw code or metadata.
- **DID Rotation:** Contributors can rotate DIDs periodically; old weight migrates via DAO vote.
- **Zero-Knowledge Proofs (Future):** Prove contribution quality without revealing contributor identity.

#### 1.6.2 Metadata Leakage

**Attack:** Infer contributor behavior, work patterns, or employer from attestation metadata.

**Mitigations:**

- **Aggregated Scores:** Publish only epoch-aggregated scores, not per-contribution granularity.
- **Delayed Publication:** Attestations published 24 hours after submission (prevents real-time tracking).

---

## 2. Attack Scenarios & Responses

### Scenario 1: Botnet Spam Attack

**Attacker:** Large botnet operator.
**Goal:** Create 10,000 fake GitHub accounts, generate millions of trivial commits.

**Response:**

1. **Progressive Trust** reduces new accounts to 0.5x weight for 90 days.
2. **Diminishing Returns** caps per-contributor weight at human-plausible rates.
3. **LOC Normalization** prevents linear scaling from code bloat.
4. **Behavioral Flagging** detects abnormal commit rates; triggers manual review.
5. **Community Reporting** allows legitimate contributors to flag bot accounts.
6. **DAO Vote** to ban confirmed bot accounts; slashing retroactive weight.

**Outcome:** Attack cost (10K GitHub accounts, bot infrastructure) exceeds reward (capped weight). Economic disincentive.

---

### Scenario 2: Insider Attestor Collusion

**Attacker:** Malicious employee at a major git hosting platform (e.g., GitHub).
**Goal:** Sign fraudulent attestations for non-existent contributions.

**Response:**

1. **Multi-Attestor Verification** requires cross-platform confirmation (e.g., GitHub + GitLab).
2. **Transparency Logs** make all attestations auditable; community detects anomalies.
3. **Reputation Decay** reduces weight of attestor caught in fraud.
4. **Validator Blacklisting** excludes fraudulent attestor from future consensus.
5. **Legal Action** (if applicable) against malicious insider.

**Outcome:** Fraud detected within 1-2 epochs; damage limited; attestor reputation destroyed.

---

### Scenario 3: Wealthy Buyer Acquires Top Contributors

**Attacker:** Well-funded entity.
**Goal:** Buy out top 100 contributors' tokens/accounts to control consensus.

**Response:**

1. **Non-Transferable Weight** prevents weight from being sold (tokens can be sold, but not weight).
2. **Reputation Decay** reduces weight if contributor stops contributing post-acquisition.
3. **Governance Firewall** separates consensus weight (contribution-based) from governance voting (reputation-based).
4. **Community Forking** allows honest contributors to fork protocol if 51% attack succeeds.

**Outcome:** Attack fails or results in contentious hard fork (attacker's chain has no legitimacy).

---

## 3. Future Hardening

### 3.1 Zero-Knowledge Contributions

**Goal:** Prove contribution quality without revealing contributor identity or code content.

**Approach:**

- zk-SNARKs to prove "I made a commit with LOC delta > X" without revealing commit.
- Preserves privacy while maintaining verifiability.

### 3.2 Federated Attestors

**Goal:** Decentralize attestation layer to eliminate single points of failure.

**Approach:**

- Replace centralized git hosts with federated protocol (e.g., Radicle, Git over IPFS).
- Attestors run as distributed nodes; Byzantine fault tolerance.

### 3.3 AI-Assisted Auditing

**Goal:** Automatically detect plagiarism, spam, and low-quality contributions.

**Approach:**

- Train ML models on historical contribution data.
- Flag anomalies for human review.

---

## 4. Responsible Disclosure

If you discover a vulnerability in the Proof-of-Code protocol:

1. **Do not disclose publicly** until a fix is deployed.
2. **Email:** security@proof-of-code.org (PGP key: TBD).
3. **Include:** Detailed description, proof-of-concept, suggested mitigation.
4. **Reward:** Eligible for bug bounty (details TBD).

---

## 5. Open Questions

These threats require further research:

1. **Quantum Resistance:** How to handle post-quantum cryptography for signatures?
2. **AI-Generated Contributions:** Should AI-written code earn weight? How to detect/regulate?
3. **Cross-Chain Attacks:** If Proof-of-Code bridges to other chains, what are bridge-specific threats?

---

**For full protocol details, see [WHITEPAPER.md](./WHITEPAPER.md).**

---

**License:** CC BY 4.0
**Maintained by:** The Proof-of-Code Foundation
