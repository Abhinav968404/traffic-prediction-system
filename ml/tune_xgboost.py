
import os
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from dotenv import load_dotenv
from pymongo import MongoClient
from xgboost import XGBRegressor
from sklearn.model_selection import ParameterSampler, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "trafficPrediction")
COLLECTION_NAME = "traffics"

MODEL_DIR = ROOT / "ml" / "saved_models"
TUNED_DIR = MODEL_DIR / "tuned"
TUNED_DIR.mkdir(parents=True, exist_ok=True)

WINDOW = 4
N_ITER = 20
N_SPLITS = 3
RANDOM_STATE = 42


def make_features(history, timestamp):
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


def create_training_data(series):
    values = series.to_numpy(dtype=float)

    X, y = [], []

    for i in range(WINDOW, len(values)):
        X.append(
            make_features(values[:i], series.index[i])
        )
        y.append(values[i])

    return np.asarray(X), np.asarray(y)


def fit_model(series, params):
    X, y = create_training_data(series)

    model = XGBRegressor(
        **params,
        objective="reg:squarederror",
        random_state=RANDOM_STATE,
        n_jobs=2,
    )

    model.fit(X, y, verbose=False)
    return model


def recursive_forecast(model, history, future_index):
    history = list(history.to_numpy(dtype=float))
    predictions = []

    for timestamp in future_index:
        features = make_features(history, timestamp)

        prediction = float(
            model.predict(
                np.asarray([features], dtype=float)
            )[0]
        )

        prediction = max(0.0, prediction)
        predictions.append(prediction)
        history.append(prediction)

    return np.asarray(predictions)


def evaluate_params(series, params):
    splitter = TimeSeriesSplit(n_splits=N_SPLITS)
    fold_scores = []

    for train_idx, val_idx in splitter.split(series):
        train = series.iloc[train_idx]
        validation = series.iloc[val_idx]

        if len(train) <= WINDOW + 5:
            continue

        model = fit_model(train, params)

        predictions = recursive_forecast(
            model,
            train,
            validation.index
        )

        score = mean_absolute_error(
            validation.to_numpy(dtype=float),
            predictions
        )

        fold_scores.append(score)

    if not fold_scores:
        return float("inf")

    return float(np.mean(fold_scores))


def tune_location(series, location):
    split = int(len(series) * 0.8)

    train = series.iloc[:split]
    test = series.iloc[split:]

    if len(train) <= WINDOW + 5 or len(test) < 5:
        print(f"Skipping {location}: insufficient data.")
        return None

    search_space = {
        "n_estimators": [100, 200, 300, 500],
        "max_depth": [2, 3, 4, 5],
        "learning_rate": [0.01, 0.03, 0.05, 0.1],
        "subsample": [0.7, 0.8, 1.0],
        "colsample_bytree": [0.7, 0.8, 1.0],
        "min_child_weight": [1, 3, 5],
        "reg_lambda": [1, 5, 10],
    }

    candidates = list(
        ParameterSampler(
            search_space,
            n_iter=N_ITER,
            random_state=RANDOM_STATE
        )
    )

    # Include the current project configuration as a candidate.
    baseline_params = {
        "n_estimators": 300,
        "max_depth": 3,
        "learning_rate": 0.03,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 1,
        "reg_lambda": 1,
    }

    if baseline_params not in candidates:
        candidates.append(baseline_params)

    print(f"\nTuning: {location}")
    print(f"Training observations: {len(train)}")
    print(f"Test observations: {len(test)}")
    print(f"Configurations to evaluate: {len(candidates)}")

    best_params = None
    best_cv_mae = float("inf")

    for number, params in enumerate(candidates, start=1):
        score = evaluate_params(train, params)

        print(
            f"  {number}/{len(candidates)} "
            f"CV MAE: {score:.3f}"
        )

        if score < best_cv_mae:
            best_cv_mae = score
            best_params = params.copy()

    # Compare the original model against the tuned model.
    baseline_model = fit_model(train, baseline_params)
    tuned_model = fit_model(train, best_params)

    baseline_predictions = recursive_forecast(
        baseline_model, train, test.index
    )

    tuned_predictions = recursive_forecast(
        tuned_model, train, test.index
    )

    actual = test.to_numpy(dtype=float)

    def metrics(predictions):
        return {
            "MAE": float(mean_absolute_error(actual, predictions)),
            "RMSE": float(
                np.sqrt(mean_squared_error(actual, predictions))
            )
        }

    baseline_scores = metrics(baseline_predictions)
    tuned_scores = metrics(tuned_predictions)

    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_"
        for c in location
    )

    # Save separately. Do not overwrite existing production models.
    model_path = TUNED_DIR / f"{safe_name}_xgboost_tuned.joblib"
    joblib.dump(tuned_model, model_path)

    params_path = TUNED_DIR / f"{safe_name}_best_params.json"
    with open(params_path, "w") as file:
        json.dump(best_params, file, indent=4)

    result = {
        "location": location,
        "best_cv_mae": round(best_cv_mae, 3),
        "baseline_test": {
            k: round(v, 3) for k, v in baseline_scores.items()
        },
        "tuned_test": {
            k: round(v, 3) for k, v in tuned_scores.items()
        },
        "best_parameters": best_params,
        "model_path": str(model_path),
    }

    print("\nResults:")
    print(json.dumps(result, indent=4))

    return result


def main():
    if not MONGO_URI:
        raise ValueError("MONGO_URI missing from backend/.env")

    with MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000
    ) as client:

        client.admin.command("ping")

        records = list(
            client[DB_NAME][COLLECTION_NAME].find(
                {},
                {
                    "_id": 0,
                    "locationName": 1,
                    "timestamp": 1,
                    "currentSpeed": 1,
                }
            )
        )

    df = pd.DataFrame(records)

    df["timestamp"] = pd.to_datetime(
        df["timestamp"], errors="coerce", utc=True
    )

    df["currentSpeed"] = pd.to_numeric(
        df["currentSpeed"], errors="coerce"
    )

    df = df.dropna(
        subset=["locationName", "timestamp", "currentSpeed"]
    )

    results = []

    for location, group in df.groupby("locationName"):
        series = (
            group.sort_values("timestamp")
            .groupby("timestamp")["currentSpeed"]
            .mean()
            .sort_index()
        )

        if len(series) < 30:
            print(f"Skipping {location}: only {len(series)} records.")
            continue

        result = tune_location(series, location)

        if result:
            results.append(result)

    if results:
        output = ROOT / "ml" / "xgboost_tuning_results.json"

        with open(output, "w") as file:
            json.dump(results, file, indent=4)

        print(f"\nTuning results saved to: {output}")


if __name__ == "__main__":
    main()
