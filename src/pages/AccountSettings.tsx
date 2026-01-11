import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, Trash2, User, MapPin, Shield, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddressBook } from '@/components/profile/AddressBook';
import { SessionManagement } from '@/components/profile/SessionManagement';
import { LoginNotificationSettings } from '@/components/profile/LoginNotificationSettings';

const AccountSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast.error('Please enter a new email');
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('Confirmation email sent! Check both old and new email addresses.');
      setNewEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 3) {
      toast.error('Please use a stronger password');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleteLoading(true);
    try {
      // Mark profile as deleted (soft delete)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: '[Deleted User]',
          bio: null,
          avatar_url: null,
          is_active: false 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Sign out the user
      await supabase.auth.signOut();
      toast.success('Account deleted. We\'re sorry to see you go.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Account Settings | CardBoom</title>
        <meta name="description" content="Manage your CardBoom account settings, security, and preferences." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold">Account Settings</h1>
              <p className="text-muted-foreground mt-2">Manage your account, security, and preferences</p>
            </div>

            <Tabs defaultValue="account" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="account" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Account</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="addresses" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Addresses</span>
                </TabsTrigger>
                <TabsTrigger value="danger" className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </TabsTrigger>
              </TabsList>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email Address
                    </CardTitle>
                    <CardDescription>
                      Update your email address. You'll need to verify the new address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Current email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <form onSubmit={handleEmailChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-email">New Email Address</Label>
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="your-new@email.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={emailLoading}>
                        {emailLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Email'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Change Password
                    </CardTitle>
                    <CardDescription>
                      Update your password. Use a strong, unique password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPasswords ? 'text' : 'password'}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        {/* Password Strength Meter */}
                        {newPassword && (
                          <div className="space-y-2">
                            <div className="flex gap-1">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Strength: {strengthLabels[passwordStrength - 1] || 'Too weak'}
                            </p>
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1">
                                {newPassword.length >= 8 ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span>At least 8 characters</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span>Upper and lowercase letters</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/\d/.test(newPassword) ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span>At least one number</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/[^a-zA-Z0-9]/.test(newPassword) ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span>Special character (!@#$%^&*)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type={showPasswords ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-destructive">Passwords do not match</p>
                        )}
                      </div>

                      <Button type="submit" disabled={passwordLoading || passwordStrength < 3}>
                        {passwordLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage sessions and login notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SessionManagement userId={user.id} />
                    <Separator />
                    <LoginNotificationSettings userId={user.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Addresses Tab */}
              <TabsContent value="addresses">
                <AddressBook userId={user.id} />
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger">
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      Delete Account
                    </CardTitle>
                    <CardDescription>
                      Permanently delete your CardBoom account and all associated data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <h4 className="font-semibold text-destructive mb-2">Warning: This action is irreversible</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Your profile and all personal data will be deleted</li>
                        <li>• Active listings will be removed</li>
                        <li>• Your wallet balance must be withdrawn first</li>
                        <li>• Order history will be anonymized</li>
                        <li>• You won't be able to recover your account</li>
                      </ul>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete My Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account 
                            and remove all associated data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="DELETE"
                            className="mt-2"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteLoading ? 'Deleting...' : 'Delete Account'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AccountSettings;