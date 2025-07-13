# Auto PR & Vercel Preview Setup

This repository includes GitHub Actions that automatically:

1. Create PRs when you push to any branch (except main)
2. Post Vercel preview URLs in PR comments
3. Update comments when new deployments are ready

## Required Setup

### 1. GitHub Repository Settings

Go to your repo settings → Actions → General:

- Set "Workflow permissions" to "Read and write permissions"
- Check "Allow GitHub Actions to create and approve pull requests"

### 2. GitHub Secrets (Optional for Advanced Features)

If you want the Vercel API integration for faster preview detection, add these secrets in Settings → Secrets and variables → Actions:

```
VERCEL_TOKEN=your_vercel_api_token
VERCEL_TEAM_ID=your_vercel_team_id (optional, only if using a team)
```

**To get your Vercel token:**

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create a new token with these scopes:
   - Read deployments
   - Read projects

### 3. How It Works

**When you push to a branch:**

1. ✅ Auto-creates a draft PR if one doesn't exist
2. ⏳ Waits for Vercel deployment to complete
3. 💬 Posts preview URL in PR comments
4. 🔄 Updates comment when you push new commits

**PR Comment includes:**

- Direct preview URL
- Quick links to key pages (homepage, books, analytics, about)
- Timestamp of last update
- Branch name

## Usage

Just push to any branch:

```bash
git checkout -b feature/my-new-feature
git add .
git commit -m "Add amazing feature"
git push origin feature/my-new-feature
```

The GitHub Action will:

1. Create a PR automatically
2. Post the Vercel preview URL when ready
3. Update the comment on subsequent pushes

## Troubleshooting

**PR not created?**

- Check that branch name doesn't match `main` or `master`
- Verify repository permissions are set correctly

**Preview URL not posted?**

- The simpler workflow will work with just `GITHUB_TOKEN`
- For faster updates, add the Vercel API secrets

**Comments not updating?**

- Ensure "Read and write permissions" is enabled for Actions
- Check the Actions tab for any workflow failures
