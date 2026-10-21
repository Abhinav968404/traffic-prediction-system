 
import os
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

# Paths and MongoDB settings
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "trafficPrediction")
COLLECTION_NAME = "traffics"

MODEL_DIR = ROOT / "ml" / "saved_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MIN_RECORDS = 40


def metrics(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))

    nonzero = actual != 0
    mape = (
        np.mean(np.abs(
            (actual[nonzero] - predicted[nonzero]) /
            actual[nonzero]
        )) * 100
        if nonzero.any()
        else np.nan
    )

    return {
        "MAE": round(float(mae), 3),
        "RMSE": round(float(rmse), 3),
        "MAPE": round(float(mape), 2) if not np.isnan(mape) else None
    }



def train_location(location, group, results):
    print(f"\nTraining: {location}")

    group = group.copy()
    group["timestamp"] = pd.to_datetime(
        group["timestamp"], errors="coerce", utc=True
    )
    group["currentSpeed"] = pd.to_numeric(
        group["currentSpeed"], errors="coerce"
    )

    group = group.dropna(subset=["timestamp", "currentSpeed"])
    group = group.sort_values("timestamp")

    # Keep actual observations; do not resample or interpolate.
    series = (
        group.groupby("timestamp")["currentSpeed"]
        .mean()
        .sort_index()
    )

    if len(series) < 30:
        print(f"Skipping {location}: only {len(series)} observations.")
        return

    # Use observation order rather than claiming fixed time intervals.
    values = series.to_numpy(dtype=float)
    split = int(len(values) * 0.8)
    train = values[:split]
    test = values[split:]

    if len(test) < 5:
        print(f"Skipping {location}: test set too small.")
        return

    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_"
        for c in location
    )

    # ARIMA model
    try:
        arima = ARIMA(
            train,
            order=(2, 1, 2)
        ).fit()

        pred = np.asarray(arima.forecast(steps=len(test)))
        scores = metrics(test, pred)

        joblib.dump(
            arima,
            MODEL_DIR / f"{safe_name}_arima.joblib"
        )

        results.append({
            "location": location,
            "model": "ARIMA(2,1,2)",
            **scores
        })

        print("  ARIMA:", scores)

    except Exception as error:
        print(f"  ARIMA failed: {error}")

    # SARIMA experiment: seasonal period of 4 observations,
    # NOT a daily seasonal period.
    try:
        if len(train) < 30:
            print("  SARIMA skipped: insufficient training observations.")
            return

        sarima = SARIMAX(
            train,
            order=(1, 1, 1),
            seasonal_order=(1, 0, 1, 4),
            enforce_stationarity=False,
            enforce_invertibility=False
        ).fit(disp=False, maxiter=100)

        pred = np.asarray(sarima.forecast(steps=len(test)))
        scores = metrics(test, pred)

        joblib.dump(
            sarima,
            MODEL_DIR / f"{safe_name}_sarima.joblib"
        )

        results.append({
            "location": location,
            "model": "SARIMA seasonal-4-observations",
            **scores
        })

        print("  SARIMA:", scores)

    except Exception as error:
        print(f"  SARIMA failed: {error}")



def main():
    if not MONGO_URI:
        raise ValueError(
            "MONGO_URI is missing. Check backend/.env."
        )

    print("Connecting to MongoDB...")

    with MongoClient(
        MONGO_URI, serverSelectionTimeoutMS=10000
    ) as client:
        client.admin.command("ping")
        collection = client[DB_NAME][COLLECTION_NAME]

        records = list(collection.find(
            {},
            {
                "_id": 0,
                "locationName": 1,
                "timestamp": 1,
                "currentSpeed": 1
            }
        ))

    if not records:
        raise ValueError(
            f"No records found in {DB_NAME}.{COLLECTION_NAME}."
        )

    df = pd.DataFrame(records)

    if "locationName" not in df.columns:
        raise ValueError("Records do not contain locationName.")

    results = []

    print(f"Loaded {len(df)} records.")
    print("Training ARIMA and SARIMA by location...")

    for location, group in df.groupby("locationName"):
        print(f"\nTraining: {location}")
        train_location(location, group, results)

    if results:
        results_df = pd.DataFrame(results)
        output = ROOT / "ml" / "model_results.csv"
        results_df.to_csv(output, index=False)

        print("\nModel comparison:")
        print(results_df.to_string(index=False))
        print(f"\nResults saved to: {output}")
        print(f"Model files saved to: {MODEL_DIR}")
    else:
        print(
            "\nNo models were successfully evaluated. "
            "Check data regularity and record counts."
        )


if __name__ == "__main__":
    main()
