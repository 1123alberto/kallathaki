# Home Server Gov Proxy Runbook

## Purpose

This documents the work done to restore live government API syncing for `kallathaki.gr` when the direct upstream `products/search` endpoint was unstable and the Papaki-hosted proxy path was not usable.

## Problem Summary

- The Next.js app on Vercel serves API requests through `src/app/api/[...path]/route.ts`.
- In production, `GOV_API_URL` was unset, so Vercel defaulted to `https://api.posokanei.gov.gr`.
- On `2026-06-28`, direct live checks showed:
  - `GET /meta/stats` worked
  - `POST /products/search` failed upstream or forced the app into fallback behavior
- Production responses confirmed fallback use:
  - `x-kallathaki-data-source: static-fallback`
  - snapshot freshness stuck on `2026-06-27`

## Domain / Hosting Findings

- `https://kallathaki.gr` is served by Vercel.
- `https://www.kallathaki.gr` redirects to `https://kallathaki.gr`.
- `www` was not the correct upstream proxy target.
- DNS screenshots showed:
  - `kallathaki.gr -> 216.198.79.1`
  - `www.kallathaki.gr -> 185.138.42.2`
  - `api-proxy.kallathaki.gr -> 185.138.42.2`
- `https://www.kallathaki.gr/meta/stats` returned `403`.
- `https://api-proxy.kallathaki.gr/meta/stats` failed TLS certificate validation.

Conclusion:

- Papaki was not providing a valid usable HTTPS gov proxy endpoint.

## Chosen Solution

Use the always-on home server as the upstream gov proxy and expose it publicly with Tailscale Funnel.

Architecture:

- Frontend/app stays on Vercel at `https://kallathaki.gr`
- Next.js `/api/[...path]` still handles browser-side requests
- Vercel server-side proxy now calls:
  - `GOV_API_URL=https://pi-plex-server.tail4c3661.ts.net`
- The home server forwards those requests to:
  - `https://api.posokanei.gov.gr`

## Home Server Details

- SSH access used:

```bash
ssh pi@100.91.230.5
```

- Tailscale DNS name:

```text
pi-plex-server.tail4c3661.ts.net
```

## Safe Funnel Validation Process

Before exposing a real proxy, a harmless test server was used.

1. Create a safe temporary directory.
2. Serve it locally with Python.
3. Enable Funnel.
4. Verify public HTTPS worked.

The important correction during testing was to avoid exposing the home directory by accident.

## Proxy Implementation

A minimal Python reverse proxy was created to:

- forward `GET` and `POST`
- preserve request bodies
- attach required gov headers:
  - `Origin: https://posokanei.gov.gr`
  - `Referer: https://posokanei.gov.gr/`
  - browser-like `User-Agent`
  - `Accept-Language: el-GR,el;q=0.9,en;q=0.8`
- support image requests and JSON requests

Persistent script location on the Pi:

```text
/home/pi/gov_proxy.py
```

## systemd Service

The proxy was made persistent with a systemd unit.

Service file:

```text
/etc/systemd/system/kallathaki-gov-proxy.service
```

Service name:

```text
kallathaki-gov-proxy
```

Useful commands:

```bash
sudo systemctl status kallathaki-gov-proxy
sudo systemctl restart kallathaki-gov-proxy
sudo journalctl -u kallathaki-gov-proxy -n 100 --no-pager
```

## Tailscale Funnel

Funnel was enabled for the node and then configured in background mode.

Useful commands:

```bash
sudo tailscale funnel --bg 8081
sudo tailscale funnel status
sudo tailscale funnel reset
```

Working public upstream endpoint:

```text
https://pi-plex-server.tail4c3661.ts.net
```

Verified working:

```bash
curl -i https://pi-plex-server.tail4c3661.ts.net/meta/stats
curl -i -H 'Content-Type: application/json' -X POST https://pi-plex-server.tail4c3661.ts.net/products/search --data '{"page":1,"page_size":2,"title":"γαλα"}'
```

## Vercel Configuration

Environment variable to use in Production:

```text
GOV_API_URL=https://pi-plex-server.tail4c3661.ts.net
```

After setting the env var:

1. Save it for Production.
2. Redeploy Production.

## App Code Changes Made

### 1. Proxy fallback hardening

Updated `src/app/api/[...path]/route.ts` to:

- add fallback support for:
  - `GET /products/:id`
  - `GET /products/barcode/:barcode`
- use tighter image proxy fetch behavior

### 2. Local image placeholder behavior

Updated UI to use a local inline placeholder instead of external Unsplash fallbacks:

- `src/lib/gov-assets.ts`
- `src/app/page.tsx`
- `src/components/FavoritesView.tsx`

### 3. Stats freshness fix

Updated `src/app/api/[...path]/route.ts` to separate:

- fallback freshness behavior
- upstream freshness behavior

Intent:

- fallback stats should keep snapshot freshness
- live upstream stats should use live upstream timestamps

## Production Verification Commands

### Current data source checks

```bash
curl -i https://kallathaki.gr/api/meta/stats
curl -i -H 'Content-Type: application/json' -X POST https://kallathaki.gr/api/products/search --data '{"page":1,"page_size":2,"title":"γαλα"}'
```

### Cache-bypass stats check

```bash
curl -i \
  -H 'cache-control: no-cache' \
  -H 'x-kallathaki-refresh: 1' \
  'https://kallathaki.gr/api/meta/stats?_refresh=1'
```

## Status Reached

Successfully confirmed:

- production `products/search` is using `x-kallathaki-data-source: upstream`
- home-server proxy is working over public HTTPS through Tailscale Funnel
- proxy process is persistent with systemd

Remaining point observed:

- at one stage, production `meta/stats` still showed old fallback `catalog_updated_at` fields even while the response source was `upstream`
- this indicated the latest freshness patch had not yet reached the active production deployment

If seen again, verify:

1. latest code was actually deployed to Vercel
2. production was redeployed from the newest commit/build
3. cache-bypass stats test reflects the new logic

## Power Outage Behavior

If home power goes down:

- the Pi shuts off
- Funnel becomes unavailable
- Vercel cannot reach `GOV_API_URL`
- the app falls back to static snapshot / stale cache behavior

After power returns:

- the Pi boots
- `tailscaled` starts
- `kallathaki-gov-proxy` starts automatically via systemd
- Funnel background config should resume
- Vercel can resume live upstream requests

## Recommended Future Improvements

1. Replace the temporary `ts.net` upstream hostname with a cleaner permanent domain such as `api-proxy.kallathaki.gr` once valid HTTPS is in place.
2. Add monitoring for:
   - Pi availability
   - Funnel availability
   - upstream proxy health
3. Consider a UPS for the Pi/router if stale-data periods during power cuts matter.
4. Keep the app fallback snapshot logic intact as a resilience layer.



• Steady-State Checklist

  - Vercel GOV_API_URL should stay:
    https://pi-plex-server.tail4c3661.ts.net

  - Pi service should be running:
    sudo systemctl status kallathaki-gov-proxy

  - Funnel should be active:
    sudo tailscale funnel status

  Quick health checks

  curl -i https://pi-plex-server.tail4c3661.ts.net/meta/stats

  curl -i \
    -H 'Content-Type: application/json' \
    -X POST https://pi-plex-server.tail4c3661.ts.net/products/search \
    --data '{"page":1,"page_size":2,"title":"γαλα"}'

  curl -i \
    -H 'cache-control: no-cache' \
    -H 'x-kallathaki-refresh: 1' \
    'https://kallathaki.gr/api/meta/stats?_refresh=1'

  If power/internet goes down at home

  - Vercel falls back to snapshot/stale cache
  - when the Pi returns, live sync resumes automatically if:
      - tailscaled starts
      - kallathaki-gov-proxy starts
      - Funnel config persists

  Useful recovery commands on the Pi

  sudo systemctl restart kallathaki-gov-proxy
  sudo journalctl -u kallathaki-gov-proxy -n 100 --no-pager
  sudo tailscale funnel status
  sudo tailscale funnel reset
  sudo tailscale funnel --bg 8081
