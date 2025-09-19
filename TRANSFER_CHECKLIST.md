# Transfer Checklist

Use this checklist to hand over the project cleanly after sale.

## Code & Assets
- [ ] Grant buyer access to the private repo (or transfer ownership)
- [ ] Export and transfer design assets (logos, icons, splash)
- [ ] Confirm license (MIT) and single‑owner IP representation

## Infrastructure
- [ ] Create buyer Railway project (or share Nixpacks/Docker config)
- [ ] Provision Postgres; set `DATABASE_URL`
- [ ] Configure env vars from `.env.example`
- [ ] Configure Stripe keys + webhook (guide: `STRIPE_WEBHOOK_SETUP.md`)
- [ ] Configure Mapbox token

## Data & Demo
- [ ] Run migrations (`npm run db:push`)
- [ ] Seed demo content (`npm run seed` or `seed:all`)
- [ ] Verify core flows (trip, activities, template purchase)

## Domains & Branding (if included)
- [ ] Transfer domain(s) and DNS access
- [ ] Update brand name across README/LICENSE/assets

## Handover Support
- [ ] Provide 1–2 onboarding calls or async Q&A
- [ ] Share demo video and screenshots
- [ ] Share any API/affiliate IDs and setup screenshots (if applicable)

## Closing
- [ ] Execute asset purchase agreement
- [ ] Release payment via escrow
- [ ] Revoke old access after transfer completes

