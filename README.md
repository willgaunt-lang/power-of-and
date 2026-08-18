# The Power of AND — v0.6

A DCI Edge browser-based sales tool with two calculators:

1. **More Rooms** (`index.html`) — compares DCI Edge and an alternative equipment scenario, including room count, operating profit during a catch-up delay and potential retirement wealth impact.
2. **The Unbooked Operatory** (`unbooked.html`) — models the economics of activating an existing unused treatment room, with break-even visits per week, financing cash flow, five-year net cash and a long-term wealth illustration.

## Files

- `index.html` — More Rooms calculator
- `script.js` — More Rooms calculations and charts
- `unbooked.html` — Unbooked Operatory calculator
- `unbooked.js` — Unbooked Operatory calculations and charts
- `styles.css` — shared DCI Edge-branded responsive styles

## Unbooked Operatory model

The model focuses on **incremental economics** for an existing physical room.

- Annual production = additional visits/week × average production/visit × working weeks/year.
- Variable clinical costs are deducted from that production.
- Optional incremental staffing cost is deducted.
- Financing uses standard amortizing-loan math based on the entered down payment, APR and term.
- Break-even visits/week are the visits required to cover scheduled equipment payments plus entered incremental staffing cost.
- Five-year net cash includes the initial down payment and monthly equipment payments.
- The retirement illustration compounds monthly net room cash flow and subtracts the future opportunity cost of the down payment.

Taxes, collection differences, financing fees, replacement costs and changes in utilization are not modeled. Any tax effects should be reviewed with a qualified tax professional.

## Deployment

This is a static site. Commit and push the files to the GitHub repository connected to Cloudflare. Cloudflare will automatically redeploy the latest `main` branch.


### v0.6.3
- Replaced the sticky header with a true fixed header for reliable behavior across browsers.
- Added automatic responsive header-height spacing so page content is never covered by the pinned header.


## v0.6.4
- Desktop keeps the full fixed header.
- Mobile fixes only the DCI logo bar; calculator navigation and action buttons scroll normally.
- Official DCI logo links to dciedge.com in a new tab.
