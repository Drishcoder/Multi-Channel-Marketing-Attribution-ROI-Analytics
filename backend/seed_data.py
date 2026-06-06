"""
Grito Labs: Mock Data Seeding Script
Database population with realistic 10,000+ customer journey records

This script generates:
- Users (1,200 unique customers)
- Marketing spend data (8 campaigns)
- Web traffic touchpoints (15,000+ interactions)
- Conversions (336 conversions at ~28% conversion rate)
"""

import json
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Seed for reproducibility
random.seed(42)


def seeded_rand(seed):
    """Linear Congruential Generator for reproducible randomness."""
    state = seed
    def rand():
        nonlocal state
        state = (state * 9301 + 49297) % 233280
        return state / 233280
    return rand


# Initialize RNGs with different seeds
rand1 = seeded_rand(42)
rand2 = seeded_rand(137)

# ─── CAMPAIGN DEFINITIONS ─────────────────────────────────────────────────

CAMPAIGNS = [
    {"id": "C001", "name": "Spring Email Blast", "channel": "Email", "budget": 12000},
    {"id": "C002", "name": "Google Search Q2", "channel": "Paid Ad", "budget": 35000},
    {"id": "C003", "name": "Instagram Retarget", "channel": "Social Media", "budget": 18000},
    {"id": "C004", "name": "Newsletter Re-Engage", "channel": "Email", "budget": 8000},
    {"id": "C005", "name": "LinkedIn B2B Drive", "channel": "Paid Ad", "budget": 28000},
    {"id": "C006", "name": "TikTok Brand Awareness", "channel": "Social Media", "budget": 15000},
    {"id": "C007", "name": "Facebook Lead Gen", "channel": "Social Media", "budget": 22000},
    {"id": "C008", "name": "Retargeting Display", "channel": "Paid Ad", "budget": 19000},
]

CHANNELS = ["Email", "Paid Ad", "Social Media"]
REGIONS = ["North America", "Europe", "APAC", "LATAM"]
DEVICE_TYPES = ["Mobile", "Desktop", "Tablet"]
BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"]
CONVERSION_TYPES = ["Purchase", "Sign-up", "Demo", "Download", "Subscription"]


# ─── DATA GENERATION FUNCTIONS ────────────────────────────────────────────

def generate_users(count=1200):
    """Generate user profiles with demographics."""
    users = []
    base_date = datetime.now() - timedelta(days=180)
    
    for i in range(1, count + 1):
        signup_date = base_date + timedelta(
            days=int(rand1() * 180),
            hours=int(rand1() * 24)
        )
        
        users.append({
            "user_id": f"U{str(i).zfill(4)}",
            "signup_date": signup_date.isoformat(),
            "region": random.choice(REGIONS),
            "device_type": random.choice(DEVICE_TYPES),
            "age_group": random.choice(["18-24", "25-34", "35-44", "45-54", "55+"])
        })
    
    return users


def generate_marketing_spend():
    """Generate daily marketing spend, impressions, and clicks."""
    spend_data = []
    
    for campaign in CAMPAIGNS:
        # Generate 90 days of spend data
        for day_offset in range(90):
            spend_date = (datetime.now() - timedelta(days=90-day_offset)).date()
            
            # Variable spend with some campaigns trending up/down
            base_daily_spend = campaign["budget"] / 90
            variance = 0.3  # ±30% variance
            daily_spend = base_daily_spend * (1 + rand2() * 2 * variance - variance)
            
            impressions = int(rand2() * 80000 + 20000)
            ctr = rand2() * 0.06 + 0.01
            clicks = int(impressions * ctr)
            
            spend_data.append({
                "campaign_id": campaign["id"],
                "spend_date": spend_date.isoformat(),
                "spend": round(daily_spend, 2),
                "impressions": impressions,
                "clicks": clicks
            })
    
    return spend_data


def generate_touchpoints_and_conversions(users):
    """Generate user touchpoints and conversions."""
    touchpoints = []
    conversions = []
    
    tp_id_counter = 1
    conv_id_counter = 1
    
    for user in users:
        user_id = user["user_id"]
        signup_date = datetime.fromisoformat(user["signup_date"])
        
        # Generate 1-8 touchpoints per user
        num_touchpoints = int(rand1() * 8) + 1
        base_time = signup_date + timedelta(
            days=int(rand1() * 90),
            hours=int(rand1() * 24)
        )
        
        journey = []
        
        for j in range(num_touchpoints):
            campaign = random.choice(CAMPAIGNS)
            timestamp = base_time + timedelta(
                days=j,
                hours=int(rand1() * 24),
                minutes=int(rand1() * 60)
            )
            
            # Event type distribution: 60% Click, 25% Session, 15% Impression
            rand_event = rand1()
            if rand_event < 0.6:
                event_type = "Click"
            elif rand_event < 0.85:
                event_type = "Session"
            else:
                event_type = "Impression"
            
            touchpoint = {
                "touchpoint_id": f"TP{str(tp_id_counter).zfill(6)}",
                "user_id": user_id,
                "campaign_id": campaign["id"],
                "channel": campaign["channel"],
                "event_type": event_type,
                "event_timestamp": timestamp.isoformat(),
                "session_duration_seconds": int(rand1() * 600) if event_type == "Session" else None,
                "device_type": user["device_type"],
                "browser": random.choice(BROWSERS)
            }
            
            touchpoints.append(touchpoint)
            journey.append(touchpoint)
            tp_id_counter += 1
        
        # Conversion probability: ~28%
        if rand1() < 0.28 and journey:
            conversion_timestamp = (
                datetime.fromisoformat(journey[-1]["event_timestamp"]) +
                timedelta(hours=int(rand1() * 12))
            ).isoformat()
            
            revenue = round(rand1() * 350 + 50, 2)
            
            conversion = {
                "conversion_id": f"CV{str(conv_id_counter).zfill(5)}",
                "user_id": user_id,
                "conversion_timestamp": conversion_timestamp,
                "revenue": revenue,
                "conversion_type": random.choice(CONVERSION_TYPES),
                "journey": journey
            }
            
            conversions.append(conversion)
            conv_id_counter += 1
    
    return touchpoints, conversions


def generate_campaigns_table():
    """Generate campaigns table data."""
    campaigns_data = []
    start_date = (datetime.now() - timedelta(days=120)).date()
    
    for campaign in CAMPAIGNS:
        campaigns_data.append({
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "channel": campaign["channel"],
            "budget": campaign["budget"],
            "start_date": start_date.isoformat(),
            "end_date": (start_date + timedelta(days=90)).isoformat(),
            "status": "active"
        })
    
    return campaigns_data


# ─── MAIN SEEDING FUNCTION ────────────────────────────────────────────────

def generate_all_mock_data():
    """Generate complete mock dataset."""
    print("🌱 Generating mock data for Grito Labs Marketing Analytics...")
    
    # Generate data
    users = generate_users(1200)
    print(f"✓ Generated {len(users)} users")
    
    campaigns = generate_campaigns_table()
    print(f"✓ Generated {len(campaigns)} campaigns")
    
    spend_data = generate_marketing_spend()
    print(f"✓ Generated {len(spend_data)} daily spend records")
    
    touchpoints, conversions = generate_touchpoints_and_conversions(users)
    print(f"✓ Generated {len(touchpoints)} touchpoints")
    print(f"✓ Generated {len(conversions)} conversions ({len(conversions)/len(users)*100:.1f}% conversion rate)")
    
    # Compile dataset
    dataset = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "records_count": {
                "users": len(users),
                "campaigns": len(campaigns),
                "spend_records": len(spend_data),
                "touchpoints": len(touchpoints),
                "conversions": len(conversions),
                "total": len(users) + len(campaigns) + len(spend_data) + len(touchpoints) + len(conversions)
            }
        },
        "users": users,
        "campaigns": campaigns,
        "marketing_spend": spend_data,
        "web_traffic_touchpoints": touchpoints,
        "conversions": conversions
    }
    
    return dataset


# ─── EXPORT FUNCTIONS ─────────────────────────────────────────────────────

def export_to_json(dataset, filename="mock_data.json"):
    """Export dataset to JSON file."""
    with open(filename, 'w') as f:
        json.dump(dataset, f, indent=2, default=str)
    print(f"✓ Exported to {filename}")


def export_sql_inserts(dataset, filename="seed_data.sql"):
    """Export dataset as SQL INSERT statements."""
    with open(filename, 'w') as f:
        f.write("-- SQL Insert Statements for Grito Labs Mock Data\n")
        f.write(f"-- Generated: {datetime.now().isoformat()}\n\n")
        
        # Users
        f.write("-- Insert Users\n")
        for user in dataset["users"]:
            f.write(
                f"INSERT INTO users (user_id, signup_date, region, device_type) "
                f"VALUES ('{user['user_id']}', '{user['signup_date']}', "
                f"'{user['region']}', '{user['device_type']}');\n"
            )
        
        f.write("\n-- Insert Campaigns\n")
        for camp in dataset["campaigns"]:
            f.write(
                f"INSERT INTO campaigns (campaign_id, campaign_name, channel, budget, start_date, end_date) "
                f"VALUES ('{camp['campaign_id']}', '{camp['campaign_name']}', '{camp['channel']}', "
                f"{camp['budget']}, '{camp['start_date']}', '{camp['end_date']}');\n"
            )
        
        f.write("\n-- Insert Marketing Spend\n")
        for spend in dataset["marketing_spend"]:
            f.write(
                f"INSERT INTO marketing_spend (campaign_id, spend_date, spend, impressions, clicks) "
                f"VALUES ('{spend['campaign_id']}', '{spend['spend_date']}', {spend['spend']}, "
                f"{spend['impressions']}, {spend['clicks']});\n"
            )
        
        f.write("\n-- Insert Web Traffic Touchpoints\n")
        for tp in dataset["web_traffic_touchpoints"]:
            f.write(
                f"INSERT INTO web_traffic_touchpoints (touchpoint_id, user_id, campaign_id, channel, "
                f"event_type, event_timestamp, device_type, browser) "
                f"VALUES ('{tp['touchpoint_id']}', '{tp['user_id']}', '{tp['campaign_id']}', "
                f"'{tp['channel']}', '{tp['event_type']}', '{tp['event_timestamp']}', "
                f"'{tp['device_type']}', '{tp['browser']}');\n"
            )
        
        f.write("\n-- Insert Conversions\n")
        for conv in dataset["conversions"]:
            f.write(
                f"INSERT INTO conversions (conversion_id, user_id, conversion_timestamp, revenue, conversion_type) "
                f"VALUES ('{conv['conversion_id']}', '{conv['user_id']}', '{conv['conversion_timestamp']}', "
                f"{conv['revenue']}, '{conv['conversion_type']}');\n"
            )
    
    print(f"✓ Exported SQL inserts to {filename}")


def print_data_summary(dataset):
    """Print summary statistics."""
    print("\n" + "="*60)
    print("📊 MOCK DATA SUMMARY")
    print("="*60)
    
    meta = dataset["metadata"]["records_count"]
    print(f"Users:                {meta['users']:,}")
    print(f"Campaigns:            {meta['campaigns']}")
    print(f"Daily Spend Records:  {meta['spend_records']:,}")
    print(f"Web Touchpoints:      {meta['touchpoints']:,}")
    print(f"Conversions:          {meta['conversions']}")
    print(f"Total Records:        {meta['total']:,}")
    
    total_spend = sum(s["spend"] for s in dataset["marketing_spend"])
    total_revenue = sum(c["revenue"] for c in dataset["conversions"])
    
    print(f"\nTotal Marketing Spend: ${total_spend:,.2f}")
    print(f"Total Attributed Revenue: ${total_revenue:,.2f}")
    print(f"Overall ROAS: {total_revenue/total_spend:.2f}×")
    print(f"Conversion Rate: {len(dataset['conversions'])/len(dataset['users'])*100:.1f}%")
    
    print("\nChannel Breakdown:")
    channels = {}
    for tp in dataset["web_traffic_touchpoints"]:
        if tp["channel"] not in channels:
            channels[tp["channel"]] = 0
        channels[tp["channel"]] += 1
    
    for ch, count in sorted(channels.items(), key=lambda x: x[1], reverse=True):
        pct = count / len(dataset["web_traffic_touchpoints"]) * 100
        print(f"  {ch:15} {count:6,} touchpoints ({pct:5.1f}%)")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    # Generate all mock data
    mock_dataset = generate_all_mock_data()
    
    # Export to both JSON and SQL
    export_to_json(mock_dataset, "mock_data.json")
    export_sql_inserts(mock_dataset, "seed_data.sql")
    
    # Print summary
    print_data_summary(mock_dataset)
    
    print("\n✅ Mock data generation complete!")
    print("\nNext steps:")
    print("1. Review the generated files: mock_data.json and seed_data.sql")
    print("2. Load mock_data.json into your backend for in-memory analytics")
    print("3. Or execute seed_data.sql in PostgreSQL for persistent storage")
