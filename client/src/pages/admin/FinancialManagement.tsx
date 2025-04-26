import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, XCircle, DollarSign, BarChart } from "lucide-react";

export default function FinancialManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('transactions');
  const [openProcessDialog, setOpenProcessDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Form state for processing transaction
  const [processData, setProcessData] = useState({
    status: 'pending',
  });
  
  // Date range for income statistics
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1 of current year
    endDate: new Date().toISOString().split('T')[0], // Today
  });
  
  // Fetch transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions');
      return res.json();
    },
  });
  
  // Fetch pending transactions
  const { data: pendingTransactions = [], isLoading: isPendingLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions/pending');
      return res.json();
    },
  });
  
  // Fetch income statistics
  const { data: incomeStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/admin/income-statistics', dateRange],
    queryFn: async () => {
      const queryString = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const res = await apiRequest('GET', `/api/admin/income-statistics${queryString}`);
      return res.json();
    },
  });
  
  // Process transaction mutation
  const processTransactionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/transactions/${id}/process`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.transactionProcessed'),
        description: t('admin.transactionProcessedSuccess'),
      });
      setOpenProcessDialog(false);
      setSelectedTransaction(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/income-statistics'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.transactionProcessFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Open process dialog with selected transaction
  const openProcessTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setProcessData({
      status: transaction.status,
    });
    setOpenProcessDialog(true);
  };
  
  // Handle process transaction
  const handleProcessTransaction = () => {
    if (selectedTransaction) {
      processTransactionMutation.mutate({
        id: selectedTransaction.id,
        status: processData.status,
      });
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">{t('admin.transactions')}</TabsTrigger>
          <TabsTrigger value="pending">{t('admin.pendingTransactions')}</TabsTrigger>
          <TabsTrigger value="statistics">{t('admin.statistics')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.allTransactions')}</h2>
          </div>
          
          {/* All Transactions Table */}
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
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTransactionsLoading ? (
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
                            : transaction.type === 'refund'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.type === 'subscription' 
                            ? t('admin.subscription') 
                            : transaction.type === 'deposit'
                            ? t('admin.deposit')
                            : transaction.type === 'refund'
                            ? t('admin.refund')
                            : t('admin.withdrawal')
                          }
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : transaction.status === 'refunded'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status === 'completed' 
                            ? t('admin.completed') 
                            : transaction.status === 'failed'
                            ? t('admin.failed')
                            : transaction.status === 'refunded'
                            ? t('admin.refunded')
                            : t('admin.pending')
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openProcessTransaction(transaction)}
                            disabled={transaction.status !== 'pending'}
                          >
                            {transaction.status === 'pending' ? t('admin.process') : t('admin.view')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.pendingTransactions')}</h2>
          </div>
          
          {/* Pending Transactions Table - Similar to all transactions but filtered */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>{t('admin.pendingTransactionsCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.id')}</TableHead>
                  <TableHead>{t('admin.userId')}</TableHead>
                  <TableHead>{t('admin.type')}</TableHead>
                  <TableHead>{t('admin.amount')}</TableHead>
                  <TableHead>{t('admin.date')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : pendingTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type === 'subscription' 
                            ? t('admin.subscription') 
                            : t('admin.deposit')
                          }
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setProcessData({ status: 'completed' });
                              setOpenProcessDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('admin.approve')}
                          </Button>
                          
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setProcessData({ status: 'failed' });
                              setOpenProcessDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {t('admin.reject')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.incomeStatistics')}</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-sm">{t('admin.from')}</label>
                <input
                  id="start-date"
                  type="date"
                  className="px-2 py-1 border rounded-md"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-sm">{t('admin.to')}</label>
                <input
                  id="end-date"
                  type="date"
                  className="px-2 py-1 border rounded-md"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          {/* Income Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{t('admin.totalIncome')}</CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isStatsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(incomeStats?.totalIncome || 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{t('admin.subscriptions')}</CardTitle>
                <BarChart className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isStatsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(incomeStats?.subscriptions || 0)}
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
                  {isStatsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(incomeStats?.deposits || 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{t('admin.refunds')}</CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isStatsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(incomeStats?.refunds || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.refundsLabel')}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* More detailed statistics could go here */}
        </TabsContent>
      </Tabs>
      
      {/* Process Transaction Dialog */}
      <Dialog open={openProcessDialog} onOpenChange={setOpenProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.processTransaction')}</DialogTitle>
            <DialogDescription>
              {t('admin.processTransactionDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.transactionId')}</p>
                <p>{selectedTransaction?.id}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.amount')}</p>
                <p>{selectedTransaction && formatCurrency(selectedTransaction.amount)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.type')}</p>
                <p className="capitalize">{selectedTransaction?.type}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">{t('admin.date')}</p>
                <p>{selectedTransaction && new Date(selectedTransaction.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">{t('admin.updateStatus')}</label>
              <Select 
                value={processData.status} 
                onValueChange={(value) => setProcessData({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                  <SelectItem value="completed">{t('admin.completed')}</SelectItem>
                  <SelectItem value="failed">{t('admin.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('admin.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProcessDialog(false)}>
              {t('general.cancel')}
            </Button>
            <Button onClick={handleProcessTransaction} disabled={processTransactionMutation.isPending}>
              {processTransactionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.processTransaction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}