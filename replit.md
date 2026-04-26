# AMP KART — System Portal

A simple static HTML landing page for the AMP KART (Advanced Market Platform) system portal. Provides entry points to an Admin Panel and Vendor Panel.

## Project Structure

- `index.html` — Main landing/portal page
- `assets/css/global.css` — Global stylesheet (referenced but not yet present in the repo)
- `admin/index.html` — Admin Panel (referenced but not yet present in the repo)
- `vendor/login.html` — Vendor Panel login (referenced but not yet present in the repo)

> Only `index.html` is currently committed. The CSS file and sub-panel pages are referenced by `index.html` but have not been added to the repo yet.

## Development

A Python static file server runs on port `5000` and serves files from the project root.

- Workflow: `Start application`
- Command: `python3 -m http.server 5000 --bind 0.0.0.0`

## Deployment

Configured as a **static** deployment serving the project root (`.`).
