# Project Rules for AI Coding Assistants (Kallathaki.gr)

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

### 5. Advanced Hydration Mismatch Solutions
* **Rule**: For any interactive state or attributes that depend on browser-only APIs (like `window.location`, `localStorage`, or client-side layout adjustments), use a `mounted` lifecycle flag to delay client-side calculation until after initial hydration.
* **Reason**: Next.js pre-renders pages on the server. If the client’s first render differs from the server’s pre-rendered HTML, it causes React hydration warnings.
* **Inline Script Workaround**: To inject script files (e.g., preventing dark mode theme flash) inside `layout.tsx`, always use Next.js's `<Script>` component with `strategy="beforeInteractive"` and an explicit `id` rather than raw `<script>` tags, preventing browser extensions (like password managers) from disrupting the DOM structure.

### 6. Mobile Barcode Scanner Viewport Optimization
* **Rule**: Limit the scan detection region using a restricted viewport (`qrbox` bounding box matching viewfinder dimensions) and set camera acquisition rates to 20-25fps.
* **Reason**: Cropping the camera feed to a localized detection box prevents the QR engine from scanning the entire sensor frame, reducing CPU overhead by ~75% and speeding up scans.
* **Hardware Acceleration**: Always attempt to opt into the native browser `BarcodeDetector` API (where available in Chromium-based browsers/WebView) to leverage hardware-accelerated decoding before falling back to heavier JS/WASM engine decoders.
