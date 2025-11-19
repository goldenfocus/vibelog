# Proof-of-Code: A Contribution-Based Blockchain Consensus

**Version 1.0**
**Authors:** Yan Lovez, The Proof-of-Code Foundation
**Date:** November 2025
**License:** CC BY 4.0 (Specification Text)

---

## Abstract

Proof-of-Code is a new blockchain consensus mechanism that replaces computational work and capital staking with verifiable human contribution. Validators earn consensus weight and block rewards by submitting cryptographically signed, timestamped evidence of code contributions—commits, pull requests, code reviews, security audits, tests, and design work. A deterministic scoring engine transforms this activity into measurable consensus power, creating the first blockchain secured entirely by developer output. Unlike Proof-of-Work (energy-intensive) or Proof-of-Stake (capital-gated), Proof-of-Code aligns chain security with ecosystem growth, rewards merit over resources, and distributes power fairly among builders. This paper defines the protocol architecture, contribution attestation layer, scoring algorithm, validator rules, anti-Sybil mechanisms, economics, and governance model—establishing Proof-of-Code as an open, neutral standard for the next generation of developer-first blockchains.

**One-sentence thesis:** Code is the work; contribution is consensus.

---

## 1. Introduction

### 1.1 The Limits of Proof-of-Work and Proof-of-Stake

Bitcoin's Proof-of-Work (PoW) consensus revolutionized trustless digital currency by requiring validators to expend computational energy to secure the network. However, PoW suffers from:

- **Energy waste:** Mining consumes the annual energy output of entire nations.
- **Centralization risk:** ASIC manufacturers and mining pools concentrate power.
- **Misaligned incentives:** Security depends on hardware, not ecosystem health.

Proof-of-Stake (PoS) addressed energy concerns by replacing computation with capital lock. Yet PoS introduces new problems:

- **Plutocracy:** Wealth determines consensus power, entrenching early holders.
- **Capital gates:** New participants must buy in, excluding merit-based contributors.
- **Misalignment:** Token holders may prioritize speculation over protocol development.

Both PoW and PoS treat chain security as orthogonal to the creation of value within the ecosystem. Validators are rewarded for extrinsic effort (hashing, staking) rather than intrinsic contribution (building, auditing, improving the protocol).

### 1.2 Why Human Contribution as Work?

In the era of AI-assisted development, the bottleneck to innovation is no longer computation—it is **human creativity, judgment, and coordinated effort**. The most valuable blockchains are those with thriving developer ecosystems: Ethereum's dominance stems from its contributor base, not its hashrate.

Proof-of-Code makes this implicit truth explicit: **the work that secures the chain is the work that builds the chain**.

By anchoring consensus to verifiable contributions—commits, reviews, tests, audits—Proof-of-Code creates:

1. **Perfect alignment:** Validators earn rewards by improving the protocol.
2. **Meritocratic access:** Anyone with skills can mine, regardless of wealth or hardware.
3. **Sustainable security:** The chain grows stronger as the ecosystem grows.
4. **Global impact:** Protocol profits fund world-scale humanitarian missions (see §8.3).

This is not an incremental improvement. It is a **paradigm shift**.

---

## 2. Core Design: Proof-of-Code Consensus

### 2.1 Definitions

- **Contribution:** A discrete, verifiable unit of work (commit, PR, review, issue, test, audit, design doc).
- **Attestation:** Cryptographically signed proof of a contribution (GPG/SSH signature, timestamp, repository state).
- **Contributor:** An entity (human or AI-assisted human) producing attestable contributions.
- **Validator:** A node that verifies attestations, computes contribution scores, proposes blocks, and participates in finality.
- **Scoring Engine:** A deterministic algorithm mapping attestations to consensus weight.
- **Consensus Weight:** A contributor's influence over block production and finality, proportional to scored contributions.

### 2.2 Actors

1. **Contributors:** Write code, review PRs, file issues, write tests, conduct audits.
2. **Attestors:** Git hosting platforms (GitHub, GitLab, self-hosted) or pluggable attestation services that sign and timestamp contributions.
3. **Validators:** Run full nodes, verify attestations, compute scores, propose blocks, vote on finality.
4. **Foundation:** Neutral steward of the protocol spec, open governance facilitator (see §9).

### 2.3 Lifecycle

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐       ┌──────────┐
│ Contributor │──────▶│  Attestation │──────▶│   Scoring   │──────▶│ Validator│
│  (Human)    │       │    Layer     │       │   Engine    │       │  (Node)  │
└─────────────┘       └──────────────┘       └─────────────┘       └──────────┘
      │                      │                       │                    │
      │ 1. Produce work      │ 2. Sign & timestamp   │ 3. Compute weight  │ 4. Propose block
      │    (commit, PR)      │    (GPG, DID)         │    (deterministic) │    & finalize
      └──────────────────────┴───────────────────────┴────────────────────┘
                                                                             │
                                                                             ▼
                                                                      ┌──────────────┐
                                                                      │  Blockchain  │
                                                                      │   (Finality) │
                                                                      └──────────────┘
```

**Separation of Concerns:**

- **Attestation:** Proves a contribution happened (who, what, when).
- **Scoring:** Quantifies impact (how much).
- **Validation:** Achieves consensus (finality).

---

## 3. Contribution Types

Each contribution type has explicit verification paths:

| Type               | Examples                      | Verification                                     | Weight Factors                                |
| ------------------ | ----------------------------- | ------------------------------------------------ | --------------------------------------------- |
| **Commit**         | Code changes, bug fixes       | Git SHA, GPG signature, parent commit proof      | LOC delta (normalized), test coverage delta   |
| **Pull Request**   | Feature proposal, merge       | PR metadata, review count, merge timestamp       | Review depth, conflicts resolved, test pass   |
| **Code Review**    | PR comments, approvals        | Review signature, timestamp, comment depth       | Lines reviewed, critical feedback, approval   |
| **Issue**          | Bug report, feature request   | Issue metadata, severity tag, resolution status  | Severity (P0-P3), reproducibility, fix impact |
| **Test**           | Unit/integration/e2e tests    | Test file diffs, coverage reports                | Coverage increase, test stability, speed      |
| **Security Audit** | Vulnerability disclosure, fix | Audit report signature, severity (CVE)           | CVE score (CVSS), fix verification            |
| **Design/Spec**    | RFCs, architecture docs       | Doc signature, review count, implementation link | Adoption (# of PRs citing spec), peer review  |

**Verification Path Example (Commit):**

1. Contributor pushes commit `abc123` with GPG signature.
2. Attestor (GitHub) signs attestation: `{commit: abc123, author: DID, timestamp: T, repo: R, signature: S}`.
3. Validator fetches attestation, verifies GPG key against DID, checks repo proof (Merkle root).
4. Scoring engine normalizes LOC delta, checks test coverage delta, applies duplicate detection.
5. Contribution score added to contributor's weight.

---

## 4. Attestation Layer

### 4.1 Attestation Sources

**Supported Platforms:**

- **GitHub:** Via GitHub Actions, commit signatures, API webhooks.
- **GitLab:** Via CI/CD pipelines, signed commits, API.
- **Self-Hosted Git:** Via git hooks, Sigstore signatures, custom attestors.
- **Pluggable Attestors:** Any service implementing the Attestation API (see §A.2).

### 4.2 Cryptographic Proofs

**Signed Commits:**

- **GPG:** Traditional OpenPGP signatures on commits.
- **SSH:** SSH key-based commit signing (Git 2.34+).
- **Sigstore:** Keyless signing with transparency logs (future-proof).

**Repository Proofs:**

- Merkle tree of commit history rooted in attestation.
- Timestamp anchored to Bitcoin/Ethereum for tamper-evidence.

**Decentralized Identifiers (DIDs):**

- Contributors map DID → GPG/SSH public keys.
- DID controllers can rotate keys, revoke compromised keys.
- On-chain DID registry (optional) or off-chain web-of-trust.

### 4.3 Attestation Data Structure

```json
{
  "version": "1.0",
  "type": "commit",
  "contributor_did": "did:key:z6Mk...",
  "contribution_id": "abc123...",
  "repo": "github.com/org/repo",
  "timestamp": "2025-11-18T12:34:56Z",
  "metadata": {
    "loc_added": 120,
    "loc_removed": 45,
    "files_changed": 3,
    "tests_added": 2,
    "coverage_delta": 0.02
  },
  "signature": "0x...",
  "attestor": "github.com",
  "attestor_signature": "0x..."
}
```

**Pluggability:** Any attestor can produce this schema. Validators verify signatures independently.

---

## 5. Scoring Engine

### 5.1 Deterministic Formula

The scoring engine must be:

- **Deterministic:** Same attestations → same score (reproducible).
- **Transparent:** Formula is public, auditable, versioned.
- **Resistant to gaming:** Normalization, diminishing returns, duplicate detection.

### 5.2 Weight Factors

**Commit Score:**

```
S_commit = (LOC_normalized * 0.4) + (coverage_delta * 0.3) + (complexity_delta * 0.2) + (review_depth * 0.1)

Where:
  LOC_normalized = log(1 + LOC_net) / log(1 + LOC_repo_median)
  coverage_delta = max(0, coverage_after - coverage_before)
  complexity_delta = max(0, cyclomatic_before - cyclomatic_after)  # Reward simplification
  review_depth = num_reviewers + (num_critical_comments * 0.5)
```

**Pull Request Score:**

```
S_pr = S_commits_in_pr + (merge_bonus * 2.0) + (conflict_resolution * 1.5) + (test_pass_bonus * 1.0)

Where:
  merge_bonus = 1.0 if merged, else 0.0
  conflict_resolution = num_conflicts_resolved * 0.2
  test_pass_bonus = 1.0 if all CI tests pass, else 0.0
```

**Code Review Score:**

```
S_review = (lines_reviewed / 100) + (critical_feedback * 2.0) + (approval * 1.5)

Where:
  critical_feedback = num_comments tagged "critical" or "security"
  approval = 1.0 if approved, -0.5 if rejected (spam prevention)
```

**Issue Score:**

```
S_issue = severity_multiplier * reproducibility * (1.0 + fix_impact)

Where:
  severity_multiplier = {P0: 10, P1: 5, P2: 2, P3: 1}
  reproducibility = 1.0 if reproducible, 0.5 if not
  fix_impact = 1.0 if fix merged, 0.0 otherwise
```

**Test Score:**

```
S_test = (coverage_increase * 5.0) + (test_count * 0.5) + (stability * 1.0)

Where:
  coverage_increase = (coverage_after - coverage_before)
  stability = 1.0 if tests pass for 30 days, else 0.5
```

**Security Audit Score:**

```
S_audit = CVSS_score * 2.0 + (fix_verified * 5.0)

Where:
  CVSS_score = Common Vulnerability Scoring System (0-10)
  fix_verified = 1.0 if fix merged and re-audited, else 0.0
```

**Design/Spec Score:**

```
S_spec = (peer_reviews * 1.5) + (adoption_count * 2.0) + (implementation_links * 1.0)

Where:
  peer_reviews = num_approvals from other contributors
  adoption_count = num_PRs citing this spec
  implementation_links = num_repos implementing spec
```

### 5.3 Anti-Gaming Heuristics

**Duplicate Detection:**

- Hash of code diff content → reject identical commits.
- Cosine similarity on commit messages → flag copy/paste.

**LOC Normalization:**

- Logarithmic scaling prevents "code bloat" attacks.
- Median LOC per commit in repo used as baseline.

**Review Quality:**

- Reject trivial reviews (e.g., "LGTM" with no comments on large PRs).
- Require minimum time-to-review based on lines changed.

**Diminishing Returns:**

- Per-contributor daily cap (soft limit; prevents spam).
- Exponential decay if contribution frequency exceeds human-plausible rates.

**Reputation Weighting:**

- New contributors start with weight = 0.5; ramps to 1.0 after 90 days of consistent contributions.
- Anti-Sybil: see §7.

### 5.4 Pseudocode

```python
def compute_contribution_score(attestation):
    type = attestation.type
    metadata = attestation.metadata
    contributor_did = attestation.contributor_did

    # Base score by type
    if type == "commit":
        score = commit_score(metadata)
    elif type == "pr":
        score = pr_score(metadata)
    elif type == "review":
        score = review_score(metadata)
    elif type == "issue":
        score = issue_score(metadata)
    elif type == "test":
        score = test_score(metadata)
    elif type == "audit":
        score = audit_score(metadata)
    elif type == "spec":
        score = spec_score(metadata)
    else:
        score = 0.0

    # Anti-gaming
    score = apply_duplicate_detection(score, attestation)
    score = apply_diminishing_returns(score, contributor_did)
    score = apply_reputation_weight(score, contributor_did)

    return max(0.0, score)  # No negative scores

def commit_score(meta):
    loc_norm = log(1 + meta.loc_net) / log(1 + repo_median_loc)
    coverage = max(0, meta.coverage_delta)
    complexity = max(0, meta.complexity_before - meta.complexity_after)
    review = meta.num_reviewers + (meta.critical_comments * 0.5)
    return (loc_norm * 0.4) + (coverage * 0.3) + (complexity * 0.2) + (review * 0.1)

# ... (similar functions for other types)
```

---

## 6. Validator Rules

### 6.1 Verification Process

**Step 1: Attestation Validation**

- Verify attestor signature (GitHub, GitLab, self-hosted).
- Verify contributor signature (GPG, SSH, Sigstore).
- Check timestamp is within acceptable clock skew (±5 minutes).
- Verify repository proof (Merkle root, commit ancestry).

**Step 2: Score Computation**

- Apply scoring engine (§5) deterministically.
- Store contribution score in validator state.

**Step 3: Consensus Weight Update**

- Aggregate contributor's scores over current epoch (e.g., 24 hours).
- Normalize weights across all contributors: `W_i = S_i / Σ(S_all)`.

**Step 4: Block Production**

- Select block proposer via weighted random sampling (weight = consensus weight).
- Proposer creates block with new attestations.

**Step 5: Finality**

- Validators vote on block validity (2/3+ majority required).
- Voting power = consensus weight.
- Finalized blocks are immutable.

### 6.2 Equivocation Penalties

**Double-Attestation:**

- If a contributor submits two conflicting attestations for the same contribution, both are rejected.
- Contributor's weight reduced by 10% for that epoch.

**Validator Double-Proposal:**

- If a validator proposes two blocks at the same height, they are slashed (lose 5% of accumulated weight).

### 6.3 Liveness Assumptions

- **Epoch length:** 24 hours (attestations batched per epoch).
- **Block time:** 12 seconds (similar to Ethereum).
- **Finality time:** 2 epochs (~48 hours for absolute finality).
- **Minimum validators:** 100 active validators to start; target 10,000+.

### 6.4 Pseudocode

```python
def validate_attestation(attestation):
    # 1. Verify signatures
    if not verify_attestor_signature(attestation):
        return False
    if not verify_contributor_signature(attestation):
        return False

    # 2. Verify timestamp
    if abs(now() - attestation.timestamp) > CLOCK_SKEW_TOLERANCE:
        return False

    # 3. Verify repository proof
    if not verify_repo_proof(attestation):
        return False

    # 4. Compute score
    score = compute_contribution_score(attestation)

    # 5. Update state
    state.contributor_scores[attestation.contributor_did] += score

    return True

def propose_block(epoch):
    # Weighted random sampling
    proposer = weighted_random(state.contributor_weights)

    # Create block
    block = Block(
        epoch=epoch,
        proposer=proposer,
        attestations=pending_attestations,
        timestamp=now()
    )

    # Broadcast
    broadcast(block)
    return block

def finalize_block(block):
    # Collect votes
    votes = collect_votes(block)

    # Check 2/3+ majority (weighted)
    total_weight = sum(state.contributor_weights.values())
    vote_weight = sum(state.contributor_weights[v] for v in votes)

    if vote_weight >= (2/3 * total_weight):
        state.finalized_blocks.append(block)
        return True
    return False
```

---

## 7. Security & Anti-Sybil

### 7.1 Identity Proofs

**Decentralized Identifiers (DIDs):**

- Each contributor controls a DID (e.g., `did:key:z6Mk...`).
- DID → public key mapping stored on-chain or in web-of-trust.

**GitHub/GitLab Verification:**

- Link DID to verified GitHub/GitLab account.
- Require account age > 90 days and > 10 prior contributions.

**Progressive Trust:**

- New contributors start with 0.5x weight multiplier.
- Weight increases to 1.0x after 90 days of consistent contributions.
- Weight can increase to 1.2x for "core contributors" (elected by DAO).

### 7.2 Reputation Accrual

**Reputation Score:**

- Separate from consensus weight; tracks historical quality.
- Factors: contribution acceptance rate, peer reviews received, audit findings.
- High reputation → voting weight in governance (see §9).

### 7.3 Multi-Attestor Consensus

**Cross-Platform Verification:**

- If a contribution appears on both GitHub and self-hosted git, require both attestors to sign.
- Discrepancies flagged for manual review.

**Attestor Reputation:**

- Validators track attestor reliability.
- Repeatedly invalid attestations → attestor downranked or blacklisted.

### 7.4 Duplicate Suppression

**Content-Addressed Hashing:**

- Hash of contribution content (code diff, commit message, PR description).
- Reject if hash seen in prior epochs (prevents replay attacks).

**Temporal Clustering:**

- Flag if contributor submits > 100 commits/day (exceeds human plausibility).
- Apply diminishing returns or require additional verification.

### 7.5 Collusion Resistance

**Review Rings:**

- Detect if contributors consistently review each other's PRs but no one else's.
- Apply review score discount if review graph centrality is abnormal.

**Sybil Amplification:**

- If many DIDs share IP addresses, SSH keys, or commit patterns, flag for investigation.
- Require CAPTCHA or proof-of-humanity (e.g., Worldcoin, BrightID) for flagged accounts.

### 7.6 Appeal Paths

**Dispute Resolution:**

- Contributors can appeal score discrepancies to DAO.
- Provide evidence (git logs, attestations, third-party audits).
- DAO votes (weighted by reputation) to adjust score.

---

## 8. Economics

### 8.1 Contribution-Mined Issuance

**Token Model:**

- Native token: **$CODE** (ticker TBD).
- **No pre-mine:** 100% of tokens mined via contributions (no ICO, no founder allocation).
- **Issuance schedule:** Exponential decay over 100 years (similar to Bitcoin halving).

**Reward Allocation:**

```
Block Reward = Base_Reward * (1 - epoch / Max_Epochs)^2

Where:
  Base_Reward = 50 $CODE/block (initial)
  Max_Epochs = 5,256,000 (100 years at 1 epoch/day)
```

**Distribution per Block:**

- **70%** to contributors (proportional to consensus weight).
- **20%** to validators (for running infrastructure).
- **10%** to Foundation treasury (see §8.3).

### 8.2 No Pay-to-Win

**Zero Capital Advantage:**

- Cannot "buy" consensus weight.
- Cannot stake tokens for influence.
- Only contributions count.

**Fair Launch:**

- Genesis block: 100 seed contributors (open application).
- First 90 days: uncapped participation (anyone can contribute).
- After 90 days: standard weight/reputation rules apply.

### 8.3 Foundation Treasury & Global Impact

**33% Profit Redistribution:**

- The Proof-of-Code Foundation commits **33% of all protocol-generated profits** to global humanitarian causes.
- **Priority causes:**
  1. **World Hunger:** Direct funding to food security initiatives, sustainable agriculture.
  2. **Global Education:** Free developer training, scholarships, open educational resources.
  3. **Open Source Grants:** Fund critical OSS projects and maintainers.

**Profit Sources:**

- Transaction fees (minimal; e.g., 0.001 $CODE/tx).
- Ecosystem grants (optional; projects can donate % of tokens).
- Foundation-run services (e.g., hosted attestors, analytics).

**Transparency:**

- All treasury allocations published on-chain.
- Quarterly reports detailing impact (meals funded, students educated, grants disbursed).
- Community votes on allocation priorities (see §9.4).

**Example:**

- Year 1 protocol revenue: $10M.
- Foundation treasury: $1M (10% of block rewards).
- 33% of treasury → $330K to humanitarian causes.
- Breakdown: $110K food security, $110K education, $110K OSS grants.

### 8.4 Long-Tail Incentives

**Reward All Contribution Types:**

- Not just commits: reviews, issues, tests, audits, docs all earn $CODE.
- Encourages ecosystem health over raw output.

**Retroactive Rewards:**

- If a contribution's impact becomes clear later (e.g., a spec adopted by 10 projects), retroactive bonus applied.

### 8.5 Slashing (Fraud Only)

**No Slashing for Inactivity:**

- Contributors can stop contributing with no penalty.

**Slashing Triggers:**

- **Provable plagiarism:** Copy/paste code from others without attribution → lose all weight for that epoch.
- **Malicious code:** Intentionally introduced vulnerabilities → lose 50% of total weight + reputation ban.
- **Attestation fraud:** Forged signatures, tampered timestamps → permanent ban from protocol.

---

## 9. Governance

### 9.1 Open Spec Principles

**Specification License:**

- This whitepaper and all protocol specs released under **CC BY 4.0** (Creative Commons Attribution).
- Anyone can fork, cite, build upon, or implement the spec.

**Reference Implementation License:**

- Initial reference client: **Business Source License 1.1** (BSL).
- **Change date:** 4 years from release → converts to MIT license.
- Protects against exploitative forks during maturation; ensures eventual full openness.

### 9.2 Contributor Reputation → Voting Weight

**Governance Votes:**

- Protocol upgrades, parameter changes, treasury allocations.
- Voting weight = `f(reputation, tenure, recent_activity)`.

**Reputation Formula:**

```
Voting_Weight = (Reputation_Score^0.5) * (Tenure_Days / 365) * Activity_Multiplier

Where:
  Reputation_Score = historical contribution quality (0-100)
  Tenure_Days = days since first contribution
  Activity_Multiplier = 1.0 if active in last 90 days, else 0.5
```

**Protections:**

- New contributors cannot vote immediately (must accrue 30 days tenure + 10 contributions).
- Prevents drive-by governance attacks.

### 9.3 Neutral Foundation Path

**Foundation Structure:**

- **Phase 1 (Year 0-2):** Bootstrapped by core team; benevolent dictator model for rapid iteration.
- **Phase 2 (Year 2-4):** Transition to multi-stakeholder board (developers, validators, ecosystem partners).
- **Phase 3 (Year 4+):** Full DAO governance; foundation becomes administrative layer only.

**Non-Profit Commitment:**

- Foundation incorporated as 501(c)(3) or equivalent (jurisdiction TBD).
- No shareholders; all surplus reinvested in protocol or humanitarian causes.

### 9.4 Public RFCs

**Improvement Proposals:**

- Anyone can submit a **Proof-of-Code Improvement Proposal (PCIP)**.
- Format: problem statement, proposed solution, implementation plan, security analysis.
- Community discussion → rough consensus → DAO vote → implementation.

**Versioning:**

- Protocol version = `MAJOR.MINOR.PATCH` (semantic versioning).
- Breaking changes require 80% supermajority vote.

### 9.5 Upgrade Safety

**Backward Compatibility:**

- All protocol upgrades must support 2 prior versions for 12 months.
- Gives ecosystem time to adapt.

**Sunset Plans:**

- Any centralized component (e.g., initial attestor, foundation-run services) must have documented decentralization plan.
- Timeline: all centralization sunset by Year 5.

---

## 10. Roadmap

### Phase 1: Specification (Q4 2025)

- ✅ Whitepaper v1.0 (this document).
- Publish CONSENSUS.md, THREAT_MODEL.md, GLOSSARY.md.
- Open public RFC process.

### Phase 2: Reference Implementation (Q1-Q2 2026)

- Build validator client (Rust or Go).
- Implement scoring engine, attestation layer, block production.
- Release under BSL 1.1.

### Phase 3: Testnet (Q3 2026)

- Launch public testnet with 100 seed validators.
- Invite open-source projects to participate.
- Stress-test anti-Sybil, scoring, finality.

### Phase 4: Ecosystem & Tooling (Q4 2026)

- Build attestor marketplace (GitHub, GitLab, Gitea, custom).
- Developer SDKs (JS, Python, Rust).
- Explorer, wallet, contribution analytics dashboard.

### Phase 5: Mainnet (Q1 2027)

- Genesis block with fair launch (no pre-mine).
- 1,000+ validators at launch.
- Foundation treasury active; first humanitarian allocation.

### Phase 6: Scale & Decentralize (2027-2030)

- 10,000+ validators.
- Cross-chain bridges (Ethereum, Cosmos, Polkadot).
- Full DAO governance transition.
- Foundation becomes advisory-only.

---

## 11. Conclusion

Proof-of-Code is not merely a technical innovation—it is a **philosophical realignment** of what blockchain consensus can be. By anchoring security to human contribution instead of energy or capital, we create a system where:

- **Builders are rewarded for building.**
- **Merit, not wealth, determines power.**
- **The chain's security grows with the ecosystem's health.**
- **Profits fund global good, not just token holders.**

In an era where AI accelerates code generation, Proof-of-Code ensures that **human judgment, creativity, and collaboration remain the ultimate source of value**. This protocol is not just for crypto—it is for every developer who has ever contributed to open source without compensation, every reviewer who has mentored without recognition, every auditor who has secured systems without reward.

Proof-of-Code makes contribution **visible, verifiable, and valuable**.

This is the future of consensus. This is the chain built by builders, for builders.

**Join us.**

---

## Appendices

### A.1 Glossary

See [GLOSSARY.md](./GLOSSARY.md).

### A.2 Threat Model

See [THREAT_MODEL.md](./THREAT_MODEL.md).

### A.3 Example Scoring Trace

**Scenario:** Alice submits a commit fixing a security bug.

```
Attestation:
  type: commit
  contributor_did: did:key:alice
  commit_sha: abc123
  repo: github.com/proof-of-code/core
  loc_added: 30
  loc_removed: 15
  tests_added: 1
  coverage_delta: 0.03
  complexity_delta: -2 (reduced complexity)
  reviewers: 2
  critical_comments: 1

Scoring:
  LOC_normalized = log(1 + 15) / log(1 + 200) = 0.51
  coverage_delta = 0.03
  complexity_delta = 2 (positive, rewarded)
  review_depth = 2 + (1 * 0.5) = 2.5

  S_commit = (0.51 * 0.4) + (0.03 * 0.3) + (2 * 0.2) + (2.5 * 0.1)
           = 0.204 + 0.009 + 0.4 + 0.25
           = 0.863

Anti-Gaming:
  - No duplicate detected (unique diff hash).
  - Alice has 120 days tenure → reputation weight = 1.0.
  - Final score: 0.863 * 1.0 = 0.863 $CODE.

Result:
  Alice earns 0.863 $CODE for this commit.
  Her consensus weight increases by 0.863 for the current epoch.
```

### A.4 Notation

- **DID:** Decentralized Identifier (W3C standard).
- **GPG:** GNU Privacy Guard (OpenPGP implementation).
- **LOC:** Lines of Code.
- **CVSS:** Common Vulnerability Scoring System.
- **RFC:** Request for Comments.
- **PCIP:** Proof-of-Code Improvement Proposal.
- **DAO:** Decentralized Autonomous Organization.
- **BSL:** Business Source License.

### A.5 References

1. Nakamoto, S. (2008). _Bitcoin: A Peer-to-Peer Electronic Cash System_.
2. Buterin, V. (2014). _Ethereum Whitepaper_.
3. W3C. (2021). _Decentralized Identifiers (DIDs) v1.0_.
4. Sigstore Project. (2023). _Keyless Code Signing_.
5. Common Vulnerability Scoring System (CVSS) v3.1.

---

**End of Whitepaper v1.0**

---

## Contact & Contributions

- **Website:** [proof-of-code.org](https://proof-of-code.org) (TBD)
- **GitHub:** [github.com/proof-of-code/protocol](https://github.com/proof-of-code/protocol) (TBD)
- **Email:** foundation@proof-of-code.org (TBD)
- **RFC Process:** Submit PCIPs via GitHub issues.

**License:** This whitepaper is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). You are free to share, adapt, and build upon this work, even commercially, as long as you provide attribution.

**Version History:**

- v1.0 (2025-11-18): Initial release.

---

**Proof-of-Code: Code is the work. Contribution is consensus.**

❤️🦾🤖🚀✨
