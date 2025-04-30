import { Router } from "express";
import { storage } from "../storage";

const settingsRouter = Router();

// GET check if API keys are set
settingsRouter.get("/api-keys", async (req, res) => {
  try {
    const household = await storage.getHousehold();
    
    if (!household) {
      return res.status(404).json({ error: "Household not found" });
    }
    
    // Return boolean indicators if the API keys exist rather than the actual keys
    return res.json({
      openAiKey: !!process.env.OPENAI_API_KEY,
      weatherApiKey: !!process.env.WEATHER_API_KEY
    });
  } catch (error) {
    console.error("Error checking API keys:", error);
    return res.status(500).json({ error: "Failed to check API keys" });
  }
});

// POST set OpenAI API key
settingsRouter.post("/openai-api-key", async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "API key is required" });
    }
    
    // In production, you'd securely store this key in environment variables
    // For this demo, we're setting it in process.env
    process.env.OPENAI_API_KEY = key;
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Error setting OpenAI API key:", error);
    return res.status(500).json({ error: "Failed to set OpenAI API key" });
  }
});

// POST set Weather API key
settingsRouter.post("/weather-api-key", async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "API key is required" });
    }
    
    // In production, you'd securely store this key in environment variables
    // For this demo, we're setting it in process.env
    process.env.WEATHER_API_KEY = key;
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Error setting Weather API key:", error);
    return res.status(500).json({ error: "Failed to set Weather API key" });
  }
});

// POST set user location
settingsRouter.post("/location", async (req, res) => {
  try {
    const { location } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    
    const household = await storage.getHousehold();
    
    if (!household) {
      return res.status(404).json({ error: "Household not found" });
    }
    
    // Update household with location
    const updatedHousehold = await storage.updateHousehold({
      ...household,
      location
    });
    
    return res.json({ success: true, location: updatedHousehold.location });
  } catch (error) {
    console.error("Error setting location:", error);
    return res.status(500).json({ error: "Failed to set location" });
  }
});

export default settingsRouter;