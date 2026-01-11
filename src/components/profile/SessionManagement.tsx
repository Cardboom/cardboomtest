import { useState, useEffect } from 'react';
import { 
  Monitor, Smartphone, Globe, Clock, Trash2, Shield, 
  AlertTriangle, Loader2, MapPin, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  device_info: {
    browser?: string;
    os?: string;
    device_type?: string;
  };
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

interface SessionManagementProps {
  userId: string;
}

export const SessionManagement = ({ userId }: SessionManagementProps) => {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('last_active_at', { ascending: false });

    if (data) {
      setSessions(data as Session[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && userId) {
      fetchSessions();
    }
  }, [open, userId]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      toast.error('Failed to revoke session');
    } else {
      toast.success('Session revoked');
      setSessions(sessions.filter(s => s.id !== sessionId));
    }
    setRevoking(null);
  };

  const revokeAllOtherSessions = async () => {
    const otherSessions = sessions.filter(s => !s.is_current);
    
    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_current', false);

    if (error) {
      toast.error('Failed to revoke sessions');
    } else {
      toast.success(`Revoked ${otherSessions.length} sessions`);
      setSessions(sessions.filter(s => s.is_current));
    }
    setShowRevokeAll(false);
  };

  const getDeviceIcon = (deviceInfo: Session['device_info']) => {
    const deviceType = deviceInfo?.device_type?.toLowerCase() || '';
    if (deviceType.includes('mobile') || deviceType.includes('phone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceName = (session: Session) => {
    const { browser, os } = session.device_info || {};
    if (browser && os) {
      return `${browser} on ${os}`;
    }
    return 'Unknown Device';
  };

  const otherSessionsCount = sessions.filter(s => !s.is_current).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Sessions
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No active sessions found</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  These devices are currently logged into your account.
                </p>

                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border ${
                      session.is_current 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          session.is_current ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {getDeviceIcon(session.device_info)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{getDeviceName(session)}</p>
                            {session.is_current && (
                              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                          </div>
                          {session.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last active {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {!session.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                          disabled={revoking === session.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {revoking === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {otherSessionsCount > 0 && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setShowRevokeAll(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Sign out all other sessions ({otherSessionsCount})
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out {otherSessionsCount} other {otherSessionsCount === 1 ? 'session' : 'sessions'}. 
              You'll remain signed in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeAllOtherSessions} className="bg-destructive hover:bg-destructive/90">
              Sign out all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
