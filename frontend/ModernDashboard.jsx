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
      const n = journey.length;
      journey.forEach((tp, idx) => {
        let weight;
        if (n === 1) weight = 1;
        else if (n === 2) weight = 0.5;
        else {
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

// ─── ENHANCED CHART COMPONENTS ────────────────────────────────────────────────
function BarChart({ data, height = 220 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext("2d");

    chartRef.current = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: data.datasets.map((d) => ({
          ...d,
          borderRadius: 8,
          borderSkipped: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a1a2e",
            titleColor: "#00d4ff",
            bodyColor: "#fff",
            borderColor: "#00d4ff",
            borderWidth: 2,
            padding: 12,
            titleFont: { size: 14, weight: "bold" },
            bodyFont: { size: 12 },
            callbacks: {
              label: (ctx) => ` $${Math.round(ctx.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#888", font: { size: 12, weight: "500" } },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "#888",
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
      <canvas ref={canvasRef} />
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
          borderWidth: 3,
          borderColor: "#0f1419",
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a1a2e",
            titleColor: "#00d4ff",
            bodyColor: "#fff",
            borderColor: "#00d4ff",
            borderWidth: 2,
            padding: 12,
            callbacks: { label: (ctx) => ` ${ctx.label}: $${Math.round(ctx.raw).toLocaleString()}` },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── MODERN COLOR SCHEME ──────────────────────────────────────────────────────
const CHANNEL_COLORS = {
  Email: "#00d4ff",      // Cyan
  "Paid Ad": "#00ff88",  // Green
  "Social Media": "#ff6b6b",  // Red
};

const MODEL_COLORS = {
  first: "#00d4ff",
  last: "#00ff88",
  linear: "#ffd700",
};

const GRADIENT_BG = "linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)";
const CARD_BG = "linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(15,20,25,0.8) 100%)";
const ACCENT_GRADIENT = "linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)";

// ─── ENHANCED METRIC CARD ─────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, icon, trend }) {
  return (
    <div style={{
      background: CARD_BG,
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      border: `1px solid rgba(0,212,255,0.2)`,
      backdropFilter: "blur(10px)",
      transition: "all 0.3s ease",
      cursor: "pointer",
      transform: "translateY(0)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-8px)";
      e.currentTarget.style.borderColor = `${accent}66`;
      e.currentTarget.style.boxShadow = `0 20px 40px ${accent}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)";
      e.currentTarget.style.boxShadow = "none";
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</span>
        <div style={{ fontSize: 20, color: accent, opacity: 0.9 }}>📊</div>
      </div>
      <span style={{ fontSize: 32, fontWeight: 700, color: accent, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{sub}</span>}
      {trend && <span style={{ fontSize: 11, color: trend > 0 ? "#00ff88" : "#ff6b6b", fontWeight: 600 }}>
        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
      </span>}
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 24 }}>{icon}</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── MODERN TABS ──────────────────────────────────────────────────────────────
function Tabs({ options, value, onChange }) {
  return (
    <div style={{ 
      display: "flex", 
      gap: 4, 
      background: "rgba(26,26,46,0.5)",
      borderRadius: "12px", 
      padding: 4,
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(0,212,255,0.1)",
    }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          border: "none", 
          cursor: "pointer", 
          padding: "8px 16px",
          borderRadius: "10px", 
          fontSize: 12, 
          fontWeight: 600,
          transition: "all 0.2s ease",
          background: value === o.value ? ACCENT_GRADIENT : "transparent",
          color: value === o.value ? "#000" : "#888",
          boxShadow: value === o.value ? "0 8px 24px rgba(0,212,255,0.3)" : "none",
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

  const currentChannelData = useMemo(() => {
    const attr = computeAttribution(attributionModel).channelRevenue;
    return {
      labels: CHANNELS,
      values: CHANNELS.map((c) => Math.round(attr[c] || 0)),
      colors: CHANNELS.map((c) => CHANNEL_COLORS[c]),
    };
  }, [attributionModel]);

  const budgetRecs = useMemo(() => {
    const sorted = [...campaignKPIs].sort((a, b) => b.roas - a.roas);
    const avg = campaignKPIs.reduce((a, c) => a + c.roas, 0) / campaignKPIs.length;
    return sorted.map((c) => ({
      ...c,
      performance: c.roas > avg * 1.3 ? "high" : c.roas < avg * 0.7 ? "low" : "mid",
    }));
  }, [campaignKPIs]);

  const navItems = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "attribution", icon: "⚖️", label: "Attribution" },
    { id: "journeys", icon: "🛤️", label: "Journeys" },
    { id: "campaigns", icon: "📢", label: "Campaigns" },
    { id: "budget", icon: "💰", label: "Budget" },
  ];

  return (
    <div style={{ 
      fontFamily: "'Segoe UI', 'Roboto', sans-serif", 
      minHeight: "100vh", 
      background: GRADIENT_BG,
      color: "#fff",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: "fixed",
        top: "10%",
        left: "-5%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(40px)",
        pointerEvents: "none",
        animation: "float 6s ease-in-out infinite",
      }} />
      <div style={{
        position: "fixed",
        bottom: "10%",
        right: "-5%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(40px)",
        pointerEvents: "none",
        animation: "float 8s ease-in-out infinite reverse",
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(30px); }
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,212,255,0.5) transparent;
        }
        *::-webkit-scrollbar {
          width: 8px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(0,212,255,0.5);
          border-radius: 4px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(26,26,46,0.9) 0%, rgba(15,20,25,0.7) 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,212,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "12px",
            background: ACCENT_GRADIENT,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,212,255,0.3)",
          }}>
            📈
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>Grito Labs</div>
            <div style={{ fontSize: 12, color: "#888", letterSpacing: "0.05em" }}>MARKETING ANALYTICS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>Attribution model:</span>
          <Tabs
            value={attributionModel}
            onChange={setAttributionModel}
            options={[
              { value: "first", label: "First-Touch" },
              { value: "last", label: "Last-Touch" },
              { value: "linear", label: "Linear/U-Shaped" },
            ]}
          />
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{
        background: "rgba(26,26,46,0.5)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
        padding: "0 32px",
        display: "flex",
        gap: 0,
      }}>
        {navItems.map((n) => (
          <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "16px 20px", border: "none", cursor: "pointer",
            background: "transparent", fontSize: 14, fontWeight: 600,
            color: activeTab === n.id ? "#00d4ff" : "#888",
            borderBottom: activeTab === n.id ? "3px solid #00d4ff" : "3px solid transparent",
            transition: "all 0.3s ease",
          }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "40px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div>
            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
              <MetricCard label="Total Revenue" value={`$${Math.round(kpis.totalRevenue).toLocaleString()}`} sub="Attributed revenue" accent="#00d4ff" />
              <MetricCard label="Total Spend" value={`$${kpis.totalSpend.toLocaleString()}`} sub="All campaigns" accent="#00ff88" />
              <MetricCard label="ROAS" value={kpis.roas.toFixed(2) + "×"} sub="Return on ad spend" accent={kpis.roas > 2 ? "#00ff88" : "#ff6b6b"} />
              <MetricCard label="CAC" value={`$${Math.round(kpis.cac)}`} sub="Cost per acquisition" accent="#ffd700" />
              <MetricCard label="Conv. Rate" value={kpis.cr.toFixed(1) + "%"} sub={`${kpis.totalConversions} conversions`} accent="#ff6b6b" />
              <MetricCard label="CTR" value={kpis.ctr.toFixed(2) + "%"} sub="Click-through rate" accent="#a78bfa" />
            </div>

            {/* Charts Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
              {/* Revenue by Channel */}
              <div style={{ 
                background: CARD_BG, 
                borderRadius: "16px", 
                border: "1px solid rgba(0,212,255,0.2)",
                padding: "28px",
                backdropFilter: "blur(10px)",
              }}>
                <SectionHeader icon="🎯" title="Revenue by channel" />
                {chartLoaded && <DonutChart data={currentChannelData} height={200} />}
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
                  {CHANNELS.map((c) => (
                    <span key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: CHANNEL_COLORS[c] }} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Channel Metrics */}
              <div style={{ 
                background: CARD_BG, 
                borderRadius: "16px", 
                border: "1px solid rgba(0,212,255,0.2)",
                padding: "28px",
                backdropFilter: "blur(10px)",
              }}>
                <SectionHeader icon="⚡" title="Channel efficiency" />
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                  {CHANNELS.map((ch) => {
                    const chData = SPEND_DATA.filter((s) => s.channel === ch);
                    const spend = chData.reduce((a, c) => a + c.spend, 0);
                    const clicks = chData.reduce((a, c) => a + c.clicks, 0);
                    const imps = chData.reduce((a, c) => a + c.impressions, 0);
                    const ctr = imps > 0 ? (clicks / imps * 100).toFixed(2) : "0.00";
                    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : "0.00";
                    return (
                      <div key={ch} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "12px 16px", 
                        background: "rgba(0,0,0,0.3)", 
                        borderRadius: "12px",
                        border: `1px solid ${CHANNEL_COLORS[ch]}33`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHANNEL_COLORS[ch] }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{ch}</span>
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>CTR</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#00d4ff" }}>{ctr}%</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>CPC</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#00ff88" }}>${cpc}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Spend</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd700" }}>${(spend / 1000).toFixed(0)}k</div>
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
            <div style={{ 
              background: CARD_BG, 
              borderRadius: "16px", 
              border: "1px solid rgba(0,212,255,0.2)",
              padding: "28px",
              backdropFilter: "blur(10px)",
              marginBottom: 24,
            }}>
              <SectionHeader icon="⚖️" title="Attribution model comparison">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(MODEL_COLORS).map(([k, color]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                      {k === "first" ? "First-Touch" : k === "last" ? "Last-Touch" : "Linear/U-Shaped"}
                    </span>
                  ))}
                </div>
              </SectionHeader>
              {chartLoaded && <BarChart data={attributionChartData} height={300} />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { model: "first", label: "First-Touch", color: MODEL_COLORS.first, desc: "100% to first interaction", icon: "🎯" },
                { model: "last", label: "Last-Touch", color: MODEL_COLORS.last, desc: "100% to final interaction", icon: "🏁" },
                { model: "linear", label: "Linear/U-Shaped", color: MODEL_COLORS.linear, desc: "40/20/40 distribution", icon: "⚖️" },
              ].map((m) => (
                <div key={m.model} style={{
                  background: CARD_BG,
                  borderRadius: "16px",
                  border: attributionModel === m.model ? `2px solid ${m.color}` : "1px solid rgba(0,212,255,0.2)",
                  padding: "20px",
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onClick={() => setAttributionModel(m.model)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 12px 32px ${m.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: m.color }}>{m.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#888", margin: "8px 0", lineHeight: 1.5 }}>{m.desc}</p>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    {CHANNELS.map((ch) => {
                      const rev = Math.round(allModels[m.model][ch] || 0);
                      const total = Object.values(allModels[m.model]).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (rev / total * 100).toFixed(1) : "0.0";
                      return (
                        <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8 }}>
                          <span style={{ color: "#888" }}>{ch}</span>
                          <span style={{ fontWeight: 600, color: m.color }}>${rev.toLocaleString()} ({pct}%)</span>
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
            <div style={{ 
              background: CARD_BG, 
              borderRadius: "16px", 
              border: "1px solid rgba(0,212,255,0.2)",
              padding: "28px",
              backdropFilter: "blur(10px)",
              marginBottom: 24,
            }}>
              <SectionHeader icon="🛤️" title="Top conversion paths" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topPaths.map((p, i) => {
                  const steps = p.path.split(" → ");
                  const maxConv = topPaths[0].count;
                  const progress = (p.count / maxConv * 100);
                  return (
                    <div key={i} style={{
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      border: "1px solid rgba(0,212,255,0.1)",
                      display: "flex", alignItems: "center", gap: 16,
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#00d4ff", minWidth: 32, textAlign: "center" }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                          {steps.map((s, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "4px 10px",
                                borderRadius: "8px",
                                background: `${CHANNEL_COLORS[s]}33`,
                                color: CHANNEL_COLORS[s],
                              }}>{s}</span>
                              {si < steps.length - 1 && <span style={{ color: "#888" }}>→</span>}
                            </div>
                          ))}
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#888" }}>→ Convert</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: ACCENT_GRADIENT, borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#00ff88" }}>{p.count}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>conversions</div>
                        <div style={{ fontSize: 12, color: "#ffd700", fontWeight: 600 }}>${Math.round(p.revenue).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <div style={{ 
            background: CARD_BG, 
            borderRadius: "16px", 
            border: "1px solid rgba(0,212,255,0.2)",
            padding: "28px",
            backdropFilter: "blur(10px)",
            overflowX: "auto",
          }}>
            <SectionHeader icon="📢" title="Campaign performance" />
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,212,255,0.2)" }}>
                  {["Campaign", "Channel", "Spend", "Clicks", "CTR", "CPC", "Revenue", "ROAS"].map((h) => (
                    <th key={h} style={{ 
                      padding: "12px", 
                      textAlign: h === "Campaign" ? "left" : "right", 
                      fontWeight: 700, 
                      color: "#888", 
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...campaignKPIs].sort((a, b) => b.roas - a.roas).map((c) => {
                  const roasColor = c.roas > 2.5 ? "#00ff88" : c.roas < 1 ? "#ff6b6b" : "#ffd700";
                  return (
                    <tr key={c.campaignId} style={{ 
                      borderBottom: "1px solid rgba(0,212,255,0.1)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,212,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{c.campaignName}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: CHANNEL_COLORS[c.channel] }} />
                          {c.channel}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>${c.spend.toLocaleString()}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>{c.clicks.toLocaleString()}</td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#00d4ff", fontWeight: 600 }}>{c.ctr.toFixed(2)}%</td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#00ff88", fontWeight: 600 }}>${c.cpc.toFixed(2)}</td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#ffd700", fontWeight: 600 }}>${Math.round(c.attributedRevenue).toLocaleString()}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: roasColor }}>{c.roas.toFixed(2)}×</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── BUDGET TAB ── */}
        {activeTab === "budget" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {budgetRecs.map((c) => {
                const perfColor = c.performance === "high" ? "#00ff88" : c.performance === "low" ? "#ff6b6b" : "#ffd700";
                const perfBg = c.performance === "high" ? "rgba(0,255,136,0.1)" : c.performance === "low" ? "rgba(255,107,107,0.1)" : "rgba(255,215,0,0.1)";
                const perfLabel = c.performance === "high" ? "↑ High Performer" : c.performance === "low" ? "↓ Underperforming" : "→ On Target";
                
                return (
                  <div key={c.campaignId} style={{
                    background: CARD_BG,
                    borderRadius: "16px",
                    border: `1px solid ${perfColor}44`,
                    padding: "20px",
                    backdropFilter: "blur(10px)",
                    borderLeft: `4px solid ${perfColor}`,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = `0 16px 32px ${perfColor}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{c.campaignName}</span>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        padding: "4px 8px", 
                        borderRadius: "6px",
                        background: perfBg,
                        color: perfColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>{perfLabel}</span>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Spend</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>${c.spend.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>ROAS</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: perfColor }}>{c.roas.toFixed(2)}×</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>CAC</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>${Math.round(c.spend / (CONVERSIONS.filter(cv => cv.journey.some(t => t.campaignId === c.campaignId)).length || 1))}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Revenue</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#00ff88" }}>${Math.round(c.attributedRevenue).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
