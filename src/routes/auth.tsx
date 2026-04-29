import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Shield, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Account - SignForge" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, loginWithEmail, loginWithGoogle, logout, registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function runAuth(action: "login" | "register" | "google") {
    setBusy(true);
    try {
      if (action === "google") {
        await loginWithGoogle();
      } else if (action === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      toast.success("Signed in");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register or sign in to save employees, templates, company assets, and signature counts.
          </p>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Checking session...
            </div>
          ) : user ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-accent">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Shield className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {user.displayName || user.email || "Signed in user"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{user.uid}</div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await logout();
                  toast.success("Signed out");
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => runAuth("google")}
                disabled={busy}
              >
                <Shield className="h-4 w-4" /> Continue with Google
              </Button>

              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>
                <TabsContent value="login" className="mt-4">
                  <Button className="w-full" onClick={() => runAuth("login")} disabled={busy}>
                    <Mail className="h-4 w-4" /> Login
                  </Button>
                </TabsContent>
                <TabsContent value="register" className="mt-4">
                  <Button className="w-full" onClick={() => runAuth("register")} disabled={busy}>
                    <Mail className="h-4 w-4" /> Create account
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
