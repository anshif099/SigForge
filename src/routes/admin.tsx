import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { onValue, ref } from "firebase/database";
import { ShieldCheck, Users, Wand2, FileCode2, LogOut } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { database } from "@/lib/firebase";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin - SignForge" }] }),
  component: AdminPage,
});

const ADMIN_EMAIL = "admin@signforge.com";
const ADMIN_PASSWORD = "SignForge@2026";

interface UserRecord {
  profile?: {
    uid?: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    providerId?: string;
    lastLoginAt?: number;
    lastSyncedAt?: number;
  };
  metrics?: {
    employeesCount?: number;
    templatesCount?: number;
    thisMonthCount?: number;
    totalGenerations?: number;
    updatedAt?: number;
  };
  generationsByDate?: Record<string, number>;
}

interface UserView {
  uid: string;
  email: string;
  name: string;
  provider: string;
  employeesCount: number;
  templatesCount: number;
  thisMonthCount: number;
  totalGenerations: number;
  updatedAt: number;
  chart: Array<{ date: string; count: number }>;
  metricChart: Array<{ label: string; value: number }>;
}

function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState<Record<string, UserRecord>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("signforge-admin") === "1");
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    if (!database) {
      setError("Firebase Realtime Database is not available in this environment.");
      return;
    }

    return onValue(
      ref(database, "users"),
      (snapshot) => {
        setRecords(snapshot.val() ?? {});
        setError("");
      },
      (readError) => {
        setError(readError.message);
      },
    );
  }, [isAdmin]);

  const users = useMemo<UserView[]>(() => {
    return Object.entries(records)
      .map(([uid, record]) => {
        const generationsByDate = record.generationsByDate ?? {};
        const chart = Object.entries(generationsByDate)
          .map(([date, count]) => ({ date, count: Number(count) || 0 }))
          .sort((a, b) => a.date.localeCompare(b.date));
        const employeesCount = record.metrics?.employeesCount ?? 0;
        const templatesCount = record.metrics?.templatesCount ?? 0;
        const thisMonthCount = record.metrics?.thisMonthCount ?? 0;
        const totalGenerations = record.metrics?.totalGenerations ?? 0;

        return {
          uid,
          email: record.profile?.email || "No email",
          name: record.profile?.displayName || record.profile?.email || "Registered user",
          provider: record.profile?.providerId || "password",
          employeesCount,
          templatesCount,
          thisMonthCount,
          totalGenerations,
          updatedAt: record.metrics?.updatedAt ?? record.profile?.lastSyncedAt ?? 0,
          chart,
          metricChart: [
            { label: "Employees", value: employeesCount },
            { label: "Templates", value: templatesCount },
            { label: "Month", value: thisMonthCount },
            { label: "All time", value: totalGenerations },
          ],
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [records]);

  const totals = useMemo(() => {
    return users.reduce(
      (sum, user) => ({
        employees: sum.employees + user.employeesCount,
        templates: sum.templates + user.templatesCount,
        thisMonth: sum.thisMonth + user.thisMonthCount,
        generations: sum.generations + user.totalGenerations,
      }),
      { employees: 0, templates: 0, thisMonth: 0, generations: 0 },
    );
  }, [users]);

  const totalDataChart = useMemo(
    () => [
      { label: "Accounts", value: users.length },
      { label: "Employees", value: totals.employees },
      { label: "Templates", value: totals.templates },
      { label: "This Month", value: totals.thisMonth },
      { label: "All Time", value: totals.generations },
    ],
    [totals.employees, totals.generations, totals.templates, totals.thisMonth, users.length],
  );

  const totalChart = useMemo(() => {
    const byDate = new Map<string, number>();

    for (const user of users) {
      for (const point of user.chart) {
        byDate.set(point.date, (byDate.get(point.date) ?? 0) + point.count);
      }
    }

    return Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [users]);

  function login() {
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem("signforge-admin", "1");
      setIsAdmin(true);
      setPassword("");
      setError("");
    } else {
      setError("Invalid admin email or password.");
    }
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Login with the hard-coded admin credentials.
            </p>
          </div>
          <Card className="space-y-4 p-6">
            <div>
              <Label>Admin email</Label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <Label>Admin password</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") login();
                }}
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button className="w-full" onClick={login}>
              <ShieldCheck className="h-4 w-4" /> Open admin panel
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Registered accounts, individual counts, and total generation analytics.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem("signforge-admin");
              setIsAdmin(false);
            }}
          >
            <LogOut className="h-4 w-4" /> Admin logout
          </Button>
        </div>

        {error && <Card className="p-4 text-sm text-destructive">{error}</Card>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Accounts" value={users.length} icon={Users} />
          <StatCard label="Employees" value={totals.employees} icon={Users} />
          <StatCard label="Templates" value={totals.templates} icon={FileCode2} />
          <StatCard label="This Month" value={totals.thisMonth} icon={Wand2} />
          <StatCard label="All Time" value={totals.generations} icon={Wand2} />
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">All data overview</h3>
            <span className="text-xs text-muted-foreground">{users.length} accounts</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalDataChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {totalChart.length > 0 && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Total generated signatures</h3>
              <span className="text-xs text-muted-foreground">{totalChart.length} active days</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((user) => (
            <Card key={user.uid} className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{user.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.uid}</p>
                </div>
                <span className="rounded-md bg-accent px-2 py-1 text-[11px] text-accent-foreground">
                  {user.provider}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Employees" value={user.employeesCount} />
                <MiniStat label="Templates" value={user.templatesCount} />
                <MiniStat label="Month" value={user.thisMonthCount} />
                <MiniStat label="All time" value={user.totalGenerations} />
              </div>

              <div className="h-36">
                {user.chart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={user.chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={user.metricChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={9} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
