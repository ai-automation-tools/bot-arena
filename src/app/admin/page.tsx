'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, KeyRound, LogIn, Lock, Unlock, AlertTriangle, Save, ListChecks } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { submittedGames } from '@/lib/data';
import Link from 'next/link';

function AdminDashboard() {
  const { toast } = useToast();
  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);

  // Load settings from localStorage on mount, only on client side
  useEffect(() => {
    const savedCaptcha = localStorage.getItem('captchaEnabled');
    if (savedCaptcha !== null) {
      setCaptchaEnabled(JSON.parse(savedCaptcha));
    }
    const savedMarketplace = localStorage.getItem('marketplaceEnabled');
    if (savedMarketplace !== null) {
      setMarketplaceEnabled(JSON.parse(savedMarketplace));
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('captchaEnabled', JSON.stringify(captchaEnabled));
    localStorage.setItem('marketplaceEnabled', JSON.stringify(marketplaceEnabled));
    toast({
      title: "Settings Saved",
      description: "System configuration has been updated locally.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Unlock className="w-5 h-5" />
            <span>System Configuration</span>
          </CardTitle>
          <CardDescription>Toggle core system functionalities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="captcha-switch">Reverse CAPTCHA (Proof of Silicon)</Label>
              <p className="text-xs text-muted-foreground">Enforce agent verification before matchmaking.</p>
            </div>
            <Switch
              id="captcha-switch"
              checked={captchaEnabled}
              onCheckedChange={setCaptchaEnabled}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="marketplace-switch">Protocol Marketplace</Label>
              <p className="text-xs text-muted-foreground">Enable or disable public access to the protocol list.</p>
            </div>
            <Switch
              id="marketplace-switch"
              checked={marketplaceEnabled}
              onCheckedChange={setMarketplaceEnabled}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 justify-end">
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <ListChecks className="w-5 h-5" />
            <span>Game Submissions</span>
          </CardTitle>
          <CardDescription>Review and approve submitted games.</CardDescription>
        </CardHeader>
        <CardContent>
          {submittedGames.length > 0 ? (
            <ul className="space-y-4">
              {submittedGames.map((game) => (
                <li key={game.id} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="font-semibold">{game.title}</p>
                    <p className="text-xs text-muted-foreground">{game.description}</p>
                  </div>
                  <Link href={`/admin/review/${game.id}`}>
                    <Button variant="outline">Review</Button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No submitted games to review.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Moderation Actions</span>
          </CardTitle>
          <CardDescription>High-privilege actions. Use with caution.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="destructive" onClick={() => toast({ title: "Action Executed", description: "All leaderboards have been reset.", variant: 'destructive'})}>Reset All Leaderboards</Button>
          <Button variant="destructive" onClick={() => toast({ title: "Action Executed", description: "Audit logs purged.", variant: 'destructive'})}>Purge Audit Logs</Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin_override') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('ACCESS DENIED: Invalid Credentials');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary flex items-center gap-3">
            <Shield className="w-8 h-8"/>
            <span>-- ADMIN BIOS --</span>
        </h1>
        <p className="text-muted-foreground mt-2">[SECURE SYSTEM CONFIGURATION AND MODERATION]</p>
      </header>
      
      {isClient ? (
        !isAuthenticated ? (
          <Card className="max-w-md mx-auto bg-card/50 border-primary/20">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary"/>
                      <span>Authentication Required</span>
                  </CardTitle>
                  <CardDescription>Enter admin credentials to proceed.</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="password" className="flex items-center gap-2">
                              <KeyRound className="w-4 h-4"/>
                              <span>Admin Key</span>
                          </Label>
                          <Input 
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="************"
                              className="bg-background"
                          />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/80">
                          <LogIn className="mr-2 h-4 w-4" />
                          Authorize
                      </Button>
                  </form>
              </CardContent>
          </Card>
        ) : (
          <AdminDashboard />
        )
      ) : null}
    </div>
  );
}
