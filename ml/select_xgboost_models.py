
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESULTS_FILE = ROOT / "xgboost_tuning_results.json"
OUTPUT_FILE = ROOT / "xgboost_model_selection.json"

with open(RESULTS_FILE, "r") as file:
    results = json.load(file)

selection = {}

for result in results:
    location = result["location"]

    baseline = result["baseline_test"]
    tuned = result["tuned_test"]

    # Select tuned only when BOTH test metrics improve.
    tuned_is_better = (
        tuned["MAE"] < baseline["MAE"]
        and tuned["RMSE"] < baseline["RMSE"]
    )

    if tuned_is_better:
        selected_model = "tuned"
        model_file = Path(result["model_path"]).name
    else:
        selected_model = "baseline"
        model_file = None

    selection[location] = {
        "selected_model": selected_model,
        "model_file": model_file,
        "baseline_mae": baseline["MAE"],
        "baseline_rmse": baseline["RMSE"],
        "tuned_mae": tuned["MAE"],
        "tuned_rmse": tuned["RMSE"]
    }

with open(OUTPUT_FILE, "w") as file:
    json.dump(selection, file, indent=4)

tuned_count = sum(
    1 for item in selection.values()
    if item["selected_model"] == "tuned"
)

baseline_count = len(selection) - tuned_count

print(f"Selection completed for {len(selection)} locations.")
print(f"Tuned models selected: {tuned_count}")
print(f"Baseline models retained: {baseline_count}")
print(f"Saved to: {OUTPUT_FILE}")
