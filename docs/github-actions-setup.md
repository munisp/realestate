# GitHub Actions Setup

The GitHub Actions workflow files are ready in `.github/workflows/` locally but
require the **`workflow` permission** to push via the GitHub App token. A repository
admin must add them manually using one of the methods below.

## Method 1 — GitHub Web UI (easiest)

1. Go to https://github.com/munisp/realestate
2. Click **Add file → Create new file**
3. Type `.github/workflows/ci.yml` as the filename
4. Paste the content from the file below
5. Repeat for `deploy.yml` and `codeql.yml`

## Method 2 — Personal Access Token

```bash
# Create a PAT with 'repo' + 'workflow' scopes at:
# https://github.com/settings/tokens/new

export GH_TOKEN=<your-pat>
git push origin main  # This will now succeed for workflow files
```

## Workflow Files

The three workflow files are located at:
- `.github/workflows/ci.yml` — CI: lint, type-check, test, build on every PR
- `.github/workflows/deploy.yml` — CD: deploy to production on push to main
- `.github/workflows/codeql.yml` — CodeQL security analysis (weekly + on PR)

