# Modal.com Infrastructure Status

**Last Updated:** November 18, 2025
**Status:** 🔴 **DECOMMISSIONED**

---

## Current State

Modal.com TTS service has been **fully decommissioned** as of November 2025.

### What Was Removed

1. **Code:**
   - `modal_tts.py` (242 lines, Coqui XTTS v2 voice cloning service)
   - `MODAL_SETUP.md` (deployment instructions)

2. **Configuration:**
   - `lib/config.ts`: Removed `ai.modal.endpoint` and `ai.modal.enabled`
   - `lib/env.ts`: Removed `MODAL_TTS_ENDPOINT` and `MODAL_ENABLED` validation
   - `.env.example`: Removed Modal env var placeholders

3. **Cost Impact:**
   - **Before:** ~$150/month ($121.90 additional usage beyond $30 credits)
   - **After:** $0/month (service fully disabled)

---

## Why Was Modal Removed?

### Root Cause

Modal TTS (`vibelog-tts` app with `modal_tts.generate_speech` function) was **burning GPU/CPU spend with zero usage**.

- **Cost:** ~$15/day on Modal.com (T4 GPU @ ~$0.0005/second)
- **Usage:** **ZERO** — Modal TTS was replaced by OpenAI TTS months ago
- **Detection:** Billing showed `modal_tts.generate_speech` as top cost driver despite no intentional calls

### Migration History

**Old System (Deprecated):**

- Service: `modal_tts.py` deployed to Modal.com
- Tech: Coqui XTTS v2 multilingual voice cloning
- GPU: NVIDIA T4
- Cost: ~$0.0005/second generation time
- Endpoint: `https://username--vibelog-tts-tts-endpoint.modal.run`

**Current System (Active):**

- Service: OpenAI TTS (see [app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts))
- Tech: OpenAI `tts-1-hd` model, `nova` voice
- Cost: ~$0.015 per 1000 characters (cheaper + simpler)
- No self-hosted infrastructure required

**Why OpenAI Won:**

- ✅ Lower total cost (no idle GPU time)
- ✅ Zero infrastructure management
- ✅ Faster cold starts (<1s vs ~5-10s)
- ✅ Built-in reliability and scaling

---

## Current TTS Architecture

### Voice Generation Flow

```
User creates vibelog
    ↓
Original audio saved to Supabase Storage
    ↓
[Optional] Generate AI narration
    ↓
POST /api/vibelog/generate-ai-audio
    ↓
OpenAI TTS (tts-1-hd, voice: nova)
    ↓
Upload MP3 to Supabase Storage
    ↓
Update vibelog.ai_audio_url
```

### Key Files

- **[app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts):** Active AI narration endpoint (OpenAI TTS)
- **[app/api/text-to-speech/route.ts](app/api/text-to-speech/route.ts):** Disabled legacy endpoint (returns 410 Gone)

---

## Modal.com Workspace Lockdown

### Immediate Actions Required (Manual)

You must **manually disable** the Modal.com workspace to stop billing:

#### 1. Disable Apps

- [ ] Log in to [modal.com/apps](https://modal.com/apps)
- [ ] Find app: `vibelog-tts`
- [ ] Click "Disable" or "Delete"
- [ ] Confirm no cron jobs or scheduled functions remain active

#### 2. Remove Web Endpoints

- [ ] Navigate to deployed functions
- [ ] Delete or pause: `tts_endpoint`, `health`, `generate_speech`
- [ ] Confirm no public URLs remain accessible

#### 3. Tighten Budget Controls

- [ ] Go to Workspace Settings → Billing
- [ ] Set monthly budget cap to **$1** (or minimum allowed)
- [ ] Enable billing alerts at **$1 threshold**
- [ ] Remove auto-increase permissions

#### 4. Verify Zero Spend

- [ ] Wait 3-7 days after changes
- [ ] Check next billing cycle (Dec 4 - Jan 3)
- [ ] **Expected result:** $0 additional usage (only $30 monthly credits unused)
- [ ] If spend > $1, investigate and escalate

---

## How to Re-Enable Modal (If Needed)

### Prerequisites

⚠️ **WARNING:** Re-enabling Modal will cost ~$15/day unless usage is tightly controlled.

Only re-enable if:

1. OpenAI TTS quality is insufficient for a specific use case
2. You need multilingual voice cloning (17 languages)
3. You have budget approval for GPU-based TTS

### Re-Enablement Steps

1. **Restore code:**

   ```bash
   git checkout <commit-before-removal> -- modal_tts.py MODAL_SETUP.md
   ```

2. **Restore config:**
   - Add back Modal env vars to `lib/env.ts` and `lib/config.ts`
   - Update `.env.example` and `.env.local`

3. **Deploy to Modal:**

   ```bash
   modal deploy modal_tts.py
   ```

4. **Update API routes:**
   - Modify [app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts) to call Modal endpoint instead of OpenAI

5. **Add cost controls:**
   - Daily request cap (e.g., 100 generations/day)
   - User-level rate limiting
   - Budget alerts at $5/day

6. **Document why:**
   - Update this file with justification
   - Add cost monitoring dashboard
   - Set sunset date (e.g., 90 days trial)

---

## Cost Comparison

| Service        | Cost per Generation           | Monthly Cost (10K generations)  | Cold Start | Management                  |
| -------------- | ----------------------------- | ------------------------------- | ---------- | --------------------------- |
| **Modal TTS**  | ~$0.015 (avg 30s @ $0.0005/s) | ~$150                           | 5-10s      | High (Docker, GPU, scaling) |
| **OpenAI TTS** | ~$0.015 per 1K chars          | ~$60 (assumes 4K chars/vibelog) | <1s        | Zero (API only)             |
| **ElevenLabs** | ~$0.60 per 1K chars           | ~$2,400                         | <1s        | Zero (API only)             |

**Winner:** OpenAI TTS (lowest cost + zero ops overhead)

---

## Security Notes

### Secrets Cleanup

If you had `MODAL_TTS_ENDPOINT` or Modal API keys in production:

1. **Rotate Vercel env vars:**
   - Remove `MODAL_TTS_ENDPOINT` from Vercel project settings
   - Remove `MODAL_ENABLED` from Vercel project settings

2. **Revoke Modal API tokens (if any):**
   - Go to Modal.com → Settings → API Tokens
   - Revoke any tokens associated with VibeLog

3. **Audit logs:**
   - Check Modal.com request logs for any unexpected calls in the past 30 days
   - If found, investigate source and block

---

## Monitoring & Verification

### Success Metrics

After decommissioning, verify:

1. **Zero Modal spend:**
   - Check Modal.com billing dashboard daily for 7 days
   - Expected: $0 additional usage per period
   - Alert threshold: >$1 in a 24-hour period

2. **No user regressions:**
   - Monitor Sentry for TTS-related errors
   - Check support tickets for audio generation issues
   - Expected: Zero increase in error rate

3. **Codebase cleanliness:**
   - `git grep -i modal` should return only:
     - Component/UI files using "modal" for dialogs (unrelated)
     - This documentation file
   - No references to `modal_tts`, `MODAL_TTS_ENDPOINT`, or `vibelog-tts`

### Ongoing Vigilance

- **Monthly cost review:** Include Modal.com in monthly infra cost audits
- **Prevent re-activation:** If someone redeploys `modal_tts.py`, billing alerts will fire
- **Document decisions:** All future infra choices must have clear ROI and sunset plans

---

## Lessons Learned

### What Went Wrong

1. **Zombie infrastructure:** Modal TTS continued billing after migration to OpenAI
2. **No usage tracking:** No logging/metrics to detect zero usage
3. **No cost alerts:** Spent ~$150/month for 2+ months before detection
4. **Incomplete migration:** Old code/configs remained after switching providers

### How We Fixed It

1. **Audited all infra providers:** Modal, Vercel, Supabase, OpenAI
2. **Removed unused code:** Deleted 242 lines + 2 docs + 3 config blocks
3. **Tightened cost controls:** Budget caps + $1 alerts on all services
4. **Documented everything:** This file + commit history

### How to Prevent This

1. **Outcome-driven infra:** Every service must tie to revenue or user value
2. **Monthly cost reviews:** Review all provider bills monthly
3. **Usage-based alerts:** Alert on zero-usage services after 7 days
4. **Deprecation protocol:**
   - When migrating providers, DELETE old code immediately
   - Add `DEPRECATED:` prefix to env vars before removal
   - Set calendar reminder to audit 30 days post-migration

---

## Related Documentation

- **OpenAI TTS:** [app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts)
- **Legacy TTS:** [app/api/text-to-speech/route.ts](app/api/text-to-speech/route.ts) (disabled, returns 410 Gone)
- **Cost optimization:** See VibeLog infra cost tracker (Notion/Linear/wherever you track this)

---

## Questions?

If you're reading this and considering re-enabling Modal:

1. **Ask first:** Why do we need it? What's the OpenAI TTS blocker?
2. **Calculate cost:** Model spend at expected usage (e.g., 1K, 10K, 100K generations/month)
3. **Set sunset date:** If trial, when do we decide keep/kill?
4. **Document decision:** Update this file with justification + cost approval

**Default answer:** Don't re-enable unless you have a clear, cost-approved reason.

---

**Status:** ✅ Decommissioned successfully. Zero Modal spend expected going forward.
**Next review:** December 15, 2025 (verify zero billing for full cycle)
**Owner:** Yan (@vibeyang)
