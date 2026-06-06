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

  if (rand() < 0.3) {
    const c = {
      id: `CONV${String(convId++).padStart(4, "0")}`,
      userId: user.id,
      timestamp: baseTime + rand() * numTouchpoints * 3600000 * 24,
      revenue: 50 + rand() * 300,
      journey: journey.map((tp) => tp.campaignId),
    };
    CONVERSIONS.push(c);
  }
});

// ─── ATTRIBUTION ENGINE (Phase 2) ──────────────────────────────────────────
const attributionModels = {
  first_touch: (journey) => {
    const first = journey[0];
    return { [first]: 1.0 };
  },
  last_touch: (journey) => {
    const last = journey[journey.length - 1];
    return { [last]: 1.0 };
  },
  linear: (journey) => {
    const weight = 1.0 / journey.length;
    const result = {};
    journey.forEach((id) => {
      result[id] = (result[id] || 0) + weight;
    });
    return result;
  },
};

// ─── KPI CALCULATIONS (Phase 3) ───────────────────────────────────────────
function calculateKPIs(model) {
  const attribution = attributionModels[model];
  const attributedRevenue = {};
  const touchpointsByChannel = {};
  const touchpointsByCampaign = {};
  let totalRevenue = 0;
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalSpend = 0;
  let uniqueUsers = new Set();

  CONVERSIONS.forEach((conv) => {
    uniqueUsers.add(conv.userId);
    const weights = attribution(conv.journey);
    Object.entries(weights).forEach(([campaignId, weight]) => {
      attributedRevenue[campaignId] = (attributedRevenue[campaignId] || 0) + conv.revenue * weight;
      totalRevenue += conv.revenue * weight;
    });
  });

  ALL_TOUCHPOINTS.forEach((tp) => {
    if (tp.eventType === "Click") totalClicks++;
    if (tp.eventType === "Impression") totalImpressions++;

    if (!touchpointsByChannel[tp.channel]) touchpointsByChannel[tp.channel] = [];
    touchpointsByChannel[tp.channel].push(tp);

    if (!touchpointsByCampaign[tp.campaignId]) touchpointsByCampaign[tp.campaignId] = [];
    touchpointsByCampaign[tp.campaignId].push(tp);
  });

  CAMPAIGNS.forEach((c) => {
    totalSpend += c.budget;
  });

  const divide = (num, den) => (den === 0 ? 0 : num / den);

  return {
    overview: {
      ctr: divide(totalClicks, totalImpressions) * 100,
      cpc: divide(totalSpend, totalClicks),
      cac: divide(totalSpend, CONVERSIONS.length),
      roas: divide(totalRevenue, totalSpend),
      cr: divide(CONVERSIONS.length, uniqueUsers.size) * 100,
      total_revenue: totalRevenue,
      total_spend: totalSpend,
      total_conversions: CONVERSIONS.length,
    },
    channels: Object.entries(touchpointsByChannel).reduce((acc, [channel, tps]) => {
      const clicks = tps.filter((tp) => tp.eventType === "Click").length;
      const impressions = tps.filter((tp) => tp.eventType === "Impression").length;
      const spend = (totalSpend / ALL_TOUCHPOINTS.length) * tps.length;
      const revenue = CAMPAIGNS.filter((c) => c.channel === channel).reduce((sum, c) => sum + (attributedRevenue[c.id] || 0), 0);
      return {
        ...acc,
        [channel]: {
          ctr: divide(clicks, impressions) * 100,
          cpc: divide(spend, clicks),
          cac: divide(spend, CONVERSIONS.filter((c) => c.journey.some((cid) => CAMPAIGNS.find((ca) => ca.id === cid)?.channel === channel)).length),
          roas: divide(revenue, spend),
          spend,
          revenue,
        },
      };
    }, {}),
    campaigns: CAMPAIGNS.map((c) => ({
      ...c,
      attributed_revenue: attributedRevenue[c.id] || 0,
      roas: divide(attributedRevenue[c.id] || 0, c.budget),
      touchpoints: (touchpointsByCampaign[c.id] || []).length,
      conversions: CONVERSIONS.filter((conv) => conv.journey.includes(c.id)).length,
    })),
  };
}

// ─── TOP CONVERSION PATHS (Phase 4) ─────────────────────────────────────
function getTopPaths() {
  const paths = {};
  CONVERSIONS.forEach((conv) => {
    const path = conv.journey
      .map((cid) => CAMPAIGNS.find((c) => c.id === cid)?.name || cid)
      .join(" → ");
    paths[path] = (paths[path] || 0) + 1;
  });
  return Object.entries(paths)
    .map(([path, count]) => ({
      path,
      count,
      revenue: (CONVERSIONS.filter((c) => c.journey.map((cid) => CAMPAIGNS.find((ca) => ca.id === cid)?.name).join(" → ") === path).reduce((sum, c) => sum + c.revenue, 0) / count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ─── MAIN DASHBOARD COMPONENT ────────────────────────────────────────────
export default function MarketingAnalyticsDashboard() {
  const [model, setModel] = useState("linear");
  const [sortBy, setSortBy] = useState("roas");
  const kpis = useMemo(() => calculateKPIs(model), [model]);
  const paths = useMemo(() => getTopPaths(), []);

  const styles = {
    container: { background: "#f5f7fa", minHeight: "100vh", padding: "20px", fontFamily: "system-ui, -apple-system" },
    header: { maxWidth: "1400px", margin: "0 auto", marginBottom: "30px" },
    title: { fontSize: "32px", fontWeight: "700", color: "#1a1a1a" },
    subtitle: { fontSize: "14px", color: "#666", marginTop: "5px" },
    controlsRow: { display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" },
    select: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", cursor: "pointer" },
    cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "30px" },
    card: { background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
    cardLabel: { fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px" },
    cardValue: { fontSize: "28px", fontWeight: "700", color: "#2c3e50" },
    chartContainer: { background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px" },
    chartTitle: { fontSize: "16px", fontWeight: "600", marginBottom: "15px" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    th: { textAlign: "left", padding: "12px", borderBottom: "2px solid #eee", fontWeight: "600", color: "#555" },
    td: { padding: "12px", borderBottom: "1px solid #eee" },
    rows: { background: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Grito Labs Marketing Analytics</h1>
        <p style={styles.subtitle}>Multi-Channel Attribution & ROI Analysis</p>
      </div>

      <div style={styles.controlsRow}>
        <label>Attribution Model: <select value={model} onChange={(e) => setModel(e.target.value)} style={styles.select}>
          <option value="linear">Linear (40/20/40)</option>
          <option value="first_touch">First-Touch</option>
          <option value="last_touch">Last-Touch</option>
        </select></label>
        <label>Sort By: <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
          <option value="roas">ROAS</option>
          <option value="revenue">Revenue</option>
          <option value="budget">Budget</option>
        </select></label>
      </div>

      <div style={styles.cardsGrid}>
        <div style={styles.card}><div style={styles.cardLabel}>CTR (%)</div><div style={styles.cardValue}>{kpis.overview.ctr.toFixed(2)}</div></div>
        <div style={styles.card}><div style={styles.cardLabel}>CPC ($)</div><div style={styles.cardValue}>${kpis.overview.cpc.toFixed(2)}</div></div>
        <div style={styles.card}><div style={styles.cardLabel}>CAC ($)</div><div style={styles.cardValue}>${kpis.overview.cac.toFixed(2)}</div></div>
        <div style={styles.card}><div style={styles.cardLabel}>ROAS</div><div style={styles.cardValue}>{kpis.overview.roas.toFixed(2)}x</div></div>
        <div style={styles.card}><div style={styles.cardLabel}>Conv. Rate (%)</div><div style={styles.cardValue}>{kpis.overview.cr.toFixed(2)}</div></div>
        <div style={styles.card}><div style={styles.cardLabel}>Total Revenue</div><div style={styles.cardValue}>${(kpis.overview.total_revenue / 1000).toFixed(1)}K</div></div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>🎯 Top 5 Conversion Paths</h2>
          <table style={styles.table}>
            <thead><tr style={{ background: "#f9f9f9" }}><th style={styles.th}>Customer Journey</th><th style={styles.th}>Conversions</th><th style={styles.th}>Avg Revenue</th></tr></thead>
            <tbody>{paths.map((p, i) => <tr key={i}><td style={styles.td}>{p.path}</td><td style={styles.td}>{p.count}</td><td style={styles.td}>${p.revenue.toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>

        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>📈 Campaign Performance</h2>
          <table style={styles.table}>
            <thead><tr style={{ background: "#f9f9f9" }}><th style={styles.th}>Campaign</th><th style={styles.th}>Channel</th><th style={styles.th}>Budget</th><th style={styles.th}>Revenue</th><th style={styles.th}>ROAS</th><th style={styles.th}>Conversions</th></tr></thead>
            <tbody>{kpis.campaigns.sort((a, b) => (sortBy === "roas" ? b.roas - a.roas : sortBy === "revenue" ? (b.attributed_revenue || 0) - (a.attributed_revenue || 0) : b.budget - a.budget)).map((c) => <tr key={c.id}><td style={styles.td}><strong>{c.name}</strong></td><td style={styles.td}>{c.channel}</td><td style={styles.td}>${c.budget.toLocaleString()}</td><td style={styles.td}>${(c.attributed_revenue || 0).toFixed(0)}</td><td style={styles.td}><span style={{ fontWeight: "600", color: c.roas > 1 ? "#27ae60" : "#e74c3c" }}>{c.roas.toFixed(2)}x</span></td><td style={styles.td}>{c.conversions}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
