import * as path from "path";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import {
  CLOUDFLARE_ISSUING_CAS,
  ManagedZone,
  ProjectEmail,
  ZoneBaseline,
  caaRecords,
  nextApiRoutePrefixes,
} from "@parra/cloudflare-pulumi";

/**
 * open-assets.dev was bought on 2026-10-28 and its zone created by the
 * registrar purchase. It is now a ManagedZone (the fleet standard), adopted
 * with the `import` option below so nothing is recreated.
 *
 * Hostnames are not declared here. Each is a Worker Custom Domain in its
 * wrangler.jsonc, which creates the DNS record and certificate on deploy:
 *
 *   open-assets.dev, www.open-assets.dev   apps/web   open-assets-web-production
 *   docs.open-assets.dev                   apps/docs  open-assets-docs-production
 */

const cfg = new pulumi.Config();
const accountId = cfg.require("accountId");

const domain = "open-assets.dev";

// The registrar-created zone, adopted by id. The `import` option can be
// removed after the first `pulumi up` records it in state. ManagedZone also
// declares the WwwRedirect (www is a Custom Domain on the web Worker; the
// redirect 301s it to the apex) with the same URN the hand-written
// `new WwwRedirect(...)` had, so that ruleset is unchanged.
const zone = new ManagedZone(
  { accountId, domain },
  { import: "fd9ba4047c901f093cd974d3268c4f30" },
);
const zoneId = zone.id;

// /api prefixes the two Next apps really serve, read from their route trees.
// Both are static exports, so the list is tiny: apps/web has no /api routes
// at all and apps/docs serves only /api/search (the prerendered Fumadocs
// search index its client fetches). Every other /api path is a scanner probe.
const apiRoutes = nextApiRoutePrefixes([
  path.join(__dirname, "../apps/web/app"),
  path.join(__dirname, "../apps/docs/app"),
]);

// The fleet edge baseline. Every child aliases the stack-root URN it had when
// declared on its own, so this is an adoption, not a recreate:
// - ZoneSecurity: TLS 1.2 minimum, HTTPS, HSTS.
// - WafScannerBlock: scanner probes, freeloader crawlers, forged user agents
//   and /api paths no app serves die at the edge.
// - WebAnalytics: privacy-friendly page views; the sites ship no GA4.
// - AgentDiscovery: DNS-AID (SVCB at _index._agents) plus DNSSEC. No mcpHost,
//   there is no MCP server.
new ZoneBaseline(domain, {
  accountId,
  zoneId,
  domain,
  scannerBlock: {
    knownApiPrefixes: apiRoutes,
    apiHosts: [domain, `www.${domain}`, `docs.${domain}`],
  },
  skip: {
    wwwRedirect: "declared by ManagedZone",
    rateLimit:
      "both sites are static exports with no forms and no API beyond the prerendered search index",
  },
});

// Only Cloudflare's issuers: every hostname's certificate is Cloudflare-managed.
caaRecords({ zoneId, domain, issuers: [...CLOUDFLARE_ISSUING_CAS] });

// The fleet owner mailbox: ian@, hello@, help@, support@, info@, contact@,
// admin@ and mick@ forwarded with Email Routing. sending: false because
// neither site sends mail. DMARC is the library default, p=reject: nothing
// legitimate sends as open-assets.dev, so all spoofed mail is rejected.
new ProjectEmail(domain, { zoneId, domain, sending: false });

// Search Console ownership TXT, added by hand in the dashboard on 2026-10-28
// and adopted here so code owns it. Values match the live record exactly
// (quoted content as the API stores it, ttl 3600, no comment) so the import
// is a no-op; the fleet pattern uses ttl 1 plus a comment, but changing either
// would be a live edit, not an adoption. The `import` option can be removed
// after the first `pulumi up` records it in state. Preview shows the import
// followed by an "update" adding content/allowOverwrite: the v5 provider's
// import read leaves those inputs out of the preview state, and the content
// is byte-identical to live, so the update writes the same value back.
new cloudflare.Record(
  `${domain}-google-site-verification`,
  {
    zoneId,
    name: domain,
    type: "TXT",
    content:
      '"google-site-verification=z6Xdp09-fomW8vSMGdgYfjE6hUlBP4VjwRGKnaSnJNk"',
    ttl: 3600,
  },
  { import: "fd9ba4047c901f093cd974d3268c4f30/991421374f0586fe309d217293171cf2" },
);

export const zoneIdOut = zoneId;
