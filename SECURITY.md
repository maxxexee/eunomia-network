# Security policy

Eunomia Network is a prototype. It is not audited and is not ready for production funds or customer data.

## Supported versions

Only the `main` branch is supported. There are no maintained release branches.

## Reporting a vulnerability

Use GitHub private vulnerability reporting:

https://github.com/maxxexee/eunomia/security/advisories/new

Do not open a public issue for a security problem. Do not include private keys, vault keys, service role keys, or customer data in a report. Use a minimal reproduction and redact sensitive values.

## Scope

In scope:

- The browser wallet provisioning and encryption in `js/auth.js` and `js/wallet.js`
- The Supabase edge function in `supabase/functions/faucet-claim`
- The ENS registration flow in `js/ens.js`
- Secrets exposure in the repository, the static bundle, or the edge function environment
- Cross-site scripting through report content or wallet input

Out of scope:

- Netlify, Supabase, or Sepolia testnet outages
- The sample data in the hunter, DAO, and dispute workspaces, which is not a running backend
- Known limitations already listed in the README
- Reports that require a compromised host, browser, or Supabase account

## Response

This is a small project. Reports are handled on a best effort basis. There is no service level agreement.

If the report is valid, the fix and disclosure timing will be coordinated with the reporter.
