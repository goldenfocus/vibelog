# GitHub Repository Secrets Setup

To ensure the CI/CD pipeline works correctly, you need to set up the following repository secrets in your GitHub repository.

## Required Secrets

Navigate to your repository Settings → Secrets and variables → Actions → New repository secret and add:

### Supabase Configuration
- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL (e.g., `https://xyzcompany.supabase.co`)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anon public key
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (server-side only)

### OpenAI Configuration (Optional)
- **OPENAI_API_KEY**: Your OpenAI API key (e.g., `sk-...`)
  - If not provided, the app will use mock responses for testing

## How to Find Your Supabase Keys

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings → API
4. Copy the following values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API Keys → anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Project API Keys → service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

## Testing Without Secrets

The workflow includes fallback values for testing:
- Supabase will use dummy URLs and keys
- OpenAI will use mock responses
- Rate limiting will fall back to in-memory storage

This ensures the CI pipeline can run and test the application even without real API credentials.

## Security Notes

- Never commit actual API keys to your repository
- Service role keys have admin access - keep them secure
- The anon key is safe to expose publicly
- Consider using different Supabase projects for development/staging/production