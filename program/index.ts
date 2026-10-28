import * as pulumi from "@pulumi/pulumi";
import {
  CLOUDFLARE_ISSUING_CAS,
  ProjectEmail,
  WafScannerBlock,
  WebAnalytics,
  WwwRedirect,
  ZoneSecurity,
  caaRecords,
} from "@parra/cloudflare-pulumi";

/**
 * open-assets.dev was bought on 2026-10-28 and its zone created by the
 * registrar purchase, so the zone is an INPUT read from config, not a
 * `cloudflare.Zone` this program owns. It had no DNS records and default
 * settings when this was written.
 *
 * Hostnames are not declared here. Each is a Worker Custom Domain in its
 * wrangler.jsonc, which creates the DNS record and certificate on deploy:
 *
 *   open-assets.dev, www.open-assets.dev   apps/web   open-assets-web-production
 *   docs.open-assets.dev                   apps/docs  open-assets-docs-production
 */

const cfg = new pulumi.Config();
const zoneId = cfg.require("zoneId");
const accountId = cfg.require("accountId");

const domain = "open-assets.dev";

// www is a Custom Domain on the web Worker; this 301s it to the apex at the
// zone so crawlers never see two hostnames serving the same page.
new WwwRedirect({ zoneId, domain });

// Scanner probes, freeloader crawlers and forged user agents die at the edge.
new WafScannerBlock(domain, { zoneId });

// TLS 1.2 minimum, HTTPS, HSTS: the fleet zone baseline. The zone was on the
// defaults (TLS 1.0, HTTPS not forced) before this.
new ZoneSecurity({ zoneId, domain });

// Privacy-friendly page views for both sites; the sites ship no GA4.
new WebAnalytics(domain, { accountId, zoneId });

// Only Cloudflare's issuers: every hostname's certificate is Cloudflare-managed.
caaRecords({ zoneId, domain, issuers: [...CLOUDFLARE_ISSUING_CAS] });

// The fleet owner mailbox: ian@, hello@, help@, support@, info@, contact@,
// admin@ and mick@ forwarded with Email Routing. sending: false because
// neither site sends mail, so no DKIM/DMARC sending records are published.
new ProjectEmail(domain, { zoneId, domain, sending: false });

export const zoneIdOut = zoneId;
