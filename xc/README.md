# Resource Hub

A static resource collection site — clean, fast, bilingual, and easy to manage.

## Features

- **Bilingual** — instant Chinese/English toggle with full content translation
- **Static** — pure HTML/CSS/JS, deploys to GitHub Pages for free
- **Admin panel** — Decap CMS at `/admin/` for visual content management
- **Dark/light** — auto-detects preference, toggleable
- **Search** — type in the search bar or hit `Cmd/Ctrl+K`, filters instantly
- **Category tabs** — filter by tool, library, article, video, course
- **Auto-deploy** — GitHub Actions rebuilds on every content change
- **No frameworks** — zero build step, zero dependencies at runtime
- **Not AI-looking** — editorial typography, warm palette, list layout. No cards, no glass, no purple gradients.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/resource-site.git
cd resource-site

# Fill resources/ with .json files (see format below)
node scripts/build-data.js

# Open index.html — done.
```

## Adding Resources

Create a `.json` file in `resources/`:

```json
{
  "title_en": "Tailwind CSS",
  "desc_en":  "A utility-first CSS framework…",
  "title_zh": "Tailwind CSS",
  "desc_zh":  "原子化 CSS 框架，直接在 HTML 中构建自定义设计。",
  "url":      "https://tailwindcss.com",
  "category": "tools",
  "icon":     "🎨",
  "tags":     ["css", "frontend", "design"],
  "featured": false
}
```

- `title_en` / `desc_en`: shown when the site is in English
- `title_zh` / `desc_zh`: shown when in Chinese
- Omit either language to fall back to the other

### Categories

`tools` · `library` · `article` · `video` · `course` · `other`

## GitHub Pages Deployment

1. Push this repo to GitHub
2. Settings → Pages → Source → **GitHub Actions**
3. Done. Site at `https://YOUR_USERNAME.github.io/resource-site/`

## Admin Panel

Visit `/admin/` after setting up GitHub OAuth:

1. GitHub → Developer settings → OAuth Apps → New
2. Homepage: `https://YOUR_USERNAME.github.io/resource-site`
3. Callback: `https://api.decapcms.org/auth/github/callback`
4. Deploy an OAuth gateway (Netlify / Vercel / Cloudflare Worker)

For local dev, change `admin/config.yml` to:

```yaml
backend:
  name: test-repo
```

## Project Structure

```
resource-site/
├── index.html                 # Main page
├── admin/
│   ├── index.html             # Decap CMS mount
│   └── config.yml             # CMS schema (bilingual fields)
├── assets/
│   ├── css/style.css          # Complete design system
│   └── js/
│       ├── data.js            # Auto-generated from resources/*.json
│       ├── i18n.js            # Chinese/English translation data
│       └── main.js            # Search, filters, theme, language toggle
├── resources/                 # CMS-managed bilingual JSON files
├── scripts/build-data.js      # JSON → data.js compiler
└── .github/workflows/pages.yml
```

## License

MIT