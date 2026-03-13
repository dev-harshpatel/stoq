# Auth Troubleshooting — "OTP Expired" on First Click & Resend Not Working

This guide addresses common auth issues:

1. **"Your verification link may have expired or is invalid"** — even when clicking the link for the first time
2. **"Confirmation email sent!"** — but the resent email never arrives
3. **Unconfirmed users can log in** — users appear in the DB and can sign in before verifying email

---

## Issue 3: Unconfirmed Users Can Log In (Security)

### Problem

Users who sign up but never click the verification link (or get "otp expired" when they do) can still log in. The user exists in the database with `email_confirmed_at = null`, but sign-in succeeds.

### Root Cause

Supabase's **"Confirm Email"** setting may be disabled. When disabled, `signInWithPassword` allows unconfirmed users.

### Fix

1. **Enable "Confirm Email" in Supabase** (recommended):
   - Supabase Dashboard → **Authentication** → **Providers** → **Email**
   - Enable **Confirm email**
   - Save

2. **Application-level enforcement** (already implemented): The app checks `email_confirmed_at` after sign-in. If the user is unconfirmed, they are signed out and shown a "Resend confirmation email" flow. This works even if Supabase's setting is disabled.

---

## Issue 1: OTP Expired on First Click

### Root Cause A: Supabase URL Configuration (Most Likely)

The **Site URL** and **Redirect URLs** in Supabase must exactly match where your app runs. If they don't, Supabase rejects the token and shows "otp expired" or "access denied."

#### Fix: Configure Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Open **Authentication** → **URL Configuration**
3. Set:

   | Setting | Production (b2bmobiles.ca) | Local (localhost) |
   |---------|---------------------------|-------------------|
   | **Site URL** | `https://b2bmobiles.ca` | `http://localhost:3000` |
   | **Redirect URLs** | Add all of these: | |
   | | `https://b2bmobiles.ca/**` | `http://localhost:3000/**` |
   | | `https://b2bmobiles.ca/auth/callback` | `http://localhost:3000/auth/callback` |

4. **Important:** If you test locally against the **production** Supabase project, you must add localhost URLs to the **same** project:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`

5. Save changes.

---

### Root Cause B: Email Template Using Wrong URL

If you use a **custom email template** in Supabase Dashboard (Auth → Email Templates), it must use the correct variables.

#### Correct template (use this)

```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
```

`{{ .ConfirmationURL }}` is built by Supabase and includes the correct `redirect_to` from your signup.

#### Incorrect (do NOT use)

```html
<!-- WRONG: Uses Site URL, ignores where user signed up from -->
<a href="{{ .SiteURL }}/auth/callback?token=...">Confirm</a>
```

If your template uses `{{ .SiteURL }}` to build the link instead of `{{ .ConfirmationURL }}`, the link will always point to the Site URL (e.g. `https://b2bmobiles.ca`) even when the user signed up from `localhost:3000`. That causes redirect mismatch and "otp expired."

**Action:** In Supabase Dashboard → Auth → Email Templates → **Confirm signup**, ensure the link uses `{{ .ConfirmationURL }}`.

---

### Root Cause C: PKCE Code Verifier Not Found

When the callback receives a `code` param (PKCE flow) instead of `token_hash`, the exchange fails with "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared."

**Why:** Supabase's default `{{ .ConfirmationURL }}` uses the PKCE flow. The code verifier is stored in cookies when signup runs. When the user clicks the email link (often from a different app or incognito), those cookies aren't available.

**Fix:** Use a custom link in the email template that goes directly to your callback with `token_hash` and `type`, bypassing PKCE:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">Confirm Email</a>
```

Update the **Confirm signup** template in Supabase Dashboard → Auth → Email Templates for both stoq-dev and stoq (prod). The repo templates in `supabase/email-templates/` have been updated as reference.

---

### Root Cause D: Email Prefetching (Security Scanners)

Many email providers (Gmail, Outlook, corporate security tools) **automatically open links** in emails to scan for threats. That "click" consumes the one-time token before the real user can use it.

**Symptoms:** User clicks the link for the first time but gets "otp expired."

**Mitigation options:**

1. **Use OTP code instead of link** — In the email template, show a 6-digit code (`{{ .Token }}`) and have users enter it on a page. See [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching).
2. **Two-step link** — Link goes to your page first; user clicks a button there to confirm. The actual confirmation URL is passed as a query param.
3. **Custom SMTP** — Some providers (e.g. Resend) may have better deliverability and fewer prefetch issues.

---

## Issue 2: Resend Email Not Arriving

When users click "Resend Confirmation Email" they see "Confirmation email sent!" but never receive the email.

### Root Cause

Supabase's **default email provider** is for demo only. It has very low limits (~2 emails/hour) and may only deliver to pre-authorized addresses.

### Fix

Configure **custom SMTP** in Supabase:

1. Supabase Dashboard → **Authentication** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Use a provider like Resend, Gmail (App Password), SendGrid, etc.

See [SUPABASE_EMAIL_SETUP.md](./SUPABASE_EMAIL_SETUP.md) for step-by-step SMTP setup.

---

## Quick Checklist

- [ ] **Site URL** in Supabase matches your app (e.g. `https://b2bmobiles.ca` for prod)
- [ ] **Redirect URLs** include `https://b2bmobiles.ca/**`, `https://b2bmobiles.ca/auth/callback`
- [ ] For local testing: `http://localhost:3000/**`, `http://localhost:3000/auth/callback` are in Redirect URLs
- [ ] Email template uses `{{ .ConfirmationURL }}` (not `{{ .SiteURL }}` for the link)
- [ ] Custom SMTP configured (Resend, Gmail, etc.) for production
- [ ] **Confirm email** enabled in Supabase → Auth → Providers → Email (blocks unconfirmed users at the provider level)

---

## References

- [Supabase: OTP Verification Failures](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase: Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SUPABASE_EMAIL_SETUP.md](./SUPABASE_EMAIL_SETUP.md) — SMTP configuration
