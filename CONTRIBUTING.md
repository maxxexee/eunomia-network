# Contributing to Eunomia Network

Thanks for helping improve Eunomia. This is a static frontend plus one Supabase edge function, so keep changes small, keep the demo honest about which workspaces are live, and do not present sample data as a running registry.

## Ground rules

- Do not commit API keys, private keys, vault keys, or `.env` files.
- Keep new documentation and user-facing copy free of emojis and em dashes.
- Keep commit authorship with the repository owner. Do not add co-author or generated-by trailers.
- Open an issue before a large change so the approach can be discussed.
- Report security problems privately using [SECURITY.md](SECURITY.md), not a public issue.

## Setup

Requirements: Node.js 20 or newer for the repository checks. There is no build step.

```bash
git clone https://github.com/maxxexee/eunomia.git
cd eunomia
python3 -m http.server 8080
```

Open `http://localhost:8080`.

The Supabase URL and anon key in `js/auth.js` are public by design. The edge function secrets are listed in [.env.example](.env.example) and belong in the Supabase project, never in the browser.

## Checks

Run the repository checks before opening a pull request:

```bash
node scripts/check-repo.mjs
```

They cover required files, README links and anchors, the no em dash rule, image dimensions, and JavaScript syntax.

## The edge function

`supabase/functions/faucet-claim` is Deno. It refuses a second claim for the same address and sends an ERC20 transfer from the vault wallet. Changes to it deploy from `main` through `.github/workflows/deploy-functions.yml`.

Test a change against a Supabase project you control. Do not point a local run at the production vault.

## Pages

Each workspace is a standalone HTML file that shares `css/styles.css`, the `js/` modules, and the Alpine.js components on the page itself. When you add a page, update the README table and the repository checks so the page is covered.

## Pull requests

- Keep the change focused and describe the problem it solves.
- Update the README, docs, or screenshots when behavior changes.
- Include the commands you ran and the output that shows the change works.
- Do not include `.env`, `node_modules`, or `.netlify` output.
- Do not add attribution trailers to commits.

## Commit messages

Use a short imperative subject, for example:

```text
Add the dispute workspace case timeline
Fix the ENS registration term
```

## License

By contributing, you agree that your contribution is licensed under the MIT License. See [LICENSE](LICENSE).
