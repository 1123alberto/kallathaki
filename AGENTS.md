# Project Rules for AI Coding Assistants (MySuper.gr)

If you are an AI agent working on this codebase, please adhere to the following architectural constraints to prevent regressions and compile errors:

### 1. API Proxy for Gov Data (CORS bypass)
* **Rule**: All requests to `api.posokanei.gov.gr` **must** be routed through the local Next.js API route handler: `/api/[...path]`.
* **Reason**: Browser-side requests directly to the government API will fail due to strict CORS policies. The proxy handler in `src/app/api/[...path]/route.ts` correctly appends the spoofed `Origin` and `Referer` headers required by the gov server.

### 2. Tailwind CSS v4 Configuration
* **Rule**: Do **not** create a `tailwind.config.js` or `tailwind.config.ts`.
* **Reason**: This project uses **Tailwind CSS v4**, which operates on a CSS-first configuration. 
* All custom design tokens (colors, variants, custom animations) are declared inside `src/app/globals.css` under the `@theme` directive.
* Manual dark mode toggling is handled via `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`. Do not change this structure.

### 3. Greek Supermarket IDs
* **Rule**: Do not add or rename retailer IDs without updating both the allowed retailer array and the metadata mapping.
* **Supported Retailers**: `lidl`, `masoutis`, `ab_vasilopoulos`, `mymarket`, `sklavenitis`, `kritikos`.
* **Logo CDN**: Retailer logos are resolved using `https://api.posokanei.gov.gr/images/retailer/{retailerId}`.

### 4. Simplified Maps Integration
* **Rule**: Do not add mapping libraries (such as Leaflet or React-Leaflet) to keep the project bundle lightweight.
* **Reason**: Closest branches and navigation routes are resolved via a key-less Google Maps iframe embed query (`https://maps.google.com/maps?q=...&output=embed`) using Geolocation coordinates.
