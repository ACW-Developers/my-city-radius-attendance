import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Mail, Shield, Save, Camera, Calendar, Clock, Briefcase, Fingerprint, Trash2, Plus, Smartphone } from 'lucide-react';
import { formatDateAZ } from '@/lib/timezone';

const Profile = () => {
  const { user, profile, roles, refreshProfile } = useAuth();
  const { isSupported, register, getCredentials, removeCredential, loading: bioLoading } = useWebAuthn();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (profile?.full_name || 'U').split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');

  useEffect(() => {
    if (user) {
      getCredentials(user.id).then(c => { setCredentials(c); setLoadingCreds(false); });
    }
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', profile.user_id);
    setSaving(false);
    if (error) toast.error('Error updating profile');
    else { toast.success('Profile updated'); refreshProfile(); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
    toast.success('Avatar updated');
    setUploading(false);
    refreshProfile();
  };

  const handleRegisterFingerprint = async () => {
    if (!user || !profile) return;
    const success = await register(user.id, profile.full_name, profile.email);
    if (success) {
      const updated = await getCredentials(user.id);
      setCredentials(updated);
    }
  };

  const handleRemoveCredential = async (id: string) => {
    const success = await removeCredential(id);
    if (success && user) {
      const updated = await getCredentials(user.id);
      setCredentials(updated);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold text-foreground">My Profile</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar & Quick Info */}
        <Card className="border-border/50 md:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <Camera className="size-6 text-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">{profile?.full_name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {roles.map(r => <Badge key={r} variant="secondary" className="capitalize text-xs">{r.replace('_', ' ')}</Badge>)}
              </div>
            </div>
            <Separator />
            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                <span>Joined {(profile as any)?.created_at ? formatDateAZ((profile as any).created_at) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="size-4" />
                <span className="capitalize">{roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${profile?.is_active ? 'bg-primary' : 'bg-destructive'}`} />
                <span className="text-muted-foreground">{profile?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form + Fingerprint */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><User className="size-5 text-primary" /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> Email Address</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Shield className="size-4 text-muted-foreground" /> Roles</Label>
                <Input value={roles.length > 0 ? roles.map(r => r.replace('_', ' ')).join(', ') : 'Unassigned'} disabled className="bg-muted/50 capitalize" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /> Account ID</Label>
                <Input value={user?.id || ''} disabled className="bg-muted/50 font-mono text-xs" />
              </div>
              <Separator />
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="size-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Fingerprint Management */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="size-5 text-primary" /> Biometric Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupported() ? (
                <div className="rounded-md bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Biometric authentication is not supported on this device/browser.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Register your fingerprint for quick check-in/check-out on touchscreen devices and kiosks.
                  </p>

                  {/* Registered credentials */}
                  {loadingCreds ? (
                    <div className="text-xs text-muted-foreground animate-pulse">Loading credentials...</div>
                  ) : credentials.length > 0 ? (
                    <div className="space-y-2">
                      {credentials.map((cred: any) => (
                        <div key={cred.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                              <Smartphone className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{cred.device_name || 'Unknown Device'}</p>
                              <p className="text-xs text-muted-foreground">
                                Registered {cred.created_at ? formatDateAZ(cred.created_at) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRemoveCredential(cred.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
                      <Fingerprint className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No fingerprints registered yet</p>
                    </div>
                  )}

                  <Button
                    onClick={handleRegisterFingerprint}
                    disabled={bioLoading}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {bioLoading ? (
                      <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {bioLoading ? 'Scanning...' : 'Register New Fingerprint'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
