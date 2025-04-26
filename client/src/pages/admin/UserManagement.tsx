import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Check, X, UserCog } from "lucide-react";

export default function UserManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state for new user
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user',
  });
  
  // Form state for role update
  const [newRole, setNewRole] = useState('user');
  
  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return res.json();
    },
  });
  
  // Create new admin user
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await apiRequest('POST', '/api/admin/users', userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.userCreated'),
        description: t('admin.userCreatedSuccess'),
      });
      setOpenNewUserDialog(false);
      setNewUser({ username: '', password: '', email: '', role: 'user' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.userCreateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.roleUpdated'),
        description: t('admin.roleUpdatedSuccess'),
      });
      setOpenRoleDialog(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.roleUpdateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Deactivate user
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/deactivate`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.userDeactivated'),
        description: t('admin.userDeactivatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.userDeactivateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Reactivate user
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/reactivate`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.userReactivated'),
        description: t('admin.userReactivatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.userReactivateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };
  
  // Handle role update
  const handleRoleUpdate = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };
  
  // Open role dialog with selected user
  const openUserRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setOpenRoleDialog(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t('admin.userManagement')}</h2>
        
        {/* New User Dialog */}
        <Dialog open={openNewUserDialog} onOpenChange={setOpenNewUserDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('admin.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createNewUser')}</DialogTitle>
              <DialogDescription>
                {t('admin.createUserDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleInputChange}
                  placeholder={t('auth.usernamePlaceholder')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">{t('admin.role')}</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                    <SelectItem value="sub-admin">{t('admin.subAdminRole')}</SelectItem>
                    {user?.role === 'admin' && (
                      <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpenNewUserDialog(false)}>
                  {t('general.cancel')}
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('admin.createUser')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Change Role Dialog */}
        <Dialog open={openRoleDialog} onOpenChange={setOpenRoleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.changeUserRole')}</DialogTitle>
              <DialogDescription>
                {t('admin.changeRoleDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-username">{t('auth.username')}</Label>
                <Input
                  id="current-username"
                  value={selectedUser?.username || ''}
                  readOnly
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-role">{t('admin.newRole')}</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                    <SelectItem value="sub-admin">{t('admin.subAdminRole')}</SelectItem>
                    {user?.role === 'admin' && (
                      <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpenRoleDialog(false)}>
                  {t('general.cancel')}
                </Button>
                <Button onClick={handleRoleUpdate} disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('admin.updateRole')}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableCaption>{t('admin.userListCaption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.userId')}</TableHead>
              <TableHead>{t('auth.username')}</TableHead>
              <TableHead>{t('auth.email')}</TableHead>
              <TableHead>{t('admin.role')}</TableHead>
              <TableHead>{t('admin.userType')}</TableHead>
              <TableHead>{t('admin.status')}</TableHead>
              <TableHead className="text-right">{t('admin.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('admin.noUsersFound')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : user.role === 'sub-admin' 
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' 
                        ? t('admin.adminRole') 
                        : user.role === 'sub-admin' 
                        ? t('admin.subAdminRole')
                        : t('admin.userRole')
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.userType === 'premium' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.userType === 'premium' 
                        ? t('admin.premiumUser')
                        : t('admin.normalUser')
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isActive 
                        ? t('admin.active')
                        : t('admin.inactive')
                      }
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openUserRoleDialog(user)}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      
                      {user.isActive ? (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deactivateUserMutation.mutate(user.id)}
                          disabled={deactivateUserMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => reactivateUserMutation.mutate(user.id)}
                          disabled={reactivateUserMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}