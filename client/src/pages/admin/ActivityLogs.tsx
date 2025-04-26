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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Info } from "lucide-react";

export default function ActivityLogs() {
  const { t } = useLanguage();
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  
  // Fetch admin logs
  const { data: logs = [], isLoading } = useQuery<AdminLog[]>({
    queryKey: ['/api/admin/activity-logs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/activity-logs');
      return res.json();
    },
  });
  
  // Format date with time
  const formatDateTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };
  
  // Open details dialog with selected log
  const openLogDetails = (log: AdminLog) => {
    setSelectedLog(log);
    setOpenDetailsDialog(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.activityLogs')}</h2>
      </div>
      
      {/* Activity Logs Table */}
      <div className="rounded-md border">
        <Table>
          <TableCaption>{t('admin.activityLogsCaption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.id')}</TableHead>
              <TableHead>{t('admin.adminId')}</TableHead>
              <TableHead>{t('admin.action')}</TableHead>
              <TableHead>{t('admin.entityType')}</TableHead>
              <TableHead>{t('admin.timestamp')}</TableHead>
              <TableHead className="text-right">{t('admin.details')}</TableHead>
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
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.adminId}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      log.action.includes('create') 
                        ? 'bg-green-100 text-green-800' 
                        : log.action.includes('update')
                        ? 'bg-blue-100 text-blue-800'
                        : log.action.includes('delete') || log.action.includes('remove')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openLogDetails(log)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Log Details Dialog */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.logDetails')}</DialogTitle>
            <DialogDescription>
              {t('admin.viewLogDetails')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.logId')}</p>
                <p>{selectedLog?.id}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.adminUser')}</p>
                <p>{selectedLog?.adminId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.action')}</p>
                <p className="capitalize">{selectedLog?.action}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.timestamp')}</p>
                <p>{selectedLog && formatDateTime(selectedLog.createdAt)}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">{t('admin.targetEntity')}</p>
              <p>{selectedLog?.entityType} #{selectedLog?.entityId}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">{t('admin.detailedInfo')}</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                {selectedLog && JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
            
            {selectedLog?.ipAddress && (
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.ipAddress')}</p>
                <p>{selectedLog.ipAddress}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetailsDialog(false)}>
              {t('general.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}