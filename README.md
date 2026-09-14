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

## Validation

```bash
npm run lint
npm run build
```

## Business direction

Read [BUSINESS-MODEL.md](BUSINESS-MODEL.md) for the product positioning, customer groups, revenue model, content pillars and recommended build order.

## Recommended next build slice

Build the event details and ticket selection flow for one real event before connecting Flutterwave. The goal is to prove the customer journey and create the order structure that payment, QR tickets, payouts and refunds will later use.
