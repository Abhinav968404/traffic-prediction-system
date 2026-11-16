
import argparse
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np

from dotenv import load_dotenv
from pymongo import MongoClient

MODEL_DIR = Path(__file__).resolve().parent / "saved_models"
ROOT = Path(__file__).resolve().parent.parent

load_dotenv(ROOT / "backend" / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "trafficPrediction")
COLLECTION_NAME = "traffics"

WINDOW = 4

INTERVAL_MINUTES = 15




def normalize_location(location):
    return re.sub(
        r"[^a-z0-9]+",
        "_",
        location.lower()
    ).strip("_")


def get_available_locations():
    arima_locations = set()
    sarima_locations = set()

    for path in MODEL_DIR.glob("*_arima.joblib"):
        location = path.name.removesuffix("_arima.joblib")
        arima_locations.add(location)

    for path in MODEL_DIR.glob("*_sarima.joblib"):
        location = path.name.removesuffix("_sarima.joblib")
        sarima_locations.add(location)

    supported_locations = arima_locations & sarima_locations

    return sorted(
        supported_locations,
        key=lambda location: location.lower()
    )


def find_model(location, model_type):
    prefix = normalize_location(location)
    suffix = f"_{model_type}.joblib"

    candidates = [
        path for path in MODEL_DIR.glob(f"*{suffix}")
        if normalize_location(
            path.name.removesuffix(suffix)
        ) == prefix
    ]

    if len(candidates) != 1:
        raise FileNotFoundError(
            f"No unique {model_type} model found for '{location}'."
        )

    return joblib.load(candidates[0])


def find_xgboost_model(location):
    """
    Load the selected baseline or tuned XGBoost model.
    Selection is based on xgboost_model_selection.json.
    """

    selection_file = (
        MODEL_DIR.parent / "xgboost_model_selection.json"
    )

    if not selection_file.exists():
        raise FileNotFoundError(
            "XGBoost selection file missing. "
            "Run ml/select_xgboost_models.py first."
        )

    with open(selection_file, "r") as file:
        selections = json.load(file)

    selected = selections.get(location)

    if selected is None:
        raise ValueError(
            f"No XGBoost selection found for '{location}'."
        )

    if selected["selected_model"] == "tuned":
        model_file = selected["model_file"]

        model_path = MODEL_DIR / "tuned" / model_file

        if not model_path.exists():
            raise FileNotFoundError(
                f"Selected tuned model not found: {model_path}"
            )

        return joblib.load(model_path)

    return find_model(location, "xgboost")


def make_features(history, timestamp):
    """Must match the feature construction used during training."""

    hour = timestamp.hour
    weekday = timestamp.weekday()
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


def get_recent_history(location, window=WINDOW):
    """Fetch the latest actual speeds from MongoDB."""

    if not MONGO_URI:
        raise ValueError("MONGO_URI is missing from backend/.env.")

    with MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000
    ) as client:

        collection = client[DB_NAME][COLLECTION_NAME]

        separator = r"[^a-z0-9]+"

        tokens = [
            re.escape(token)
            for token in re.split(separator, location.lower())
            if token
        ]

        location_pattern = "^" + separator.join(tokens) + "$"

        records = list(
            collection.find(
                {
                    "locationName": {
                        "$regex": location_pattern,
                        "$options": "i"
                    },
                    "currentSpeed": {"$exists": True}
                },
                {
                    "_id": 0,
                    "currentSpeed": 1,
                    "timestamp": 1
                }
            )
            .sort("timestamp", -1)
            .limit(window)
        )

    if len(records) < window:
        raise ValueError(
            f"Requires at least {window} recent records "
            f"for {location}; found {len(records)}."
        )

    records.reverse()

    history = [
        float(record["currentSpeed"])
        for record in records
    ]

    last_timestamp = records[-1]["timestamp"]

    if isinstance(last_timestamp, str):
        last_timestamp = datetime.fromisoformat(
            last_timestamp.replace("Z", "+00:00")
        )

    if last_timestamp.tzinfo is None:
        last_timestamp = last_timestamp.replace(
            tzinfo=timezone.utc
        )

    return history, last_timestamp

def predict_xgboost(location, steps):
    model = find_xgboost_model(location)

    history, last_timestamp = get_recent_history(location)

    predictions = []

    for step in range(1, steps + 1):
        future_timestamp = (
            last_timestamp
            + timedelta(minutes=INTERVAL_MINUTES * step)
        )

        features = make_features(
            history,
            future_timestamp
        )

        prediction = float(
            model.predict(
                np.asarray([features], dtype=float)
            )[0]
        )

        prediction = max(0.0, prediction)

        predictions.append({
            "step": step,
            "timestamp": future_timestamp.isoformat(),
            "predictedSpeed": round(prediction, 2)
        })

        # Recursive prediction: use this prediction
        # as input for the next observation.
        history.append(prediction)

    return {
        "location": location,
        "model": "XGBOOST",
        "forecastSteps": steps,
        "intervalMinutes": INTERVAL_MINUTES,
        "unit": "km/h",
        "predictions": predictions
    }





def predict(location, model_type="arima", steps=4):
    model_type = model_type.lower()

    if model_type not in {"arima", "sarima", "xgboost"}:
        raise ValueError(
            "model_type must be arima, sarima or xgboost."
        )

    if not 1 <= steps <= 24:
        raise ValueError("steps must be between 1 and 24.")

    if model_type == "xgboost":
        return predict_xgboost(location, steps)

    model = find_model(location, model_type)

    values = np.asarray(model.forecast(steps=steps), dtype=float)

    predictions = [
        {
            "step": index + 1,
            "predictedSpeed": round(max(0.0, float(value)), 2)
        }
        for index, value in enumerate(values)
    ]

    return {
        "location": location,
        "model": model_type.upper(),
        "forecastSteps": steps,
        "unit": "km/h",
        "predictions": predictions
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--location")
    parser.add_argument(
        "--model",
        choices=["arima", "sarima", "xgboost"],
        default="arima"
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=4
    )
    parser.add_argument(
        "--list-locations",
        action="store_true"
    )

    args = parser.parse_args()

    try:
        if args.list_locations:
            print(json.dumps({
                "locations": get_available_locations()
            }))
        else:
            if not args.location:
                parser.error(
                    "--location is required unless "
                    "--list-locations is used"
                )

            result = predict(
                args.location,
                args.model,
                args.steps
            )

            print(json.dumps(result))

    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)
