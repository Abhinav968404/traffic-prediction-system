
import argparse
import json
import re
from pathlib import Path

import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parent / "saved_models"


def normalize_location(location):
    return re.sub(
        r"[^a-z0-9]+",
        "_",
        location.lower()
    ).strip("_")


def get_available_locations():
    """
    Find locations that have both ARIMA and SARIMA models.
    Location names are derived from saved model filenames.
    """

    arima_locations = set()
    sarima_locations = set()

    for path in MODEL_DIR.glob("*_arima.joblib"):
        location = path.name.removesuffix("_arima.joblib")
        arima_locations.add(location)

    for path in MODEL_DIR.glob("*_sarima.joblib"):
        location = path.name.removesuffix("_sarima.joblib")
        sarima_locations.add(location)

    # Keep only locations with both models.
    supported_locations = arima_locations & sarima_locations

    return sorted(
        supported_locations,
        key=lambda location: location.lower()
    )


def predict(location, model_type="arima", steps=4):
    model_type = model_type.lower()

    if model_type not in {"arima", "sarima"}:
        raise ValueError(
            "model_type must be 'arima' or 'sarima'"
        )

    if not 1 <= steps <= 24:
        raise ValueError(
            "steps must be between 1 and 24"
        )

    prefix = normalize_location(location)
    suffix = f"_{model_type}.joblib"

    candidates = [
        path for path in MODEL_DIR.glob(f"*{suffix}")
        if normalize_location(
            path.name.removesuffix(suffix)
        ) == prefix
    ]

    if len(candidates) != 1:
        available = sorted(
            path.name
            for path in MODEL_DIR.glob(f"*{suffix}")
        )

        raise FileNotFoundError(
            f"No unique {model_type} model for '{location}'. "
            f"Available model files: {available}"
        )

    model = joblib.load(candidates[0])

    values = np.asarray(
        model.forecast(steps=steps),
        dtype=float
    )

    predictions = [
        {
            "step": index + 1,
            "predictedSpeed": round(
                max(0.0, float(value)),
                2
            )
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
        choices=["arima", "sarima"],
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
            print(
                json.dumps({
                    "locations": get_available_locations()
                })
            )

        else:
            if not args.location:
                parser.error(
                    "--location is required unless "
                    "--list-locations is used"
                )

            print(
                json.dumps(
                    predict(
                        args.location,
                        args.model,
                        args.steps
                    )
                )
            )

    except Exception as exc:
        print(
            json.dumps({
                "error": str(exc)
            })
        )
        raise SystemExit(1)
