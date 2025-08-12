import { Router } from "express";
import { jwtAuthMiddleware } from "../middleware/jwtAuth";
import { z } from "zod";
import { getCurrentWeather, getWeatherForecast } from "../weather";

const router = Router();
router.use(jwtAuthMiddleware);

// Validation schemas
const forecastSchema = z.object({
  location: z.string(),
  dates: z.array(z.string()).optional()
});

// POST /api/weather/forecast - Get weather forecast for a location
router.post("/forecast", async (req, res) => {
  try {
    const validatedData = forecastSchema.parse(req.body);
    const { location, dates } = validatedData;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // If no dates provided, get current weather
    if (!dates || dates.length === 0) {
      const currentWeather = await getCurrentWeather(location);
      if (currentWeather) {
        return res.json({
          success: true,
          current: currentWeather,
          forecast: []
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Could not fetch weather data"
        });
      }
    }

    // Get forecast for the requested dates
    const forecast = await getWeatherForecast(location, dates);

    // Also get current weather
    const currentWeather = await getCurrentWeather(location);

    res.json({
      success: true,
      current: currentWeather,
      forecast: forecast
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch weather forecast"
    });
  }
});

export default router;