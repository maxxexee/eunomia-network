# Eunomia Network

**On-chain forensics and a threat registry.** Hunters submit exploit reports, a DAO votes
on severity, and every report keeps a trail that survives cross-examination.

> Every report, court-ready.

Static site on Netlify, Supabase for auth and identity, an ENS name per investigator, and a
Sepolia faucet so a reviewer can try it without hunting for test ETH.

---

## The workspaces

| Page | Workspace | What it does |
|---|---|---|
| `index.html` | Landing | What the registry is, the Liquid-Mercury severity gauge, the API pitch |
| `onboard.html` | Operational Gateway | After sign-in: provision a wallet, register an ENS name, pick a workspace |
| `hunter.html` | Threat Hunter Terminal | Submit a threat report, run a quick scan |
| `dao.html` | DAO Governance Quorum | Threat review threads, severity votes, quorum tracking |
| `dispute.html` | Dispute & Legal Forensics | Case-level analysis of a flagged contract |
| `ens.html` | Identity | Register an investigator name, because attribution is the whole game |
| `faucet.html` | Testnet Faucet | One-time EUN claim for judges and new sign-ins |

## How it fits together

```
Browser (static HTML + Alpine.js)
    |
    +-- Supabase Auth ------- Google OAuth / email magic link
    |       |
    |       +-- wallet provisioned client-side, encrypted in-browser
    |
    +-- ENS Sepolia registry -- name registration (1 year term)
    |
Netlify (static host, SPA fallback)
    |
    +-- Supabase Edge Function: faucet-claim (Deno, ethers v6)
            |
            +-- one claim per address, enforced via faucet_claims table
            +-- ERC20 transfer from the vault wallet
```

## Auth and wallets

Sign-in is Supabase: Google OAuth or an email magic link. On first sign-in the app
generates an EVM wallet for you — no MetaMask, no extension — and encrypts the key in the
browser with **PBKDF2-SHA256 (100k iterations) + AES-GCM 256** via Web Crypto. The
unencrypted key never leaves the machine.

## ENS

Real registration, not a mock: `register(...)` against the ENS Sepolia registry
(`0x253553366Da8546Fc250F225fe3d12a07401295B`) with the public resolver, one-year term.

## Faucet

`supabase/functions/faucet-claim` is a Deno edge function using ethers v6. It validates the
address, refuses a second claim for the same address, then sends an ERC20 transfer from the
vault wallet.

Required environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEPOLIA_RPC_URL`,
`VAULT_PRIVATE_KEY`, `EUN_CONTRACT_ADDRESS`.

## Run it locally

No build step. Any static server works:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

The Supabase anon key in `js/auth.js` is public by design; the service role key lives only
in the edge function's environment.

## Deploy

- **Frontend:** Netlify, publishing the repo root with an SPA fallback.
- **Functions:** `.github/workflows/deploy-functions.yml` deploys `faucet-claim` to Supabase
  on any push to `main` that touches `supabase/functions/**`.

## Status

What is wired to live services, and what is not:

- **Live:** authentication, wallet provisioning and encryption, ENS registration on Sepolia,
  and the faucet claim.
- **Sample data:** the hunter, DAO and dispute workspaces render built-in report content.
  They do not read from a registry table yet — treat them as the interaction design for the
  registry rather than a running backend.
- **Not audited.** No third-party review of the faucet function or the wallet encryption.

## Stack

Static HTML, Alpine.js, Tailwind (CDN), Supabase (Auth, Postgres, Edge Functions), ethers,
GSAP, three.js, Netlify, GitHub Actions.
