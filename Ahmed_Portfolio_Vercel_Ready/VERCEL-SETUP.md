# Ahmed Portfolio — Vercel setup

## Deploy
1. Push this project folder to a GitHub repository (the repository root must contain `index.html`, `api/`, and `vercel.json`).
2. In Vercel, choose **Add New → Project**, import the repository, and keep the framework preset as **Other**. No build command is required; the site is static HTML with Vercel Node.js Functions.
3. Add the environment variables below in **Project → Settings → Environment Variables**.
4. Redeploy after saving environment variables.

## Required for the live AI assistant
- `OPENAI_API_KEY`: create an API key in the OpenAI API platform and add it as a Vercel secret. Never put it in `index.html`, GitHub, or a `VITE_`/`NEXT_PUBLIC_` variable.
- `OPENAI_MODEL`: optional; defaults to `gpt-5.5`. Choose a model enabled for your API project if that default is unavailable.

The browser sends chat messages to `/api/chat`; the Vercel function calls the OpenAI Responses API using the server-side key.

## Optional lead notifications
For email notifications, configure a Resend account and verify a sending domain, then add:
- `RESEND_API_KEY`
- `LEADS_TO_EMAIL` (where inquiries should arrive)
- `LEADS_FROM_EMAIL` (a sender address on the verified domain)

For Telegram notifications, add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. At least one notification channel must be configured for automatic delivery. Until then, the chatbot still offers WhatsApp and email handoff links.

## Local preview
Use Vercel CLI (`vercel dev`) from the project root to test both the static site and `/api/*` functions locally. Add local secrets to `.env.local` (do not commit it).

## Notes
- The API functions include basic request validation and per-instance throttling. For a high-traffic public launch, add a persistent rate limiter/WAF and consider a CAPTCHA or Turnstile check.
- Review the project details and pricing in `api/chat.js` before launch to ensure they remain accurate.
