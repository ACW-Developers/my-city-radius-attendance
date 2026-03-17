import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, Fingerprint, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/my_city_logo.png';
import bgImage from '@/assets/bg7.jpg';

const Auth = () => {
  const { session, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-sm">Loading...</div>
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        <img src={bgImage} alt="Office Building" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/60" />
        <div className="relative z-10 flex flex-col justify-end p-10">
          <h2 className="text-3xl font-bold text-primary-foreground drop-shadow-lg">My City Radius</h2>
          <p className="text-sm text-primary-foreground/80 mt-2 max-w-md drop-shadow">
            Employee attendance tracking with biometric verification, real-time monitoring, and payroll integration.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-4 sm:p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="My City Radius" className="h-12 w-auto" />
            <h1 className="text-lg font-bold text-foreground">My City Radius</h1>
            <p className="text-xs text-muted-foreground">Sign in to manage your workspace</p>
          </div>

          <Card className="border-border/50 shadow-md">
            <Tabs defaultValue="login">
              <CardHeader className="pb-2 px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="login" className="text-xs">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login">
                <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder || '••••••••'}
        value={value}
        onChange={onChange}
        required
        className="pr-10 h-8 text-xs"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

function LoginForm({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs">Email</Label>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password" className="text-xs">Password</Label>
          <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </CardContent>
    </form>
  );
}

function SignupForm({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) {
  const { signUp } = useAuth();
  const { isSupported, register, loading: bioLoading } = useWebAuthn();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showFingerprintDialog, setShowFingerprintDialog] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [fingerprintDone, setFingerprintDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (error) { toast.error(error.message); return; }

    toast.success('Account created!');

    // Show fingerprint registration dialog
    if (isSupported()) {
      // We need to wait for the user to be created, then get their ID
      // The auth state change will handle session, but we show the dialog
      setShowFingerprintDialog(true);
    }
  };

  const handleRegisterFingerprint = async () => {
    // Get current user from auth
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in first to register fingerprint'); return; }

    const success = await register(user.id, fullName, email);
    if (success) {
      setFingerprintDone(true);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name" className="text-xs">Full Name</Label>
            <Input id="signup-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-xs">Email</Label>
            <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password" className="text-xs">Password</Label>
            <PasswordInput id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {isSupported() && (
            <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2 text-2xs text-accent-foreground">
              <Fingerprint className="size-3.5 shrink-0" />
              <span>You'll be prompted to register your fingerprint after sign up</span>
            </div>
          )}
          <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
          <CardDescription className="text-center text-2xs">
            First user to sign up becomes the admin
          </CardDescription>
        </CardContent>
      </form>

      <Dialog open={showFingerprintDialog} onOpenChange={setShowFingerprintDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Fingerprint className="size-4 text-primary" />
              Register Fingerprint
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register your fingerprint for quick check-in/check-out on touchscreen devices.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {fingerprintDone ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-8 text-success" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Fingerprint registered successfully! You can now use it for check-in.
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleRegisterFingerprint}
                  disabled={bioLoading}
                  className="group relative flex size-20 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 transition-all hover:border-primary hover:bg-primary/10 active:scale-95 disabled:opacity-50"
                >
                  <Fingerprint className="size-10 text-primary transition-transform group-hover:scale-110" />
                  {bioLoading && (
                    <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Tap to scan your fingerprint
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant={fingerprintDone ? 'default' : 'outline'}
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowFingerprintDialog(false)}
            >
              {fingerprintDone ? 'Continue' : 'Skip for now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Auth;
