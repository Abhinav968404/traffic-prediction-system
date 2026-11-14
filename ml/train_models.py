
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
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "trafficPrediction")
COLLECTION_NAME = "traffics"

MODEL_DIR = ROOT / "ml" / "saved_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MIN_RECORDS = 30
WINDOW = 4


def calculate_metrics(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))

    nonzero = actual != 0
    mape = (
        np.mean(
            np.abs(
                (actual[nonzero] - predicted[nonzero])
                / actual[nonzero]
            )
        ) * 100
        if nonzero.any()
        else np.nan
    )

    return {
        "MAE": round(float(mae), 3),
        "RMSE": round(float(rmse), 3),
        "MAPE": round(float(mape), 2)
        if not np.isnan(mape)
        else None,
    }


def make_features(history, timestamp):
    """Create lag and time-based features for XGBoost."""
    timestamp = pd.Timestamp(timestamp)

    hour = timestamp.hour
    weekday = timestamp.dayofweek
    month = timestamp.month

    return [
        *history[-WINDOW:],
        np.sin(2 * np.pi * hour / 24),
        np.cos(2 * np.pi * hour / 24),
        np.sin(2 * np.pi * weekday / 7),
        np.cos(2 * np.pi * weekday / 7),
        np.sin(2 * np.pi * month / 12),
        np.cos(2 * np.pi * month / 12),
    ]


def train_xgboost(train, test, location, safe_name):
    """Train XGBoost and recursively forecast the test period."""

    if len(train) <= WINDOW + 5:
        raise ValueError("Not enough training observations for XGBoost.")

    values = train.to_numpy(dtype=float)
    timestamps = train.index

    X_train = []
    y_train = []

    # Build training samples using only historical training observations.
    for i in range(WINDOW, len(values)):
        X_train.append(
            make_features(values[:i], timestamps[i])
        )
        y_train.append(values[i])

    model = XGBRegressor(
        n_estimators=300,
        max_depth=3,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=2,
    )

    model.fit(
        np.asarray(X_train),
        np.asarray(y_train),
        verbose=False,
    )

    # Recursive forecasting: use predictions instead of actual test values.
    history = list(values)
    predictions = []

    for timestamp in test.index:
        features = make_features(history, timestamp)
        prediction = float(model.predict(
            np.asarray([features])
        )[0])

        predictions.append(prediction)
        history.append(prediction)

    model_path = MODEL_DIR / f"{safe_name}_xgboost.joblib"
    joblib.dump(model, model_path)

    return predictions


def train_location(location, group, results, evaluation_rows):
    print(f"\nTraining: {location}")

    group = group.copy()

    group["timestamp"] = pd.to_datetime(
        group["timestamp"], errors="coerce", utc=True
    )

    group["currentSpeed"] = pd.to_numeric(
        group["currentSpeed"], errors="coerce"
    )

    group = group.dropna(
        subset=["timestamp", "currentSpeed"]
    )

    group = group.sort_values("timestamp")

    series = (
        group.groupby("timestamp")["currentSpeed"]
        .mean()
        .sort_index()
    )

    if len(series) < MIN_RECORDS:
        print(
            f"Skipping {location}: only {len(series)} observations."
        )
        return

    split = int(len(series) * 0.8)

    train = series.iloc[:split]
    test = series.iloc[split:]

    print(f"Location: {location}")
    print(f"Total observations: {len(series)}")
    print(f"Training observations: {len(train)}")
    print(f"Testing observations: {len(test)}")

    if len(test) < 5:
        print(f"Skipping {location}: test set too small.")
        return

    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_"
        for c in location
    )

    def record_evaluation(model_name, actual_series, predictions):
        actual_values = actual_series.to_numpy(dtype=float)
        predicted_values = np.asarray(
            predictions, dtype=float
        )

        scores = calculate_metrics(
            actual_values, predicted_values
        )

        results.append({
            "location": location,
            "model": model_name,
            **scores,
            "training_observations": len(train),
            "test_observations": len(test),
        })

        for timestamp, actual, predicted in zip(
            actual_series.index,
            actual_values,
            predicted_values,
        ):
            evaluation_rows.append({
                "location": location,
                "model": model_name,
                "timestamp": timestamp.isoformat(),
                "actualSpeed": round(float(actual), 3),
                "predictedSpeed": round(float(predicted), 3),
                "absoluteError": round(
                    float(abs(actual - predicted)), 3
                ),
            })

        print(f"  {model_name}: {scores}")

    # 1. ARIMA
    try:
        arima = ARIMA(
            train.to_numpy(),
            order=(2, 1, 2)
        ).fit()

        predictions = arima.forecast(
            steps=len(test)
        )

        joblib.dump(
            arima,
            MODEL_DIR / f"{safe_name}_arima.joblib"
        )

        record_evaluation(
            "ARIMA(2,1,2)", test, predictions
        )

    except Exception as error:
        print(f"  ARIMA failed: {error}")

    # 2. SARIMA
    try:
        sarima = SARIMAX(
            train.to_numpy(),
            order=(1, 1, 1),
            seasonal_order=(1, 0, 1, 4),
            enforce_stationarity=False,
            enforce_invertibility=False,
        ).fit(disp=False, maxiter=100)

        predictions = sarima.forecast(
            steps=len(test)
        )

        joblib.dump(
            sarima,
            MODEL_DIR / f"{safe_name}_sarima.joblib"
        )

        record_evaluation(
            "SARIMA seasonal-4-observations",
            test,
            predictions,
        )

    except Exception as error:
        print(f"  SARIMA failed: {error}")

    # 3. XGBoost
    try:
        predictions = train_xgboost(
            train, test, location, safe_name
        )

        record_evaluation(
            "XGBoost", test, predictions
        )

    except Exception as error:
        print(f"  XGBoost failed: {error}")


def main():
    if not MONGO_URI:
        raise ValueError(
            "MONGO_URI is missing. Check backend/.env."
        )

    print("Connecting to MongoDB...")

    with MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000
    ) as client:

        client.admin.command("ping")

        collection = client[DB_NAME][COLLECTION_NAME]

        records = list(
            collection.find(
                {},
                {
                    "_id": 0,
                    "locationName": 1,
                    "timestamp": 1,
                    "currentSpeed": 1,
                },
            )
        )

    if not records:
        raise ValueError(
            f"No records found in {DB_NAME}.{COLLECTION_NAME}."
        )

    df = pd.DataFrame(records)

    if "locationName" not in df.columns:
        raise ValueError(
            "Records do not contain locationName."
        )

    results = []
    evaluation_rows = []

    print(f"Loaded {len(df)} records.")
    print("Training ARIMA, SARIMA and XGBoost...")

    for location, group in df.groupby("locationName"):
        train_location(
            location,
            group,
            results,
            evaluation_rows,
        )

    if not results:
        print("No models were successfully evaluated.")
        return

    results_path = ROOT / "ml" / "model_results.csv"
    evaluation_path = (
        ROOT / "ml" / "evaluation_predictions.csv"
    )

    pd.DataFrame(results).to_csv(
        results_path, index=False
    )

    pd.DataFrame(evaluation_rows).to_csv(
        evaluation_path, index=False
    )

    print("\nModel comparison:")
    print(pd.DataFrame(results).to_string(index=False))

    print(f"\nMetrics saved to: {results_path}")
    print(f"Predictions saved to: {evaluation_path}")
    print(f"Models saved to: {MODEL_DIR}")


if __name__ == "__main__":
    main()
