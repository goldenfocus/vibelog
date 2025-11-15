import { Users, FileText, DollarSign, Activity } from 'lucide-react';

import { getAdminAuditLog } from '@/lib/auth-admin';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

async function getStats() {
  const adminClient = await createServerAdminClient();

  // Get user count
  const { count: userCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get vibelog count
  const { count: vibelogCount } = await adminClient
    .from('vibelogs')
    .select('*', { count: 'exact', head: true });

  // Get TTS usage count (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: ttsCount } = await adminClient
    .from('tts_usage_log')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Get app config for cost alert
  const { data: costAlertConfig } = await adminClient
    .from('app_config')
    .select('value')
    .eq('key', 'cost_alert_threshold_usd')
    .single();

  return {
    userCount: userCount || 0,
    vibelogCount: vibelogCount || 0,
    ttsCount: ttsCount || 0,
    costAlert: costAlertConfig?.value || 90,
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  color: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`rounded-lg ${color} p-2`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mb-1 text-3xl font-bold text-foreground">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AuditLogItem({ log }: { log: any }) {
  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete')) {
      return 'text-red-600 dark:text-red-400';
    }
    if (action.includes('god_mode')) {
      return 'text-purple-600 dark:text-purple-400';
    }
    if (action.includes('edit') || action.includes('update')) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`font-semibold ${getActionColor(log.action)}`}>
            {formatAction(log.action)}
          </span>
          {log.target_user && (
            <span className="text-sm text-muted-foreground">
              → {log.target_user.display_name || log.target_user.email}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          by {log.admin_user?.display_name || log.admin_user?.email} •{' '}
          {new Date(log.created_at).toLocaleString()}
        </p>
        {log.details && (
          <div className="mt-2 rounded bg-muted p-2 font-mono text-xs text-muted-foreground">
            {JSON.stringify(log.details, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const auditLog = await getAdminAuditLog(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Vibelog instance and recent activity
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.userCount}
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          description="Registered accounts"
        />
        <StatCard
          title="Total Vibelogs"
          value={stats.vibelogCount}
          icon={FileText}
          color="bg-gradient-to-br from-green-500 to-green-600"
          description="Published stories"
        />
        <StatCard
          title="TTS Usage (30d)"
          value={stats.ttsCount}
          icon={Activity}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          description="Text-to-speech requests"
        />
        <StatCard
          title="Cost Alert"
          value={`$${stats.costAlert}`}
          icon={DollarSign}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          description="Monthly threshold"
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Activity</h2>
        <div className="space-y-3">
          {auditLog && auditLog.length > 0 ? (
            auditLog.map(log => <AuditLogItem key={log.id} log={log} />)
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-8 text-center">
              <Activity className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
