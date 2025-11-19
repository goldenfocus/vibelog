# Modal.com Workspace Lockdown Checklist

**Date:** November 18, 2025
**Operator:** Yan (@vibeyang)
**Objective:** Stop $150/month Modal.com spend from legacy TTS usage

---

## ✅ Pre-Flight Checklist

Before executing, confirm:

- [ ] Codebase changes committed (Modal TTS code removed)
- [ ] You have access to [modal.com](https://modal.com)
- [ ] You have workspace admin permissions
- [ ] You've read [INFRA_MODAL.md](INFRA_MODAL.md) (context)

---

## 🔴 Step 1: Disable `vibelog-tts` App

### Actions

1. **Log in to Modal.com:**
   - Go to: [https://modal.com/apps](https://modal.com/apps)
   - Select workspace (likely `vibeyang` or `vibelog`)

2. **Locate the app:**
   - Find: `vibelog-tts`
   - Check status (should show "Deployed" or "Active")

3. **Disable the app:**
   - Click on `vibelog-tts`
   - Look for "Disable" or "Delete" button
   - If "Disable" exists: click it (safer, reversible)
   - If only "Delete" exists: click it (permanent, but we don't need it)

4. **Verify:**
   - [ ] App status shows "Disabled" or no longer appears in list
   - [ ] No running containers shown for `vibelog-tts`

---

## 🔴 Step 2: Remove Web Endpoints

### Actions

1. **Navigate to Functions:**
   - In `vibelog-tts` app (if still visible after disabling)
   - Or go to: Workspace → Functions

2. **Identify endpoints:**
   - `tts_endpoint` (main TTS API)
   - `health` (health check)
   - `generate_speech` (GPU function)

3. **Delete or pause endpoints:**
   - For each endpoint:
     - Click "..." or settings
     - Select "Delete" or "Pause"
     - Confirm deletion

4. **Verify:**
   - [ ] No public URLs accessible (test by curling the old endpoint)
   - [ ] Example test:
     ```bash
     curl https://yourname--vibelog-tts-tts-endpoint.modal.run
     # Should return 404 or connection error
     ```

---

## 🔴 Step 3: Stop Cron Jobs (If Any)

### Actions

1. **Navigate to Cron:**
   - Workspace → Cron Jobs or Scheduled Functions

2. **Check for Modal TTS jobs:**
   - Look for any jobs that call `modal_tts.*` functions
   - Common names: `tts_cron`, `generate_speech_job`, etc.

3. **Disable cron jobs:**
   - For each job:
     - Click "Disable" or "Delete"
     - Confirm

4. **Verify:**
   - [ ] No active cron jobs listed
   - [ ] No upcoming scheduled runs shown

---

## 🔴 Step 4: Tighten Budget Controls

### Actions

1. **Go to Billing:**
   - Workspace → Settings → Billing
   - Or: [https://modal.com/settings/billing](https://modal.com/settings/billing)

2. **Set budget cap:**
   - Current plan: **Starter ($30/month credits)**
   - Action: Set **monthly spend limit to $1** (or minimum allowed)
   - This prevents accidental GPU spin-up from costing hundreds

3. **Enable low-threshold alerts:**
   - Set alert at: **$1 spent** (beyond included credits)
   - Notification method: Email + Slack (if available)
   - Recipients: Add your email (yan@vibelog.io or similar)

4. **Remove auto-increase permissions:**
   - Disable: "Automatically increase budget if exceeded"
   - Require manual approval for any overages

5. **Verify:**
   - [ ] Budget cap set to $1/month (or minimum)
   - [ ] Alert configured at $1 threshold
   - [ ] Auto-increase disabled

---

## 🔴 Step 5: Audit Current Usage

### Actions

1. **Check current billing period:**
   - Go to: Billing → Current Period
   - Period: Nov 4 - Dec 3, 2025 (example)

2. **Record current spend:**
   - Total spend: $**\_\_\_\_** (should be ~$151.90 as of Nov 18)
   - Breakdown by function:
     - `modal_tts.generate_speech`: $**\_\_\_\_**
     - Other: $**\_\_\_\_**

3. **Identify last usage:**
   - Go to: Logs or Usage
   - Find last call to `modal_tts.generate_speech`
   - Record timestamp: ******\_\_\_\_******

4. **Verify:**
   - [ ] Last usage timestamp recorded
   - [ ] Current spend documented (for comparison)

---

## 🟡 Step 6: Wait & Monitor (3-7 Days)

### Actions

1. **Set calendar reminder:**
   - Date: **November 25, 2025** (7 days from now)
   - Task: Check Modal.com billing dashboard

2. **Expected results:**
   - **Daily spend:** $0 (no additional usage)
   - **Total for period (Nov 4 - Dec 3):** Should stay at ~$151.90 (frozen)
   - **Next period (Dec 4 - Jan 3):** Should be $0 additional usage

3. **Alert triggers:**
   - If spend increases by >$1 in the next 7 days → investigate immediately
   - If alert fires → check logs for unexpected function calls

4. **Verify:**
   - [ ] Calendar reminder set
   - [ ] Alert email/Slack channel monitored

---

## 🟢 Step 7: Final Verification (After 7 Days)

### Actions (Nov 25, 2025)

1. **Check billing dashboard:**
   - Go to: [https://modal.com/settings/billing](https://modal.com/settings/billing)
   - Verify: **$0 additional usage** since Nov 18

2. **Check next billing cycle (Dec 4):**
   - Expected: **$0 usage** for entire Dec 4 - Jan 3 period
   - Only charge should be $30/month base subscription (if still subscribed)

3. **If zero spend confirmed:**
   - [ ] Mark this checklist as ✅ Complete
   - [ ] Update [INFRA_MODAL.md](INFRA_MODAL.md) with final verification date
   - [ ] Consider downgrading Modal.com plan to Free tier (if no other usage)

4. **If spend detected:**
   - [ ] Check logs for source of calls
   - [ ] Verify all apps/functions are disabled
   - [ ] Contact Modal.com support if unexpected billing

---

## 🚨 Rollback Plan (If Something Breaks)

### Emergency Re-Enable

If disabling Modal causes critical user-facing issues:

1. **Immediate triage:**
   - Check Sentry for new errors
   - Check support tickets for audio generation failures
   - Identify which feature broke

2. **Temporary fix:**
   - Re-enable `vibelog-tts` app in Modal.com
   - Restore endpoint URL to `.env.local`
   - Redeploy Next.js app with Modal env vars

3. **Root cause:**
   - Investigate why OpenAI TTS isn't working
   - Check [app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts) for errors

4. **Long-term fix:**
   - Fix OpenAI TTS implementation
   - Re-disable Modal once OpenAI is stable
   - Update [INFRA_MODAL.md](INFRA_MODAL.md) with incident notes

---

## 📊 Success Metrics

### Definition of Done

This lockdown is **successful** if:

1. **Cost reduction:**
   - Modal.com spend drops from ~$150/month to <$1/month
   - Verified over full billing cycle (Dec 4 - Jan 3)

2. **Zero regressions:**
   - No increase in TTS-related error rates (Sentry)
   - No user complaints about missing audio features
   - OpenAI TTS continues working normally

3. **Clean codebase:**
   - `git grep -i "modal_tts"` returns zero results (except docs)
   - No orphaned config or env vars remain

4. **Documented:**
   - [INFRA_MODAL.md](INFRA_MODAL.md) updated with final status
   - This checklist marked complete
   - Lessons learned added to team wiki/Notion

---

## 🔗 Related Resources

- **Main documentation:** [INFRA_MODAL.md](INFRA_MODAL.md)
- **OpenAI TTS implementation:** [app/api/vibelog/generate-ai-audio/route.ts](app/api/vibelog/generate-ai-audio/route.ts)
- **Modal.com dashboard:** [https://modal.com/apps](https://modal.com/apps)
- **Billing:** [https://modal.com/settings/billing](https://modal.com/settings/billing)

---

## ✅ Completion Sign-Off

**Checklist completed by:** **********\_\_**********
**Date:** **********\_\_**********
**Final spend verified:** ☐ Yes ☐ No
**Next review date:** December 15, 2025

**Notes:**

---

---

---

---

**Status:** Ready to execute
**Expected outcome:** $0 Modal.com spend by December 2025
**Owner:** Yan (@vibeyang)
