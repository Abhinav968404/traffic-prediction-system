# TrafficIQ – AI-Based Traffic Analysis and Forecasting System

**TrafficIQ** is an AI-powered traffic analysis and forecasting system designed to monitor traffic conditions and predict future traffic patterns using historical and real-time traffic data.

The project integrates the TomTom Traffic API with time-series forecasting techniques to analyze traffic conditions across multiple locations in the Delhi-NCR region, including Delhi, Meerut, and Ghaziabad.

## 🚀 Key Features

- **Real-Time Traffic Monitoring:** Fetches live traffic information using the TomTom Traffic Flow API.
- **Traffic Data Storage:** Stores traffic observations in MongoDB Atlas for historical analysis.
- **Traffic Prediction:** Uses ARIMA and SARIMA time-series forecasting models to predict future traffic conditions.
- **Multi-Location Analysis:** Supports traffic monitoring and forecasting across multiple geographical locations.
- **Interactive Maps:** Uses Leaflet.js to visualize locations and traffic routes.
- **Historical Traffic Analysis:** Analyzes historical traffic patterns, trends, and seasonality.
- **Model Evaluation:** Evaluates forecasting performance using Mean Absolute Error (MAE).
- **Forecast Visualization:** Displays predicted traffic trends to help users understand future congestion patterns.

## 🛠️ Technologies Used

| Category | Technologies |
|---|---|
| Programming Languages | Python, JavaScript |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Machine Learning | ARIMA, SARIMA |
| Data Processing | Pandas, NumPy |
| ML Libraries | Statsmodels, Scikit-learn |
| Visualization | Matplotlib, Leaflet.js |
| Traffic Data | TomTom Traffic API |
| Version Control | Git, GitHub |

## 🏗️ Project Architecture

TrafficIQ follows a modular architecture consisting of:

1. **Data Collection:** Retrieves traffic information such as current speed, free-flow speed, travel time, and road closure status through the TomTom API.
2. **Data Storage:** Stores collected traffic observations in MongoDB Atlas with location and timestamp information.
3. **Data Processing:** Cleans and preprocesses historical traffic data for time-series analysis.
4. **Model Training:** Applies ARIMA and SARIMA models to identify traffic patterns and generate forecasts.
5. **Model Evaluation:** Compares prediction performance using MAE.
6. **Visualization:** Displays traffic information, historical patterns, routes, and predicted traffic trends through the dashboard.

## 🤖 Machine Learning Models

**ARIMA (AutoRegressive Integrated Moving Average)**

Used for time-series forecasting by analyzing past observations, differencing, and moving averages.

**SARIMA (Seasonal ARIMA)**

Extends ARIMA by incorporating seasonal patterns, making it useful for identifying recurring traffic fluctuations.

Both models are used to analyze historical traffic observations and forecast future traffic conditions.

## 📂 Project Structure

```text
traffic-prediction-system/
│
├── backend/
│   └── Backend API and server logic
│
├── frontend/
│   └── User interface and dashboard
│
├── ml/
│   └── Machine learning models and forecasting
│
├── docs/
│   └── Project documentation and reports
│
├── .gitignore
└── README.md
```

## 🎯 Project Objectives

- Analyze traffic conditions across multiple locations.
- Predict future traffic patterns using time-series forecasting.
- Identify traffic trends and seasonal variations.
- Provide an interactive platform for traffic monitoring and visualization.
- Support better travel planning through data-driven traffic predictions.

## 🌍 Application and Impact

TrafficIQ aims to contribute to smarter urban mobility by combining real-time traffic information, historical data analysis, and machine learning-based forecasting.

It can help commuters understand traffic patterns, anticipate congestion, and make more informed travel decisions.

## 👨‍💻 Contributors

Developed as an academic project at **Bennett University**.

