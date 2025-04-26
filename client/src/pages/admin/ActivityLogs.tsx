import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
import { AdminLog } from '@shared/schema';

import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Filter, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

const ACTIONS_MAP: Record<string, string> = {
  'user_create': 'Create User',
  'user_update': 'Update User',
  'user_deactivate': 'Deactivate User',
  'user_reactivate': 'Reactivate User',
  'movie_create': 'Create Movie',
  'movie_update': 'Update Movie',
  'movie_delete': 'Delete Movie',
  'upload_process': 'Process Upload',
  'transaction_process': 'Process Transaction',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function ActivityLogs() {
  const { t } = useLanguage();
  
  // Filter states
  const [adminFilter, setAdminFilter] = useState<number | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [limit, setLimit] = useState<number>(50);
  
  // Fetch admin logs
  const { data: logs = [], isLoading } = useQuery<AdminLog[]>({
    queryKey: ['/api/admin/logs', adminFilter, actionFilter, sortOrder, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (adminFilter) {
        params.append('adminId', adminFilter.toString());
      }
      
      if (actionFilter) {
        params.append('action', actionFilter);
      }
      
      params.append('sort', sortOrder);
      params.append('limit', limit.toString());
      
      const url = `/api/admin/logs?${params.toString()}`;
      const res = await apiRequest('GET', url);
      return res.json();
    },
  });
  
  // Format date
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format action name
  const formatAction = (action: string) => {
    return ACTIONS_MAP[action] || action;
  };
  
  // Reset filters
  const resetFilters = () => {
    setAdminFilter(null);
    setActionFilter(null);
    setSortOrder('newest');
  };
  
  // Load more logs
  const loadMore = () => {
    setLimit(prev => prev + 50);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.activityLogs')}</h2>
      </div>
      
      {/* Filters */}
      <div className="bg-slate-50 p-4 rounded-lg border">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2 text-muted-foreground" />
          <h3 className="text-lg font-medium">{t('admin.filters')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="admin-filter">{t('admin.adminUser')}</Label>
            <Input
              id="admin-filter"
              type="number"
              placeholder={t('admin.adminIdPlaceholder')}
              value={adminFilter || ''}
              onChange={(e) => setAdminFilter(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="action-filter">{t('admin.action')}</Label>
            <Select
              value={actionFilter || ''}
              onValueChange={(value) => setActionFilter(value || null)}
            >
              <SelectTrigger id="action-filter">
                <SelectValue placeholder={t('admin.allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allActions')}</SelectItem>
                {Object.entries(ACTIONS_MAP).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sort-filter">{t('admin.sortOrder')}</Label>
            <Select
              value={sortOrder}
              onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}
            >
              <SelectTrigger id="sort-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === 'newest' ? (
                      <span className="flex items-center">
                        <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                        {option.label}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <ArrowUpWideNarrow className="mr-2 h-4 w-4" />
                        {option.label}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={resetFilters}
          >
            {t('admin.resetFilters')}
          </Button>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="rounded-md border">
        <Table>
          <TableCaption>{t('admin.activityLogsCaption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.id')}</TableHead>
              <TableHead>{t('admin.timestamp')}</TableHead>
              <TableHead>{t('admin.adminUser')}</TableHead>
              <TableHead>{t('admin.action')}</TableHead>
              <TableHead>{t('admin.target')}</TableHead>
              <TableHead>{t('admin.details')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t('admin.noLogsFound')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono">{log.id}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      ID: {log.adminId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.action.includes('create') 
                        ? 'bg-green-100 text-green-800' 
                        : log.action.includes('update') || log.action.includes('process')
                        ? 'bg-blue-100 text-blue-800'
                        : log.action.includes('delete') || log.action.includes('deactivate')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {formatAction(log.action)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.entityId && (
                      <span className="font-mono text-xs">
                        {log.entityType && `${log.entityType} `}ID: {log.entityId}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Load More Button */}
      {logs.length >= limit && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('admin.loadMoreLogs')}
          </Button>
        </div>
      )}
    </div>
  );
}