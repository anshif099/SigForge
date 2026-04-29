import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import { Users, FileCode2, Wand2, TrendingUp, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SignForge" },
      { name: "description", content: "Signature analytics and team overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const employees = useStore((s) => s.employees);
  const templates = useStore((s) => s.templates);
  const generations = useStore((s) => s.generations);

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonth = generations
    .filter((g) => g.date.startsWith(monthPrefix))
    .reduce((sum, g) => sum + g.count, 0);
  const totalGen = generations.reduce((s, g) => s + g.count, 0);

  // Build last 14 days series
  const days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rec = generations.find((g) => g.date === key);
    days.push({ date: key.slice(5), count: rec?.count ?? 0 });
  }

  const stats = [
    { label: "Employees", value: employees.length, icon: Users, color: "var(--chart-1)" },
    { label: "Templates", value: templates.length, icon: FileCode2, color: "var(--chart-2)" },
    { label: "This Month", value: thisMonth, icon: TrendingUp, color: "var(--chart-3)" },
    { label: "All Time", value: totalGen, icon: Wand2, color: "var(--chart-4)" },
  ];
  const generateTarget = user ? "/generate" : "/auth";
  const templatesTarget = user ? "/templates" : "/auth";
  const employeesTarget = user ? "/employees" : "/auth";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div
          className="relative overflow-hidden rounded-lg p-8 text-white md:p-10"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-white/80">
              Signatures at scale
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Forge consistent email signatures for your entire team.
            </h1>
            <p className="mt-3 text-sm text-white/85 md:text-base">
              One template. Every employee. Zero manual HTML editing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to={generateTarget}>
                  Generate now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/45 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to={templatesTarget}>Manage templates</Link>
              </Button>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-white/10 [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)] md:block" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </span>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">{s.value}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4">Signatures generated — last 14 days</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Recent employees</h3>
            {employees.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No employees yet.
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link to={employeesTarget}>Add employees</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {employees.slice(-5).reverse().map((e) => (
                  <li key={e.id} className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {e.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.designation}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
