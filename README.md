# Elora

Elora is an event commerce platform for organizers who want more than a payment link. It brings event discovery, ticketing, merch, customer orders, payouts and refunds toward one operating system.

## Current app

This repository contains the Next.js frontend prototype for the attendee-facing discovery experience:

- Event discovery and search
- Category filtering
- Event cards
- Ticket and merch combined-order concept
- Responsive Elora visual system

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the Vercel deployment, use `https://elora-events-agency-yg-impulses-projects.vercel.app` as `NEXT_PUBLIC_SITE_URL` and configure the Flutterwave webhook at:

```text
https://elora-events-agency-yg-impulses-projects.vercel.app/api/payments/flutterwave/webhook
```

## Validation

```bash
npm run lint
npm run build
```

## Supabase setup

The first database integration is prepared in `supabase/schema.sql`.

1. Open the Elora Supabase project: `ygxgmmbcmcugoluvytzk`.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run the contents of `supabase/schema.sql`.
4. In **Project Settings > API**, copy the project URL and publishable key.
5. Copy `.env.example` to `.env.local` and set those two values.
6. Restart `npm run dev`.

The schema currently covers profiles, organizers, events, ticket types, orders, tickets and venue scans. Keep the service-role key out of `.env.local` for now; it must never be exposed to browser code.

Payment settlement requires these server-only values in `.env.local`: `SUPABASE_SERVICE_ROLE_KEY`, `FLUTTERWAVE_SECRET_KEY`, and `FLUTTERWAVE_SECRET_HASH`. Optional ticket email delivery uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Configure the Flutterwave webhook URL as `/api/payments/flutterwave/webhook` on your deployed domain.

## Vercel environment setup

Vercel does not automatically upload `.env.local`. In the Vercel project, open **Settings > Environment Variables** and import or add these variables for **Production**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_SECRET_HASH
NEXT_PUBLIC_SITE_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Before using payment credentials, rotate any secret that has been exposed in chat or committed files. For email delivery, create a Resend account, verify your sending domain, create an API key, and add `RESEND_API_KEY` plus a sender such as `tickets@your-domain.com` to Vercel Production variables. A placeholder sender will not deliver production mail. Email failure does not invalidate a verified payment; the ticket remains issued and the payment response reports that email delivery is unavailable.

After changing the signup trigger or schema, rerun the complete `supabase/schema.sql` file in SQL Editor. It is safe to rerun. New organizer accounts can then be created at `/organizers/sign-in`, and their protected dashboard is available at `/organizers/dashboard`.

## Business direction

Read [BUSINESS-MODEL.md](BUSINESS-MODEL.md) for the product positioning, customer groups, revenue model, content pillars and recommended build order.

## Recommended next build slice

Build the event details and ticket selection flow for one real event before connecting Flutterwave. The goal is to prove the customer journey and create the order structure that payment, QR tickets, payouts and refunds will later use.
