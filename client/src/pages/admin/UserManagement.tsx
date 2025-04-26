import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
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
  DialogClose,
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Edit, UserMinus, UserCheck, Filter } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function UserManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // State for create form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user',
    userType: 'normal',
  });
  
  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return res.json();
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (user: any) => {
      const res = await apiRequest('POST', '/api/admin/users', user);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.userCreated'),
        description: t('admin.userCreatedSuccess'),
      });
      setOpenCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      resetNewUserForm();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.userCreateFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.userUpdated'),
        description: t('admin.userRoleUpdated'),
      });
      setOpenEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.userUpdateFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/deactivate`);
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
    }
  });
  
  // Reactivate user mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/reactivate`);
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
    }
  });
  
  // Filter users based on criteria
  const filteredUsers = users.filter(user => {
    let matchesRole = true;
    let matchesStatus = true;
    
    if (roleFilter) {
      matchesRole = user.role === roleFilter;
    }
    
    if (statusFilter) {
      matchesStatus = statusFilter === 'active' ? user.isActive : !user.isActive;
    }
    
    return matchesRole && matchesStatus;
  });
  
  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };
  
  // Reset new user form
  const resetNewUserForm = () => {
    setNewUser({
      username: '',
      password: '',
      email: '',
      role: 'user',
      userType: 'normal',
    });
  };
  
  // Open edit dialog with user data
  const openUserEdit = (user: User) => {
    setSelectedUser(user);
    setOpenEditDialog(true);
  };
  
  // Handle role change in edit dialog
  const handleRoleChange = (role: string) => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role });
    }
  };
  
  // Handle user active status toggle
  const toggleUserStatus = (user: User) => {
    if (user.isActive) {
      deactivateUserMutation.mutate(user.id);
    } else {
      reactivateUserMutation.mutate(user.id);
    }
  };
  
  // Handle create form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };
  
  // Handle select change in create form
  const handleSelectChange = (name: string, value: string) => {
    setNewUser({ ...newUser, [name]: value });
  };
  
  // Handle create user submit
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.userManagement')}</h2>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('admin.addUser')}
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            {t('admin.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="role-filter">{t('admin.role')}</Label>
              <Select 
                value={roleFilter || ''} 
                onValueChange={(value) => setRoleFilter(value || null)}
              >
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder={t('admin.allRoles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('admin.allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                  <SelectItem value="sub-admin">{t('admin.subAdminRole')}</SelectItem>
                  <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="status-filter">{t('admin.status')}</Label>
              <Select 
                value={statusFilter || ''} 
                onValueChange={(value) => setStatusFilter(value || null)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder={t('admin.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('admin.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('admin.activeUsers')}</SelectItem>
                  <SelectItem value="inactive">{t('admin.inactiveUsers')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRoleFilter(null);
                  setStatusFilter(null);
                }}
              >
                {t('admin.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableCaption>{t('admin.userListCaption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.id')}</TableHead>
              <TableHead>{t('admin.username')}</TableHead>
              <TableHead>{t('admin.email')}</TableHead>
              <TableHead>{t('admin.role')}</TableHead>
              <TableHead>{t('admin.type')}</TableHead>
              <TableHead>{t('admin.createdAt')}</TableHead>
              <TableHead>{t('admin.status')}</TableHead>
              <TableHead className="text-right">{t('admin.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t('admin.noUsersFound')}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : user.role === 'sub-admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.userType === 'premium' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.userType}
                    </span>
                  </TableCell>
                  <TableCell>{user.lastLogin ? formatDate(user.lastLogin) : 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openUserEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={user.isActive ? "ghost" : "outline"} 
                        size="sm" 
                        onClick={() => toggleUserStatus(user)}
                      >
                        {user.isActive ? (
                          <UserMinus className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.createNewUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.createUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('admin.username')} *</Label>
                <Input
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('admin.email')} *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('admin.password')} *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">{t('admin.role')}</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(value) => handleSelectChange('role', value)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder={t('admin.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                      <SelectItem value="sub-admin">{t('admin.subAdminRole')}</SelectItem>
                      <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userType">{t('admin.userType')}</Label>
                  <Select 
                    value={newUser.userType} 
                    onValueChange={(value) => handleSelectChange('userType', value)}
                  >
                    <SelectTrigger id="userType">
                      <SelectValue placeholder={t('admin.selectUserType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{t('admin.normalUser')}</SelectItem>
                      <SelectItem value="premium">{t('admin.premiumUser')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetNewUserForm}
                >
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button 
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('admin.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.editUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.editUserDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('admin.username')}</Label>
                <p className="text-sm font-medium">{selectedUser.username}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.email')}</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">{t('admin.role')}</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={handleRoleChange}
                  disabled={updateRoleMutation.isPending}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                    <SelectItem value="sub-admin">{t('admin.subAdminRole')}</SelectItem>
                    <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('admin.userStatus')}: 
                  <span className={`ml-2 font-medium ${selectedUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedUser.isActive ? t('admin.active') : t('admin.inactive')}
                  </span>
                </p>
                <Button 
                  onClick={() => toggleUserStatus(selectedUser)}
                  variant={selectedUser.isActive ? "outline" : "default"}
                  size="sm"
                  disabled={deactivateUserMutation.isPending || reactivateUserMutation.isPending}
                >
                  {(deactivateUserMutation.isPending || reactivateUserMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedUser.isActive ? t('admin.deactivateUser') : t('admin.activateUser')}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenEditDialog(false)}
            >
              {t('admin.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}