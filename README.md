# The Power of AND

A static, client-side practice investment calculator for DCI Edge. It compares equipment investment, expansion timing, operating profit, and illustrative retirement value.

## Run locally

Open `index.html` in a browser. An internet connection is needed for Google Fonts and Chart.js.

## Deploy to Cloudflare Pages with GitHub

1. Put these files in the root of your GitHub repository.
2. Commit the changes in GitHub Desktop and click **Push origin**.
3. In Cloudflare, open **Workers & Pages** and choose **Create application**.
4. Choose **Pages** and **Connect to Git**.
5. Authorize GitHub and select the `power-of-and` repository.
6. Framework preset: **None**.
7. Build command: leave blank.
8. Build output directory: `/` or leave the default root option if Cloudflare presents one.
9. Click **Save and Deploy**.

## Files

- `index.html` — page structure and calculator fields
- `styles.css` — visual design and responsive/print styles
- `script.js` — calculations, charts, reset, and print behavior

## Important

This tool is illustrative and is not financial, tax, accounting, or legal advice. Review all defaults, claims, brand language, and calculations with DCI Edge marketing/legal/finance before public use.
