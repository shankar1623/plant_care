import httpx
import logging
from datetime import datetime
from app.config import settings

import unicodedata

def clean_location_name(name: str) -> str:
    """Removes diacritics/accents (e.g., 'Kātpādi' -> 'Katpadi') for clean English display."""
    if not name:
        return ""
    normalized = unicodedata.normalize('NFKD', name)
    return "".join(c for c in normalized if not unicodedata.combining(c)).strip()

logger = logging.getLogger("plantcare.weather")

def get_current_season() -> str:
    """
    Returns the Indian agricultural cropping season with descriptive normal name:
    - Rainy (Kharif): June - October (Monsoon crops like Paddy, Cotton, Groundnut)
    - Winter (Rabi): November - March (Winter crops like Wheat, Mustard, Gram)
    - Summer (Zaid): April - May (Summer crops like Vegetables, Melons, Pulses)
    """
    month = datetime.now().month
    if 6 <= month <= 10:
        return "Rainy (Kharif)"
    elif month >= 11 or month <= 3:
        return "Winter (Rabi)"
    else:
        return "Summer (Zaid)"

async def fetch_live_weather(lat: float, lon: float) -> dict:
    """
    Fetches real-time weather.
    Prioritizes OpenWeatherMap using OPENWEATHER_API_KEY.
    Gracefully falls back to Open-Meteo, then regional baseline.
    """
    season = get_current_season()
    api_key = (settings.OPENWEATHER_API_KEY or "").strip()

    # 1. Try OpenWeatherMap if key is configured
    if api_key:
        owm_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(owm_url)
                if resp.status_code == 200:
                    data = resp.json()
                    temp = round(float(data.get("main", {}).get("temp", 28.0)), 1)
                    humidity = round(float(data.get("main", {}).get("humidity", 70.0)), 1)
                    rain_info = data.get("rain", {})
                    precipitation = float(rain_info.get("1h", rain_info.get("3h", 0.0)))
                    weather_desc = data.get("weather", [{}])[0].get("description", "Clear sky").title()
                    city_raw = clean_location_name((data.get("name") or "").strip())
                    country = data.get("sys", {}).get("country", "").strip()
                    if city_raw and country:
                        city = f"{city_raw}, {country}"
                    elif city_raw:
                        city = city_raw
                    else:
                        city = "Local Farm"

                    return {
                        "temperature": temp,
                        "humidity": humidity,
                        "precipitation": precipitation,
                        "season": season,
                        "description": weather_desc,
                        "city": city,
                        "source": "OpenWeather",
                        "latitude": lat,
                        "longitude": lon
                    }
                else:
                    logger.warning(f"OpenWeatherMap returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"OpenWeatherMap call failed: {e}. Falling back to Open-Meteo.")

    # 2. Fallback to Open-Meteo
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation"
    )

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                return {
                    "temperature": round(float(current.get("temperature_2m", 28.0)), 1),
                    "humidity": round(float(current.get("relative_humidity_2m", 70.0)), 1),
                    "precipitation": round(float(current.get("precipitation", 0.0)), 1),
                    "season": season,
                    "description": "Clear / Mild",
                    "city": "Regional Weather",
                    "source": "Open-Meteo Live",
                    "latitude": lat,
                    "longitude": lon
                }
    except Exception as e:
        logger.warning(f"Could not reach Open-Meteo ({e}), using regional baseline.")

    # 3. Graceful fallback baseline
    return {
        "temperature": 27.5,
        "humidity": 68.0,
        "precipitation": 0.0,
        "season": season,
        "description": "Favorable Agro-Climate",
        "city": "Salem Farm Zone",
        "source": "Agro Baseline",
        "latitude": lat,
        "longitude": lon
    }

