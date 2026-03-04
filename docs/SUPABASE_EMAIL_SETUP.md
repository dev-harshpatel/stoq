# Supabase Email Setup — Fix "Confirmation email sent!" but no email received

## Problem

When users click "Resend Confirmation Email" on the auth error page, they see "Confirmation email sent!" but never receive the email.

## Root cause

Supabase's **built-in email provider is for demonstration only** and has very low rate limits (around 2 emails per hour). It may also only deliver to pre-authorized addresses. For production, you must configure a custom SMTP provider.

## Solution: Configure custom SMTP in Supabase

### 1. Open Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **production** project (the one used by b2bmobiles.ca)

### 2. Configure SMTP

1. Go to **Authentication** → **Email Templates** (or **Providers**)
2. Scroll to **SMTP Settings** (or **Custom SMTP**)
3. Enable **Custom SMTP**
4. Fill in your provider's details

### 3. Recommended providers

#### Option A: Resend (simplest)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (e.g. `b2bmobiles.ca`) or use Resend's test domain
3. Create an API key
4. In Supabase:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** Your Resend API key
   - **Sender email:** Must match your verified domain (e.g. `noreply@b2bmobiles.ca`)
   - **Sender name:** e.g. `b2bMobiles`

#### Option B: Gmail (for testing)

1. Use a Gmail account
2. Create an [App Password](https://myaccount.google.com/apppasswords) (not your normal password)
3. In Supabase:
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** Your full Gmail address
   - **Password:** The App Password
   - **Sender email:** Same as username (must match)

#### Option C: SendGrid, AWS SES, Brevo, Postmark

Use your provider's SMTP credentials. Ensure the sender email/domain is verified.

### 4. Redirect URLs

Ensure your production URL is allowed:

1. Go to **Authentication** → **URL Configuration**
2. **Site URL:** `https://b2bmobiles.ca`
3. **Redirect URLs:** Add `https://b2bmobiles.ca/**` and `https://b2bmobiles.ca/auth/callback`

### 5. Test

1. Save SMTP settings in Supabase
2. Go to your app → Login → "Forgot password?" or sign up
3. Request a confirmation/reset email
4. Check inbox and spam folder

### 6. Check Auth logs if still failing

1. Supabase Dashboard → **Logs** → **Auth Logs**
2. Look for handover/SMTP errors
3. Check your email provider's logs (Resend, SendGrid, etc.) for delivery status

## References

- [Supabase: Not receiving Auth emails](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend + Supabase](https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase)
