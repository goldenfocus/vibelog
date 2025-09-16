# Deployment & Infrastructure

> Ship safely, scale smoothly, recover quickly

---

## 🏗️ Infrastructure Overview

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │   Supabase DB    │    │   OpenAI API    │
│                 │    │                  │    │                 │
│ • Static Assets │    │ • PostgreSQL     │    │ • GPT-4         │
│ • Edge Cache    │    │ • Auth           │    │ • Whisper       │
│ • Next.js App   │    │ • File Storage   │    │ • DALL-E        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Environments
```typescript
const environments = {
  development: {
    domain: 'localhost:3000',
    database: 'local_postgres',
    ai_services: 'openai_dev_key',
    monitoring: 'disabled'
  },

  staging: {
    domain: 'staging.vibelog.io',
    database: 'supabase_staging',
    ai_services: 'openai_staging_key',
    monitoring: 'limited'
  },

  production: {
    domain: 'vibelog.io',
    database: 'supabase_production',
    ai_services: 'openai_production_key',
    monitoring: 'full'
  }
}
```

---

## 🚀 Deployment Process

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

      - name: E2E tests
        run: pnpm test:e2e

      - name: Visual regression tests
        run: pnpm test:visual

  deploy-staging:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Staging
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Production
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Run smoke tests
        run: pnpm test:smoke --url=https://vibelog.io

      - name: Update status page
        run: curl -X POST ${{ secrets.STATUS_PAGE_WEBHOOK }}
```

### Deployment Checklist
```markdown
## Pre-Deployment
- [ ] All tests passing (unit, E2E, visual)
- [ ] Database migrations reviewed and tested
- [ ] Environment variables updated
- [ ] Third-party service limits checked
- [ ] Feature flags configured
- [ ] Monitoring alerts updated

## Deployment
- [ ] Deploy to staging first
- [ ] Smoke tests pass on staging
- [ ] Database migrations applied
- [ ] Deploy to production
- [ ] Verify deployment with health checks
- [ ] Smoke tests pass on production

## Post-Deployment
- [ ] Monitor error rates for 30 minutes
- [ ] Check core user flows
- [ ] Verify performance metrics
- [ ] Update status page if needed
- [ ] Notify team of successful deployment
```

---

## 🗄️ Database Management

### Migration Strategy
```typescript
// Database migration workflow
const migrationProcess = {
  development: {
    apply: 'automatic',
    rollback: 'manual',
    testing: 'seed_data_reset'
  },

  staging: {
    apply: 'automatic_on_deploy',
    rollback: 'manual_with_approval',
    testing: 'full_test_suite'
  },

  production: {
    apply: 'manual_with_review',
    rollback: 'two_person_approval',
    testing: 'pre_migration_backup'
  }
}
```

### Backup & Recovery
```typescript
const backupStrategy = {
  // Automated backups
  daily: {
    schedule: '02:00 UTC',
    retention: '30 days',
    verification: 'restore_test_weekly'
  },

  weekly: {
    schedule: 'Sunday 01:00 UTC',
    retention: '12 weeks',
    storage: 'separate_region'
  },

  // Point-in-time recovery
  continuous: {
    enabled: true,
    retention: '7 days',
    recovery_time_objective: '4 hours',
    recovery_point_objective: '15 minutes'
  }
}
```

### Database Maintenance
```sql
-- Weekly maintenance tasks
-- 1. Update table statistics
ANALYZE;

-- 2. Reindex fragmented indexes
REINDEX INDEX CONCURRENTLY idx_vibelogs_created_at;

-- 3. Clean up old sessions
DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days';

-- 4. Archive old audit logs
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 🔄 Rollback Procedures

### Automated Rollback Triggers
```typescript
const rollbackTriggers = {
  // Automatic rollback conditions
  error_rate: {
    threshold: '5%',
    window: '5 minutes',
    action: 'immediate_rollback'
  },

  response_time: {
    threshold: 'p95 > 5 seconds',
    window: '10 minutes',
    action: 'staged_rollback'
  },

  // Manual rollback scenarios
  manual_triggers: [
    'critical_bug_discovered',
    'security_vulnerability',
    'data_corruption_detected',
    'third_party_service_failure'
  ]
}
```

### Rollback Process
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

PREVIOUS_DEPLOYMENT=${1:-""}
REASON=${2:-"unspecified"}

echo "🔄 Starting rollback to deployment: $PREVIOUS_DEPLOYMENT"
echo "📝 Reason: $REASON"

# 1. Verify previous deployment exists
vercel ls --scope=$VERCEL_TEAM | grep $PREVIOUS_DEPLOYMENT

# 2. Create rollback deployment
vercel rollback $PREVIOUS_DEPLOYMENT --scope=$VERCEL_TEAM

# 3. Wait for deployment to be ready
echo "⏳ Waiting for rollback deployment..."
sleep 30

# 4. Run smoke tests
pnpm test:smoke --url=https://vibelog.io

# 5. Update status page
curl -X POST $STATUS_PAGE_WEBHOOK \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"investigating\",\"message\":\"Rolled back due to: $REASON\"}"

# 6. Notify team
curl -X POST $SLACK_WEBHOOK \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"🔄 Production rolled back to $PREVIOUS_DEPLOYMENT. Reason: $REASON\"}"

echo "✅ Rollback completed successfully"
```

---

## 📊 Environment Configuration

### Environment Variables
```typescript
// Environment variable schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // AI Services
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Storage
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_KEY: z.string().optional(),

  // External Services
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
})
```

### Feature Flags
```typescript
// Feature flag configuration
const featureFlags = {
  development: {
    NEW_EDITOR: true,
    BATCH_PROCESSING: true,
    TEAM_FEATURES: true,
    DEBUG_MODE: true
  },

  staging: {
    NEW_EDITOR: true,
    BATCH_PROCESSING: false,
    TEAM_FEATURES: false,
    DEBUG_MODE: false
  },

  production: {
    NEW_EDITOR: false,  // Gradual rollout
    BATCH_PROCESSING: false,
    TEAM_FEATURES: false,
    DEBUG_MODE: false
  }
}
```

---

## 🔍 Health Checks & Monitoring

### Health Check Endpoints
```typescript
// /api/health
export async function GET() {
  const checks = await Promise.allSettled([
    // Database connectivity
    checkDatabase(),

    // External services
    checkOpenAI(),
    checkSupabase(),

    // File system (if applicable)
    checkDiskSpace(),

    // Memory usage
    checkMemoryUsage()
  ])

  const results = checks.map((check, index) => ({
    service: ['database', 'openai', 'supabase', 'disk', 'memory'][index],
    status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    details: check.status === 'fulfilled' ? check.value : check.reason
  }))

  const isHealthy = results.every(r => r.status === 'healthy')

  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: results
  }, {
    status: isHealthy ? 200 : 503
  })
}
```

### Smoke Tests
```typescript
// tests/smoke.spec.ts
test.describe('Production Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('VibeLog')
  })

  test('can start recording', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="start-recording"]')
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible()
  })

  test('API endpoints respond', async ({ request }) => {
    const health = await request.get('/api/health')
    expect(health.status()).toBe(200)

    const vibelog = await request.get('/api/vibelogs')
    expect(vibelog.status()).toBeLessThan(500)
  })
})
```

---

## 🚨 Incident Response

### Incident Classification
```typescript
const incidentSeverity = {
  P0: {
    description: 'Complete service outage',
    response_time: '15 minutes',
    escalation: 'immediate',
    examples: ['Site completely down', 'Database unavailable', 'Auth system broken']
  },

  P1: {
    description: 'Major feature broken',
    response_time: '1 hour',
    escalation: 'within 2 hours',
    examples: ['Recording not working', 'AI generation failing', 'Payment processing down']
  },

  P2: {
    description: 'Minor feature degraded',
    response_time: '4 hours',
    escalation: 'next business day',
    examples: ['Slow loading', 'UI glitches', 'Non-critical API errors']
  }
}
```

### Communication Plan
```typescript
const communicationPlan = {
  internal: {
    P0: ['slack_alert', 'pagerduty', 'email_leadership'],
    P1: ['slack_alert', 'email_team'],
    P2: ['slack_alert']
  },

  external: {
    P0: ['status_page', 'twitter', 'email_customers'],
    P1: ['status_page', 'in_app_banner'],
    P2: ['status_page']
  },

  templates: {
    investigating: "We're investigating reports of issues with {service}. We'll provide updates as we learn more.",
    identified: "We've identified the issue affecting {service} and are working on a fix.",
    resolved: "The issue with {service} has been resolved. We apologize for any inconvenience."
  }
}
```

---

## 📈 Scaling Strategy

### Horizontal Scaling
```typescript
const scalingThresholds = {
  vercel_functions: {
    trigger: 'response_time_p95 > 3s',
    action: 'increase_function_memory',
    limit: '1GB max'
  },

  database: {
    trigger: 'connection_pool_utilization > 80%',
    action: 'increase_pool_size',
    limit: 'supabase_plan_limits'
  },

  storage: {
    trigger: 'storage_usage > 80%',
    action: 'archive_old_files',
    fallback: 'upgrade_plan'
  }
}
```

### Performance Optimization
```typescript
const optimizationStrategy = {
  caching: {
    static_assets: 'CDN + browser cache (1 year)',
    api_responses: 'Redis cache (TTL varies)',
    database_queries: 'Query result caching (5 minutes)'
  },

  bundling: {
    code_splitting: 'route_based + component_based',
    tree_shaking: 'enabled',
    compression: 'gzip + brotli'
  },

  images: {
    format: 'WebP with JPEG fallback',
    sizing: 'responsive with srcset',
    loading: 'lazy loading below fold'
  }
}
```

---

## 🚨 Disaster Recovery

### Recovery Objectives
```typescript
const recoveryObjectives = {
  // Recovery Point Objective (how much data can we lose)
  rpo: {
    database: '15 minutes',        // Point-in-time recovery
    user_uploads: '1 hour',        // File backup frequency
    application_state: '5 minutes' // Redis/cache backup
  },

  // Recovery Time Objective (how long to recover)
  rto: {
    critical_services: '30 minutes',  // Auth, recording, basic publishing
    full_functionality: '4 hours',    // All features restored
    performance_baseline: '8 hours'   // Back to normal performance
  }
}
```

### Disaster Scenarios
```typescript
const disasterScenarios = {
  // Regional outage
  region_failure: {
    trigger: 'primary_region_unavailable',
    response: 'failover_to_secondary_region',
    estimated_downtime: '15-30 minutes',
    data_loss_risk: 'minimal'
  },

  // Database corruption
  database_corruption: {
    trigger: 'data_integrity_check_fails',
    response: 'restore_from_latest_backup',
    estimated_downtime: '2-4 hours',
    data_loss_risk: 'up_to_15_minutes'
  },

  // Third-party service failure
  critical_service_down: {
    trigger: 'openai_api_unavailable',
    response: 'fallback_to_alternative_provider',
    estimated_downtime: '5-10 minutes',
    data_loss_risk: 'none'
  },

  // Security breach
  security_incident: {
    trigger: 'unauthorized_access_detected',
    response: 'isolate_and_investigate',
    estimated_downtime: '1-6 hours',
    data_loss_risk: 'potential_exposure'
  }
}
```

### Backup Strategy
```typescript
const backupStrategy = {
  // Database backups
  database: {
    continuous: {
      method: 'point_in_time_recovery',
      retention: '7_days',
      storage: 'supabase_automatic'
    },
    daily: {
      method: 'full_dump',
      retention: '30_days',
      storage: 'separate_cloud_provider',
      verification: 'weekly_restore_test'
    },
    weekly: {
      method: 'compressed_archive',
      retention: '1_year',
      storage: 'offline_cold_storage'
    }
  },

  // File storage backups
  user_content: {
    real_time: {
      method: 'cross_region_replication',
      retention: 'permanent',
      storage: 'supabase_multi_region'
    },
    daily: {
      method: 'incremental_backup',
      retention: '90_days',
      storage: 'aws_glacier'
    }
  },

  // Application state
  configuration: {
    git_repository: 'version_controlled',
    environment_vars: 'encrypted_backup_daily',
    secrets: 'vault_with_multiple_regions'
  }
}
```

### Failover Procedures
```typescript
const failoverProcedures = {
  // Automated failover
  automatic: {
    triggers: [
      'health_check_fails_3_consecutive',
      'response_time_p95_over_30s',
      'error_rate_over_10_percent'
    ],
    actions: [
      'route_traffic_to_backup',
      'scale_backup_infrastructure',
      'notify_on_call_engineer'
    ]
  },

  // Manual failover
  manual: {
    decision_makers: ['tech_lead', 'on_call_engineer'],
    approval_time: '< 5 minutes',
    execution_time: '< 15 minutes',
    rollback_plan: 'immediate_if_issues'
  }
}
```

### Data Recovery Procedures
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

SCENARIO=${1:-"unknown"}
RECOVERY_POINT=${2:-"latest"}

echo "🚨 Starting disaster recovery for scenario: $SCENARIO"

case $SCENARIO in
  "database_corruption")
    echo "📊 Restoring database from backup..."
    # Stop application traffic
    vercel env add MAINTENANCE_MODE true

    # Restore from point-in-time backup
    supabase db reset --db-url=$RECOVERY_DB_URL

    # Verify data integrity
    npm run db:verify-integrity

    # Resume traffic
    vercel env rm MAINTENANCE_MODE
    ;;

  "region_failure")
    echo "🌍 Failing over to secondary region..."
    # Update DNS to point to backup region
    aws route53 change-resource-record-sets \
      --hosted-zone-id $HOSTED_ZONE_ID \
      --change-batch file://failover-dns.json

    # Scale up backup infrastructure
    vercel scale --regions backup-region --instances 10
    ;;

  "security_breach")
    echo "🔒 Implementing security lockdown..."
    # Rotate all secrets immediately
    ./scripts/rotate-secrets.sh

    # Enable enhanced monitoring
    vercel env add SECURITY_MODE enhanced

    # Force user re-authentication
    redis-cli FLUSHDB # Clear all sessions
    ;;

  *)
    echo "❌ Unknown disaster scenario: $SCENARIO"
    exit 1
    ;;
esac

echo "✅ Disaster recovery completed"
echo "📋 Next steps: Update incident report and notify stakeholders"
```

### Business Continuity
```typescript
const businessContinuity = {
  // Critical business functions
  essential_services: [
    'user_authentication',
    'voice_recording',
    'basic_transcription',
    'content_saving',
    'payment_processing'
  ],

  // Reduced functionality mode
  degraded_mode: {
    description: 'Core features only, enhanced features disabled',
    features_disabled: [
      'ai_content_generation',
      'multi_platform_publishing',
      'advanced_editing',
      'team_collaboration'
    ],
    communication: 'status_page_and_in_app_banner'
  },

  // Stakeholder communication
  communication_plan: {
    customers: {
      channels: ['status_page', 'email', 'in_app_notifications'],
      frequency: 'every_30_minutes_during_incident',
      responsible: 'customer_success_team'
    },
    investors: {
      channels: ['email', 'phone_call_if_critical'],
      frequency: 'major_updates_only',
      responsible: 'ceo'
    },
    team: {
      channels: ['slack', 'incident_channel'],
      frequency: 'real_time_updates',
      responsible: 'incident_commander'
    }
  }
}
```

---

## 🔧 Implementation Checklist

### Infrastructure Setup
- [ ] Vercel project configured
- [ ] Supabase database set up
- [ ] Domain and SSL configured
- [ ] Environment variables set
- [ ] Feature flags implemented
- [ ] Monitoring dashboards created

### CI/CD Pipeline
- [ ] GitHub Actions workflow configured
- [ ] Automated testing in pipeline
- [ ] Staging environment deployment
- [ ] Production deployment approval
- [ ] Rollback procedures tested

### Operations
- [ ] Health check endpoints implemented
- [ ] Smoke tests automated
- [ ] Backup procedures verified
- [ ] Incident response plan documented
- [ ] On-call rotation established
- [ ] Runbooks created for common issues

---

**See also**: `monitoring.md` for observability setup, `engineering.md` for testing requirements, `api.md` for service patterns, `commit.md` for git workflow