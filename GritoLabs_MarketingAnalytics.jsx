import { useState, useMemo, useRef, useEffect } from "react";

// ─── MOCK DATA GENERATION (Phase 1) ───────────────────────────────────────────
const CHANNELS = ["Email", "Paid Ad", "Social Media"];
const CAMPAIGNS = [
  { id: "C001", name: "Spring Email Blast", channel: "Email", budget: 12000 },
  { id: "C002", name: "Google Search Q2", channel: "Paid Ad", budget: 35000 },
  { id: "C003", name: "Instagram Retarget", channel: "Social Media", budget: 18000 },
  { id: "C004", name: "Newsletter Re-Engage", channel: "Email", budget: 8000 },
  { id: "C005", name: "LinkedIn B2B Drive", channel: "Paid Ad", budget: 28000 },
  { id: "C006", name: "TikTok Brand Awareness", channel: "Social Media", budget: 15000 },
  { id: "C007", name: "Facebook Lead Gen", channel: "Social Media", budget: 22000 },
  { id: "C008", name: "Retargeting Display", channel: "Paid Ad", budget: 19000 },
];

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

const rand = seededRand(42);
const rand2 = seededRand(137);

// Generate 10,000+ touchpoints
const ALL_TOUCHPOINTS = [];
const CONVERSIONS = [];
const USERS = Array.from({ length: 1200 }, (_, i) => ({ id: `U${String(i + 1).padStart(4, "0")}` }));

let tpId = 1;
let convId = 1;

USERS.forEach((user) => {
  const numTouchpoints = Math.floor(rand() * 8) + 1;
  const baseTime = Date.now() - rand() * 90 * 24 * 3600 * 1000;
  const journey = [];

  for (let j = 0; j < numTouchpoints; j++) {
    const campaign = CAMPAIGNS[Math.floor(rand() * CAMPAIGNS.length)];
    const ts = baseTime + j * (rand() * 3600000 * 24);
    const eventType = rand() < 0.6 ? "Click" : rand() < 0.5 ? "Impression" : "Session";
    const tp = {
      id: `TP${String(tpId++).padStart(5, "0")}`,
      userId: user.id,
      timestamp: ts,
      campaignId: campaign.id,
      channel: campaign.channel,
      eventType,
    };
    ALL_TOUCHPOINTS.push(tp);
    journey.push(tp);
  }

  const converted = rand() < 0.28;
  if (converted && journey.length > 0) {
    const revenue = Math.round((rand() * 350 + 50) * 100) / 100;
    CONVERSIONS.push({
      id: `CV${String(convId++).padStart(4, "0")}`,
      userId: user.id,
      timestamp: journey[journey.length - 1].timestamp + rand() * 3600000,
      revenue,
      journey: journey.map((t) => ({ ...t })),
    });
  }
});

// Marketing spend per campaign (Phase 1)
const SPEND_DATA = CAMPAIGNS.map((c) => {
  const impressions = Math.round(rand2() * 80000 + 20000);
  const ctr = rand2() * 0.06 + 0.01;
  const clicks = Math.round(impressions * ctr);
  return {
    campaignId: c.id,
    campaignName: c.name,
    channel: c.channel,
    spend: c.budget,
    impressions,
    clicks,
  };
});

// ─── ATTRIBUTION ENGINE (Phase 2) ─────────────────────────────────────────────
function computeAttribution(model) {
  const channelRevenue = { Email: 0, "Paid Ad": 0, "Social Media": 0 };
  const campaignRevenue = {};

  CONVERSIONS.forEach((conv) => {
    const journey = conv.journey.filter((t) => t.eventType !== "Impression");
    if (!journey.length) return;

    if (model === "first") {
      const tp = journey[0];
      channelRevenue[tp.channel] = (channelRevenue[tp.channel] || 0) + conv.revenue;
      campaignRevenue[tp.campaignId] = (campaignRevenue[tp.campaignId] || 0) + conv.revenue;
    } else if (model === "last") {
      const tp = journey[journey.length - 1];
      channelRevenue[tp.channel] = (channelRevenue[tp.channel] || 0) + conv.revenue;
      campaignRevenue[tp.campaignId] = (campaignRevenue[tp.campaignId] || 0) + conv.revenue;
    } else {
      // Linear / U-Shaped
      const n = journey.length;
      journey.forEach((tp, idx) => {
        let weight;
        if (n === 1) {
          weight = 1;
        } else if (n === 2) {
          weight = 0.5;
        } else {
          // U-Shaped: 40% first, 40% last, 20% split among middle
          if (idx === 0 || idx === n - 1) weight = 0.4;
          else weight = 0.2 / (n - 2);
        }
        const credit = conv.revenue * weight;
        channelRevenue[tp.channel] = (channelRevenue[tp.channel] || 0) + credit;
        campaignRevenue[tp.campaignId] = (campaignRevenue[tp.campaignId] || 0) + credit;
      });
    }
  });

  return { channelRevenue, campaignRevenue };
}

// ─── KPI ENGINE (Phase 3) ─────────────────────────────────────────────────────
function computeKPIs(attributionModel) {
  const { campaignRevenue } = computeAttribution(attributionModel);
  const uniqueVisitors = USERS.length;
  const totalConversions = CONVERSIONS.length;
  const totalRevenue = Object.values(campaignRevenue).reduce((a, b) => a + b, 0);
  const totalSpend = SPEND_DATA.reduce((a, c) => a + c.spend, 0);
  const totalClicks = SPEND_DATA.reduce((a, c) => a + c.clicks, 0);
  const totalImpressions = SPEND_DATA.reduce((a, c) => a + c.impressions, 0);

  return {
    ctr: totalClicks / totalImpressions * 100,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cac: totalConversions > 0 ? totalSpend / totalConversions : 0,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    cr: totalConversions / uniqueVisitors * 100,
    totalRevenue,
    totalSpend,
    totalConversions,
  };
}

function computeCampaignKPIs(attributionModel) {
  const { campaignRevenue } = computeAttribution(attributionModel);
  return SPEND_DATA.map((s) => {
    const rev = campaignRevenue[s.campaignId] || 0;
    const roas = s.spend > 0 ? rev / s.spend : 0;
    const cpc = s.clicks > 0 ? s.spend / s.clicks : 0;
    const ctr = s.impressions > 0 ? s.clicks / s.impressions * 100 : 0;
    return { ...s, attributedRevenue: rev, roas, cpc, ctr };
  });
}

// ─── JOURNEY PATHS (Phase 4) ─────────────────────────────────────────────────
function computeTopPaths() {
  const pathCount = {};
  CONVERSIONS.forEach((conv) => {
    const path = conv.journey.map((t) => t.channel).join(" → ");
    pathCount[path] = (pathCount[path] || { count: 0, revenue: 0 });
    pathCount[path].count += 1;
    pathCount[path].revenue += conv.revenue;
  });
  return Object.entries(pathCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([path, data]) => ({ path, ...data }));
}

// ─── CHART COMPONENT ──────────────────────────────────────────────────────────
function BarChart({ data, height = 220 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext("2d");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    const tickColor = isDark ? "#888" : "#666";

    chartRef.current = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: data.datasets.map((d) => ({
          ...d,
          borderRadius: 4,
          borderSkipped: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            titleColor: isDark ? "#e0e0e0" : "#111",
            bodyColor: isDark ? "#aaa" : "#555",
            borderColor: isDark ? "#333" : "#e0e0e0",
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` $${Math.round(ctx.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tickColor, font: { size: 12 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              font: { size: 11 },
              callback: (v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v),
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <canvas ref={canvasRef} role="img" aria-label="Attribution comparison bar chart" />
    </div>
  );
}

function DonutChart({ data, height = 180 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.colors,
          borderWidth: 2,
          borderColor: "transparent",
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: $${Math.round(ctx.raw).toLocaleString()}` },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <canvas ref={canvasRef} role="img" aria-label="Channel revenue donut chart" />
    </div>
  );
}

// ─── CHANNEL COLORS ───────────────────────────────────────────────────────────
const CHANNEL_COLORS = {
  Email: "#378ADD",
  "Paid Ad": "#1D9E75",
  "Social Media": "#D85A30",
};

const MODEL_COLORS = {
  first: "#378ADD",
  last: "#1D9E75",
  linear: "#7F77DD",
};

// ─── METRIC CARD ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
        <i className={`ti ti-${icon}`} style={{ fontSize: 16, color: accent, opacity: 0.7 }} aria-hidden="true" />
      </div>
      <span style={{ fontSize: 26, fontWeight: 500, color: accent || "var(--color-text-primary)", lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{sub}</span>}
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 18, color: "var(--color-text-secondary)" }} aria-hidden="true" />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px",
      borderRadius: "var(--border-radius-md)",
      background: bg, color,
    }}>{label}</span>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function Tabs({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: 3 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          border: "none", cursor: "pointer", padding: "5px 12px",
          borderRadius: "var(--border-radius-md)", fontSize: 12, fontWeight: 500,
          transition: "all 0.15s",
          background: value === o.value ? "var(--color-background-primary)" : "transparent",
          color: value === o.value ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          boxShadow: value === o.value ? "0 0.5px 2px rgba(0,0,0,0.12)" : "none",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [attributionModel, setAttributionModel] = useState("linear");
  const [activeTab, setActiveTab] = useState("overview");
  const [chartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    if (window.Chart) { setChartLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => setChartLoaded(true);
    document.head.appendChild(script);
  }, []);

  const kpis = useMemo(() => computeKPIs(attributionModel), [attributionModel]);
  const campaignKPIs = useMemo(() => computeCampaignKPIs(attributionModel), [attributionModel]);
  const topPaths = useMemo(() => computeTopPaths(), []);

  // Attribution comparison data
  const allModels = useMemo(() => {
    const first = computeAttribution("first").channelRevenue;
    const last = computeAttribution("last").channelRevenue;
    const linear = computeAttribution("linear").channelRevenue;
    return { first, last, linear };
  }, []);

  const attributionChartData = useMemo(() => ({
    labels: CHANNELS,
    datasets: [
      { label: "First-Touch", data: CHANNELS.map((c) => Math.round(allModels.first[c] || 0)), backgroundColor: MODEL_COLORS.first },
      { label: "Last-Touch", data: CHANNELS.map((c) => Math.round(allModels.last[c] || 0)), backgroundColor: MODEL_COLORS.last },
      { label: "Linear/U-Shaped", data: CHANNELS.map((c) => Math.round(allModels.linear[c] || 0)), backgroundColor: MODEL_COLORS.linear },
    ],
  }), [allModels]);

  // Current model channel breakdown
  const currentChannelData = useMemo(() => {
    const attr = computeAttribution(attributionModel).channelRevenue;
    return {
      labels: CHANNELS,
      values: CHANNELS.map((c) => Math.round(attr[c] || 0)),
      colors: CHANNELS.map((c) => CHANNEL_COLORS[c]),
    };
  }, [attributionModel]);

  // Budget optimization
  const budgetRecs = useMemo(() => {
    const sorted = [...campaignKPIs].sort((a, b) => b.roas - a.roas);
    const avg = campaignKPIs.reduce((a, c) => a + c.roas, 0) / campaignKPIs.length;
    return sorted.map((c) => ({
      ...c,
      performance: c.roas > avg * 1.3 ? "high" : c.roas < avg * 0.7 ? "low" : "mid",
      recommendation: c.roas > avg * 1.3
        ? `↑ Increase budget by ${Math.round((c.roas / avg - 1) * 40)}%`
        : c.roas < avg * 0.7
        ? `↓ Reduce budget by ${Math.round((1 - c.roas / avg) * 40)}%`
        : "→ Maintain current allocation",
    }));
  }, [campaignKPIs]);

  const navItems = [
    { id: "overview", icon: "layout-dashboard", label: "Overview" },
    { id: "attribution", icon: "git-compare", label: "Attribution" },
    { id: "journeys", icon: "route", label: "Journeys" },
    { id: "campaigns", icon: "speakerphone", label: "Campaigns" },
    { id: "budget", icon: "coin", label: "Budget Optimizer" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      {/* Header */}
      <div style={{
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "var(--border-radius-md)",
            background: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-trending-up" style={{ fontSize: 16, color: "#fff" }} aria-hidden="true" />
          </div>
          <span style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>Grito Labs</span>
          <span style={{ color: "var(--color-border-primary)", fontSize: 14 }}>|</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Marketing Analytics</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Attribution model:</span>
          <Tabs
            value={attributionModel}
            onChange={setAttributionModel}
            options={[
              { value: "first", label: "First-Touch" },
              { value: "last", label: "Last-Touch" },
              { value: "linear", label: "Linear / U-Shaped" },
            ]}
          />
        </div>
      </div>

      {/* Nav */}
      <div style={{
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 24px",
        display: "flex",
        gap: 2,
      }}>
        {navItems.map((n) => (
          <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 14px", border: "none", cursor: "pointer",
            background: "transparent", fontSize: 13, fontWeight: 500,
            color: activeTab === n.id ? "#185FA5" : "var(--color-text-secondary)",
            borderBottom: activeTab === n.id ? "2px solid #185FA5" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            <i className={`ti ti-${n.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
            {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="sr-only">Grito Labs Multi-Channel Marketing Analytics Dashboard</h2>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div>
            {/* Hero KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <MetricCard label="Total Revenue" value={`$${Math.round(kpis.totalRevenue).toLocaleString()}`} sub="Attributed revenue" accent="#185FA5" icon="currency-dollar" />
              <MetricCard label="Total Spend" value={`$${kpis.totalSpend.toLocaleString()}`} sub="All campaigns" accent="#0F6E56" icon="cash" />
              <MetricCard label="ROAS" value={kpis.roas.toFixed(2) + "×"} sub="Return on ad spend" accent={kpis.roas > 2 ? "#0F6E56" : "#993C1D"} icon="chart-line" />
              <MetricCard label="CAC" value={`$${Math.round(kpis.cac)}`} sub="Cost per acquisition" accent="#534AB7" icon="users" />
              <MetricCard label="Conv. Rate" value={kpis.cr.toFixed(1) + "%"} sub={`${kpis.totalConversions} conversions`} accent="#993C1D" icon="target" />
              <MetricCard label="CTR" value={kpis.ctr.toFixed(2) + "%"} sub="Click-through rate" accent="#884F0B" icon="cursor-text" />
            </div>

            {/* Two-column */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Channel Revenue Donut */}
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem" }}>
                <SectionHeader icon="chart-donut-3" title="Revenue by channel" />
                {chartLoaded && <DonutChart data={currentChannelData} height={180} />}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
                  {CHANNELS.map((c) => (
                    <span key={c} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: CHANNEL_COLORS[c] }} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* CPC / CTR by channel */}
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem" }}>
                <SectionHeader icon="chart-bar" title="Channel efficiency metrics" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {CHANNELS.map((ch) => {
                    const chData = SPEND_DATA.filter((s) => s.channel === ch);
                    const spend = chData.reduce((a, c) => a + c.spend, 0);
                    const clicks = chData.reduce((a, c) => a + c.clicks, 0);
                    const imps = chData.reduce((a, c) => a + c.impressions, 0);
                    const ctr = imps > 0 ? (clicks / imps * 100).toFixed(2) : "0.00";
                    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : "0.00";
                    return (
                      <div key={ch} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHANNEL_COLORS[ch] }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{ch}</span>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>CTR</div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{ctr}%</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>CPC</div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>${cpc}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Spend</div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>${(spend / 1000).toFixed(0)}k</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ATTRIBUTION TAB ── */}
        {activeTab === "attribution" && (
          <div>
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
              <SectionHeader icon="git-compare" title="Attribution model comparison — all three models side by side">
                <div style={{ display: "flex", gap: 12 }}>
                  {Object.entries(MODEL_COLORS).map(([k, color]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                      {k === "first" ? "First-Touch" : k === "last" ? "Last-Touch" : "Linear/U-Shaped"}
                    </span>
                  ))}
                </div>
              </SectionHeader>
              {chartLoaded && <BarChart data={attributionChartData} height={260} />}
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "12px 0 0" }}>
                Grouped bars show attributed revenue ($) per channel under each model. U-shaped/linear distributes credit across the full journey, reducing single-touch bias.
              </p>
            </div>

            {/* Model Explainer Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { model: "first", label: "First-Touch", color: MODEL_COLORS.first, desc: "100% credit to the first interaction. Best for evaluating top-of-funnel discovery channels.", icon: "player-skip-back" },
                { model: "last", label: "Last-Touch", color: MODEL_COLORS.last, desc: "100% credit to the interaction immediately before conversion. Best for closing-channel analysis.", icon: "player-skip-forward" },
                { model: "linear", label: "Linear / U-Shaped", color: MODEL_COLORS.linear, desc: "40% first, 40% last, 20% distributed among middle touchpoints. Balanced multi-touch view.", icon: "chart-area" },
              ].map((m) => (
                <div key={m.model} style={{
                  background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
                  border: attributionModel === m.model ? `2px solid ${m.color}` : "0.5px solid var(--color-border-tertiary)",
                  padding: "1rem 1.25rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <i className={`ti ti-${m.icon}`} style={{ fontSize: 18, color: m.color }} aria-hidden="true" />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{m.label}</span>
                    {attributionModel === m.model && <Badge label="Active" color={m.color} bg={m.color + "20"} />}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>{m.desc}</p>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    {CHANNELS.map((ch) => {
                      const rev = Math.round(allModels[m.model][ch] || 0);
                      const total = Object.values(allModels[m.model]).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (rev / total * 100).toFixed(1) : "0.0";
                      return (
                        <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>{ch}</span>
                          <span style={{ fontWeight: 500 }}>${rev.toLocaleString()} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>({pct}%)</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── JOURNEYS TAB ── */}
        {activeTab === "journeys" && (
          <div>
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
              <SectionHeader icon="route" title="Top 5 high-impact conversion paths" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topPaths.map((p, i) => {
                  const steps = p.path.split(" → ");
                  const maxConv = topPaths[0].count;
                  return (
                    <div key={i} style={{
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 16,
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-secondary)", minWidth: 24, textAlign: "center" }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                          {steps.map((s, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{
                                fontSize: 12, fontWeight: 500, padding: "3px 10px",
                                borderRadius: "var(--border-radius-md)",
                                background: CHANNEL_COLORS[s] + "22",
                                color: CHANNEL_COLORS[s],
                              }}>{s}</span>
                              {si < steps.length - 1 && <i className="ti ti-arrow-right" style={{ fontSize: 12, color: "var(--color-text-secondary)" }} aria-hidden="true" />}
                            </div>
                          ))}
                          <span style={{ marginLeft: 4, fontSize: 12, color: "var(--color-text-secondary)" }}>→ Conversion</span>
                        </div>
                        <div style={{ height: 4, background: "var(--color-border-tertiary)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(p.count / maxConv * 100).toFixed(0)}%`, background: "#185FA5", borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 90 }}>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{p.count}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>conversions</div>
                        <div style={{ fontSize: 13, color: "#0F6E56", fontWeight: 500 }}>${Math.round(p.revenue).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Journey Stats Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <MetricCard label="Total Conversions" value={CONVERSIONS.length.toLocaleString()} sub="Completed journeys" accent="#185FA5" icon="check-circle" />
              <MetricCard label="Total Touchpoints" value={ALL_TOUCHPOINTS.length.toLocaleString()} sub="Across all channels" accent="#534AB7" icon="hand-click" />
              <MetricCard label="Avg Touchpoints" value={(ALL_TOUCHPOINTS.length / USERS.length).toFixed(1)} sub="Per user before convert" accent="#0F6E56" icon="route" />
              <MetricCard label="Users Tracked" value={USERS.length.toLocaleString()} sub="Unique identities" accent="#884F0B" icon="users" />
            </div>
          </div>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem" }}>
            <SectionHeader icon="speakerphone" title="Campaign performance table" />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {["Campaign", "Channel", "Spend", "Clicks", "Impr.", "CTR", "CPC", "Rev (attr.)", "ROAS"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Campaign" || h === "Channel" ? "left" : "right", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...campaignKPIs].sort((a, b) => b.roas - a.roas).map((c) => {
                    const roasColor = c.roas > 2.5 ? "#0F6E56" : c.roas < 1 ? "#A32D2D" : "var(--color-text-primary)";
                    return (
                      <tr key={c.campaignId} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        <td style={{ padding: "9px 10px", fontWeight: 500 }}>{c.campaignName}</td>
                        <td style={{ padding: "9px 10px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_COLORS[c.channel] }} />
                            {c.channel}
                          </span>
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>${c.spend.toLocaleString()}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>{c.clicks.toLocaleString()}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>{(c.impressions / 1000).toFixed(0)}k</td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>{c.ctr.toFixed(2)}%</td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>${c.cpc.toFixed(2)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right" }}>${Math.round(c.attributedRevenue).toLocaleString()}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 500, color: roasColor }}>{c.roas.toFixed(2)}×</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BUDGET OPTIMIZER TAB ── */}
        {activeTab === "budget" && (
          <div>
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
              <SectionHeader icon="coin" title="Budget optimization recommendations" />
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
                Campaigns with ROAS &gt; 1.3× average flagged as high-performing (↑ increase budget). Campaigns below 0.7× average flagged as underperforming (↓ reduce budget).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {budgetRecs.map((c) => {
                  const perfColor = c.performance === "high" ? "#0F6E56" : c.performance === "low" ? "#A32D2D" : "#185FA5";
                  const perfBg = c.performance === "high" ? "#E1F5EE" : c.performance === "low" ? "#FCEBEB" : "#E6F1FB";
                  const perfLabel = c.performance === "high" ? "High performer" : c.performance === "low" ? "Underperforming" : "On target";
                  return (
                    <div key={c.campaignId} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-md)",
                      borderLeft: `3px solid ${perfColor}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 500, fontSize: 14 }}>{c.campaignName}</span>
                          <Badge label={perfLabel} color={perfColor} bg={perfBg} />
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
                          <span>Spend: <b style={{ color: "var(--color-text-primary)" }}>${c.spend.toLocaleString()}</b></span>
                          <span>ROAS: <b style={{ color: perfColor }}>{c.roas.toFixed(2)}×</b></span>
                          <span>CAC: <b style={{ color: "var(--color-text-primary)" }}>${Math.round(c.spend / (CONVERSIONS.filter(cv => cv.journey.some(t => t.campaignId === c.campaignId)).length || 1))}</b></span>
                          <span>Rev: <b style={{ color: "var(--color-text-primary)" }}>${Math.round(c.attributedRevenue).toLocaleString()}</b></span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: perfColor }}>{c.recommendation}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          {c.performance === "high" ? `Estimated ROI uplift: +${Math.round(c.roas * 0.8 * 1000) / 1000}×` :
                           c.performance === "low" ? `Potential saving: $${Math.round(c.spend * 0.4).toLocaleString()}` :
                           "Balanced spend-to-return ratio"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary recs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "High performers", count: budgetRecs.filter(r => r.performance === "high").length, color: "#0F6E56", bg: "#E1F5EE", icon: "trending-up", sub: "Increase allocation" },
                { label: "On target", count: budgetRecs.filter(r => r.performance === "mid").length, color: "#185FA5", bg: "#E6F1FB", icon: "minus", sub: "Maintain allocation" },
                { label: "Underperforming", count: budgetRecs.filter(r => r.performance === "low").length, color: "#A32D2D", bg: "#FCEBEB", icon: "trending-down", sub: "Reduce allocation" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <i className={`ti ti-${s.icon}`} style={{ fontSize: 18, color: s.color }} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
