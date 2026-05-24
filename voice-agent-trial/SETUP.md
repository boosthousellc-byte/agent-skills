# Voice Agent Trial — Setup Guide

## What This Does

A self-serve demo system for roofing contractors. A prospect enters their website URL and within ~30 seconds gets:

1. A **demo page** showing their own website with an animated AI chatbot overlay
2. A **real phone number** they can call to experience the AI agent live
3. The agent **qualifies storm damage leads** (damage type, insurance vs. owner-pay) and **books inspections** via Calendly
4. **SMS confirmations** fire to both the business owner and the caller when a call ends

---

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- A **Vapi.ai** account with:
  - API key
  - One purchased phone number (shared across all demos)
- A **Firebase project** (Blaze/pay-as-you-go plan for Cloud Functions)

---

## Quick Start

### 1. Install dependencies

```bash
cd voice-agent-trial/functions
npm install
```

### 2. Configure environment variables

```bash
cd voice-agent-trial

firebase functions:config:set \
  vapi.api_key="YOUR_VAPI_API_KEY" \
  vapi.phone_number_id="YOUR_VAPI_PHONE_NUMBER_ID" \
  vapi.demo_owner_phone="+15550000000" \
  calendly.default_url="https://calendly.com/your-name/inspection"
```

### 3. Set your Firebase project

Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your actual project ID, or run:

```bash
firebase use --add
```

### 4. Deploy

```bash
firebase deploy
```

Your app is live at `https://YOUR_PROJECT_ID.web.app`

---

## Local Development

```bash
# In functions/
npm install

# From project root
firebase emulators:start
```

Then visit `http://localhost:5000`.

**Note**: Update `API_BASE` in `public/js/landing.js` and `public/js/demo-widget.js` — replace `YOUR_PROJECT_ID` with your actual Firebase project ID for local emulator testing.

---

## Vapi.ai Setup

1. Sign up at [vapi.ai](https://vapi.ai)
2. Buy a phone number (Dashboard → Phone Numbers → Buy Number)
3. Copy the number's ID (not the phone number itself) — this is `VAPI_PHONE_NUMBER_ID`
4. Copy your API key from Dashboard → API Keys

The system creates a new Vapi assistant for each demo and assigns it to your shared phone number. Only one demo's assistant is active on the number at a time — callers always reach the most recently created assistant.

For production, provision one number per active demo to avoid conflicts.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `demos/{demoId}` | Created per URL submission. Holds companyName, websiteUrl, assistantId, phone, etc. |
| `leads/{leadId}` | Created per completed call. Holds transcript, extracted lead data, booking info. |

**Firestore Security Rules** (apply in Firebase console):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /demos/{id} {
      allow read: if true;
      allow write: if false;
    }
    match /leads/{id} {
      allow read, write: if false;
    }
  }
}
```

---

## How the Demo Phone Number Works

All demos share one Vapi phone number. When `createDemo` runs, it:
1. Creates a new Vapi assistant trained on the scraped company data
2. Assigns that assistant to your phone number (overwriting the previous assignment)

This means only the **most recently generated demo** is live on the phone. For a sales demo flow where you generate a demo right before a call, this is perfect.

For a high-volume self-serve flow, you can buy additional Vapi numbers and implement a round-robin assignment strategy in `functions/index.js`.

---

## Calendly Integration

- If the prospect provides a Calendly URL in the form, that's used in the agent's SMS
- Otherwise, `CALENDLY_DEFAULT_URL` is used as a fallback
- The agent sends the booking link via SMS at the end of the qualification flow
- No Calendly API key is required — we use a direct scheduling link with URL params pre-filled

---

## Customizing the Agent

Edit the system prompt template in `functions/vapiClient.js` → `createAssistant()`.

Key variables available in the template:
- `companyName` — scraped from their website
- `serviceArea` — scraped city/state
- `services` — scraped service list
- `tagline` — scraped meta description or hero text
- `calendlyUrl` — from form or env var

---

## Iframe Fallback

~40% of contractor websites block iframes via `X-Frame-Options`. When this happens:
- The demo page hides the iframe
- Shows a screenshot via ScreenshotAPI (configured in `demo-widget.js` → `showFallback()`)
- The agent CTA and chatbot overlay still work normally

To use a paid screenshot API for better reliability, replace the URL in `showFallback()` in `public/js/demo-widget.js`.
