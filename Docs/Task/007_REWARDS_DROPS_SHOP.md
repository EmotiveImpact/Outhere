# docs/TASKS/007_REWARDS_DROPS_SHOP.md
## Task 007 - Drops + Rewards Catalogue + OUT Redemption

### Goal
Add Drops and Rewards system. OUT can be redeemed for discount codes and perks.

### Requirements
1. Drops
   - Model: id, title, description, window_start, window_end, hero_image_url, status
   - Arena shows active drop card with countdown
   - Pro early access: 24h
   - Black early access: 48h
2. Rewards Catalogue
   - Model: id, title, type ("shop_discount" | "event_discount" | "sponsor_code"), cost_out, inventory
   - Endpoint: GET `/api/rewards/catalogue`
3. Redemption
   - Endpoint: POST `/api/rewards/redeem` returns a code or voucher object
   - Redemption creates OUT transaction (negative amount) and redemption record
4. Frontend
   - Profile > Wallet shows OUT balance and redemption history
   - Arena > Drops card links to Drop detail
   - Arena > Rewards module shows items, gated: Pro+ required to redeem

### Constraints
- Do not build a full commerce checkout yet.
- Codes can be simple strings in MVP.

### Output Required
- git diff patch only.

### Acceptance Criteria
- Drops display in Arena.
- Rewards catalogue loads.
- OUT redemption reduces OUT balance and returns a code.