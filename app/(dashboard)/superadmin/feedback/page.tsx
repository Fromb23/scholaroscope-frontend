'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, MessageCircle, Search } from 'lucide-react';

import { useRequests } from '@/app/plugins/requests/hooks/useRequests';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import type { Request } from '@/app/plugins/requests/types/requests';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getReferenceText(request: Request, key: string): string {
  const value = request.reference_data?.[key];
  return typeof value === 'string' ? value : '—';
}

export default function SuperAdminFeedbackPage() {
  const { requests, loading, error, refetch } = useRequests();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FEATURE_REQUEST' | 'BUG_REPORT'>('ALL');

  const feedbackRequests = useMemo(() => (
    requests.filter((request) => (
      request.request_type === 'FEATURE_REQUEST' || request.request_type === 'BUG_REPORT'
    ))
  ), [requests]);
  const filteredRequests = useMemo(() => (
    feedbackRequests.filter((request) => {
      const matchesType = typeFilter === 'ALL' || request.request_type === typeFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || request.title.toLowerCase().includes(query)
        || request.description.toLowerCase().includes(query)
        || request.organization_name.toLowerCase().includes(query)
        || request.submitted_by_name.toLowerCase().includes(query)
        || getReferenceText(request, 'path').toLowerCase().includes(query)
        || getReferenceText(request, 'page_key').toLowerCase().includes(query);
      return matchesType && matchesSearch;
    })
  ), [feedbackRequests, search, typeFilter]);
  const assistantContext = useMemo(() => ({
    pageKey: 'superadmin_feedback',
    pageTitle: 'Feedback Center',
    state: {
      is_loading: loading,
      feedback_count: feedbackRequests.length,
    },
    visibleActions: [
      { label: 'Open Support Requests', type: 'navigate' as const, href: '/superadmin/support' },
    ],
  }), [feedbackRequests.length, loading]);

  useAssistantPageContext(assistantContext);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="mt-3 text-sm theme-muted">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="secondary" onClick={refetch} className="mt-3">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text">Feedback Center</h1>
        <p className="mt-1 text-sm theme-muted">
          Assistant-submitted feature requests and bug reports that are currently visible through the requests API.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        This view currently shows feedback records that are already available to superadmin request review.
        Instructor feedback that stays inside an organization request queue may not appear here until an admin escalates it.
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, organization, page, or submitter"
              className="theme-input w-full rounded-lg py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'FEATURE_REQUEST' | 'BUG_REPORT')}
            className="theme-input rounded-lg px-3 py-2 text-sm"
          >
            <option value="ALL">All feedback</option>
            <option value="FEATURE_REQUEST">Feature requests</option>
            <option value="BUG_REPORT">Bug reports</option>
          </select>
        </div>
      </Card>

      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 theme-subtle" />
          <p className="mt-3 text-sm theme-muted">
            {feedbackRequests.length === 0
              ? 'No assistant feedback is visible here yet.'
              : 'No feedback matches the current filters.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold theme-text">{request.title}</h2>
                    <Badge variant={request.request_type === 'BUG_REPORT' ? 'red' : 'purple'} size="sm">
                      {request.request_type_display}
                    </Badge>
                    <Badge variant="blue" size="sm">{request.status_display}</Badge>
                    <Badge variant="orange" size="sm">{request.priority_display}</Badge>
                  </div>
                  <p className="mt-2 text-sm theme-muted">{request.description}</p>
                </div>
                <div className="shrink-0 text-sm theme-muted">
                  {formatDate(request.created_at)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Submitted by</div>
                  <div className="mt-1 theme-text">{request.submitted_by_name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Organization</div>
                  <div className="mt-1 theme-text">{request.organization_name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Source Path</div>
                  <div className="mt-1 font-mono text-xs theme-text">{getReferenceText(request, 'path')}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Role</div>
                  <div className="mt-1 theme-text">{getReferenceText(request, 'role')}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Page Key</div>
                  <div className="mt-1 theme-text">{getReferenceText(request, 'page_key')}</div>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Original User Message</div>
                  <div className="mt-1 theme-text">{getReferenceText(request, 'user_message')}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
