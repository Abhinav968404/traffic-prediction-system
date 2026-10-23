
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("MONGO_DB_NAME", "trafficPrediction")

if not mongo_uri:
    raise RuntimeError("MONGO_URI is missing from backend/.env")

client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)

try:
    collection = client[db_name]["traffics"]
    records = list(collection.find(
        {},
        {"_id": 0, "locationName": 1, "timestamp": 1, "currentSpeed": 1}
    ))

    df = pd.DataFrame(records)

    if df.empty:
        print("No traffic records found.")
    else:
        df["currentSpeed"] = pd.to_numeric(
            df["currentSpeed"], errors="coerce"
        )
        df["timestamp"] = pd.to_datetime(
            df["timestamp"], errors="coerce", utc=True
        )

        df = df.dropna(subset=["locationName"])
        report = []

        for location, group in df.groupby("locationName"):
            valid = group.dropna(subset=["currentSpeed", "timestamp"])
            unique_times = valid["timestamp"].nunique()

            report.append({
                "location": location,
                "total_records": len(group),
                "valid_speed_timestamp_records": len(valid),
                "unique_timestamps": unique_times,
                "enough_for_current_minimum": unique_times >= 30,
            })

        result = pd.DataFrame(report).sort_values(
            "unique_timestamps", ascending=False
        )
        output = ROOT / "ml" / "location_data_audit.csv"
        result.to_csv(output, index=False)

        print(f"Locations found: {len(result)}")
        print(f"Locations with 30+ unique timestamps: "
              f"{result['enough_for_current_minimum'].sum()}")
        print(result.to_string(index=False))
        print(f"\nReport saved to: {output}")

finally:
    client.close()
