import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
import { Transaction } from '@shared/schema';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, TrendingUp, CreditCard, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function FinancialManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for dialogs
  const [openProcessDialog, setOpenProcessDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [processStatus, setProcessStatus] = useState('completed');
  const [processNotes, setProcessNotes] = useState('');
  
  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions');
      return res.json();
    },
  });
  
  // Fetch pending transactions
  const { data: pendingTransactions = [], isLoading: isLoadingPending } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions/pending');
      return res.json();
    },
  });
  
  // Process transaction mutation
  const processTransactionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/transactions/${id}/process`, { status, notes: processNotes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.transactionProcessed'),
        description: t('admin.transactionProcessedSuccess'),
      });
      setOpenProcessDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.transactionProcessFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Fetch income statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<{
    totalIncome: number;
    subscriptions: number;
    deposits: number;
    refunds: number;
  }>({
    queryKey: ['/api/admin/transactions/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions/stats');
      return res.json();
    },
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Open process transaction dialog
  const openProcessTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setProcessStatus('completed');
    setProcessNotes('');
    setOpenProcessDialog(true);
  };
  
  // Handle process transaction
  const handleProcessTransaction = () => {
    if (selectedTransaction) {
      processTransactionMutation.mutate({ 
        id: selectedTransaction.id, 
        status: processStatus 
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.financialManagement')}</h2>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.totalIncome')}</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(stats?.totalIncome || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.subscriptions')}</CardTitle>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(stats?.subscriptions || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.deposits')}</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(stats?.deposits || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.pendingTransactions')}</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                pendingTransactions.length
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Pending Transactions */}
      {pendingTransactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">{t('admin.pendingTransactions')}</h3>
          <div className="rounded-md border bg-amber-50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.id')}</TableHead>
                  <TableHead>{t('admin.userId')}</TableHead>
                  <TableHead>{t('admin.type')}</TableHead>
                  <TableHead>{t('admin.amount')}</TableHead>
                  <TableHead>{t('admin.date')}</TableHead>
                  <TableHead>{t('admin.method')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : pendingTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t('admin.noPendingTransactions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id}</TableCell>
                      <TableCell>{transaction.userId}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          transaction.type === 'subscription' 
                            ? 'bg-purple-100 text-purple-800' 
                            : transaction.type === 'deposit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                      <TableCell>{transaction.paymentMethod}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openProcessTransaction(transaction)}
                        >
                          {t('admin.process')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* All Transactions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{t('admin.allTransactions')}</h3>
        <div className="rounded-md border">
          <Table>
            <TableCaption>{t('admin.transactionsListCaption')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.id')}</TableHead>
                <TableHead>{t('admin.userId')}</TableHead>
                <TableHead>{t('admin.type')}</TableHead>
                <TableHead>{t('admin.amount')}</TableHead>
                <TableHead>{t('admin.date')}</TableHead>
                <TableHead>{t('admin.method')}</TableHead>
                <TableHead>{t('admin.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t('admin.noTransactionsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>{transaction.userId}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        transaction.type === 'subscription' 
                          ? 'bg-purple-100 text-purple-800' 
                          : transaction.type === 'deposit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                    <TableCell>{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : transaction.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : transaction.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Process Transaction Dialog */}
      <Dialog open={openProcessDialog} onOpenChange={setOpenProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.processTransaction')}</DialogTitle>
            <DialogDescription>
              {t('admin.processTransactionDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.transactionId')}</p>
                  <p>{selectedTransaction.id}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.user')}</p>
                  <p>ID: {selectedTransaction.userId}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.type')}</p>
                  <p className="capitalize">{selectedTransaction.type}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.amount')}</p>
                  <p className="font-semibold">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.paymentMethod')}</p>
                  <p>{selectedTransaction.paymentMethod}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin.currentStatus')}</p>
                  <p>{selectedTransaction.status}</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium mb-2">{t('admin.updateStatus')}</p>
                <Select 
                  value={processStatus} 
                  onValueChange={setProcessStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">{t('admin.statusCompleted')}</SelectItem>
                    <SelectItem value="failed">{t('admin.statusFailed')}</SelectItem>
                    <SelectItem value="refunded">{t('admin.statusRefunded')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">{t('admin.processingNotes')}</p>
                <Textarea
                  placeholder={t('admin.notesPlaceholder')}
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenProcessDialog(false)}
            >
              {t('admin.cancel')}
            </Button>
            <Button 
              onClick={handleProcessTransaction}
              disabled={processTransactionMutation.isPending}
              variant={processStatus === 'completed' ? 'default' : 'destructive'}
            >
              {processTransactionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('admin.confirmProcess')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}