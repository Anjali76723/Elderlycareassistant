// server/controllers/assistant.controllers.js
const axios = require("axios");

/**
 * News + Weather controller (CommonJS)
 *
 * getNews: unchanged other than some logging
 * getWeather: supports:
 *   - ?lat=..&lon=..  (preferred)
 *   - ?city=CityName
 *   - fallback: use IP-based lookup (ip-api.com) to derive coords, then query OpenWeather
 *
 * Response for weather: { city, description, temp, feels_like, humidity, wind_speed, coord, source }
 *  source = 'coords' | 'city' | 'ip' | 'fallback'
 */

const getNews = async (req, res) => {
  try {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NEWSAPI_KEY not configured on server" });
    }

    const pageSize = Math.min(parseInt(req.query.pageSize || "10", 10), 20);
    const country = req.query.country || process.env.NEWSAPI_COUNTRY || "in";
    const topUrl = "https://newsapi.org/v2/top-headlines";
    const topParams = { apiKey, pageSize, country };

    console.log("assistant.getNews: calling top-headlines", { topUrl, topParams });

    // Try to get top headlines first (most reliable for recent news)
    let r = null;
    try {
      r = await axios.get(topUrl, { params: topParams, timeout: 10000 });
      console.log("assistant.getNews: top-headlines response status:", r.status, "totalResults:", r.data?.totalResults);
    } catch (err) {
      console.warn("assistant.getNews: top-headlines request failed:", err.response?.data || err.message);
      r = null;
    }

    let articles = Array.isArray(r?.data?.articles) ? r.data.articles : [];

    // If top-headlines returned nothing, try 'everything' with IST timezone handling
    if (!articles.length) {
      const everythingUrl = "https://newsapi.org/v2/everything";
      const q = req.query.q || "news OR headlines";
      
      // Helper: compute IST time windows
      const IST_OFFSET_MIN = 5.5 * 60; // IST is UTC+5:30
      const now = new Date();
      
      // Convert current time to IST
      const istNow = new Date(now.getTime() + IST_OFFSET_MIN * 60 * 1000);
      const y = istNow.getUTCFullYear();
      const m = istNow.getUTCMonth();
      const d = istNow.getUTCDate();

      // Calculate IST midnight in UTC
      const istOffsetMs = IST_OFFSET_MIN * 60 * 1000;
      const fromTodayUTC = new Date(Date.UTC(y, m, d, 0, 0, 0) - istOffsetMs);
      const toTodayUTC = new Date(Date.UTC(y, m, d, 23, 59, 59) - istOffsetMs);

      // First try: today in IST
      const paramsToday = {
        apiKey,
        q,
        pageSize: pageSize * 2, // Get more articles to have spares
        language: "en",
        sortBy: "publishedAt",
        from: fromTodayUTC.toISOString(),
        to: toTodayUTC.toISOString()
      };
      
      console.log("assistant.getNews: trying everything endpoint for today");
      
      try {
        const response = await axios.get(everythingUrl, { 
          params: paramsToday, 
          timeout: 15000 
        });
        
        const newArticles = Array.isArray(response?.data?.articles) ? response.data.articles : [];
        console.log("assistant.getNews: everything (today) returned", newArticles.length, "articles");
        
        // Add new articles, avoiding duplicates by URL
        const existingUrls = new Set(articles.map(a => a.url));
        const uniqueNewArticles = newArticles.filter(a => a.url && !existingUrls.has(a.url));
        articles = [...articles, ...uniqueNewArticles];
        
        if (articles.length >= pageSize) {
          articles = articles.slice(0, pageSize);
        }
      } catch (err) {
        console.warn("assistant.getNews: everything (today) request failed:", 
          err.response?.data?.message || err.message);
      }
      
      // If still not enough articles, try last 48 hours
      if (articles.length < pageSize) {
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const params48h = {
          apiKey,
          q,
          pageSize: pageSize * 2,
          language: "en",
          sortBy: "publishedAt",
          from: since48h
        };
        
        console.log("assistant.getNews: trying everything endpoint (last 48h)");
        
        try {
          const response = await axios.get(everythingUrl, { 
            params: params48h, 
            timeout: 15000 
          });
          
          const newArticles = Array.isArray(response?.data?.articles) ? response.data.articles : [];
          console.log("assistant.getNews: everything (48h) returned", newArticles.length, "articles");
          
          // Add new articles, avoiding duplicates by URL
          const existingUrls = new Set(articles.map(a => a.url));
          const uniqueNewArticles = newArticles.filter(a => a.url && !existingUrls.has(a.url));
          articles = [...articles, ...uniqueNewArticles];
          
          if (articles.length >= pageSize) {
            articles = articles.slice(0, pageSize);
          }
        } catch (err) {
          console.warn("assistant.getNews: everything (48h) request failed:", 
            err.response?.data?.message || err.message);
        }
      }
    }

    // Format articles into headlines
    const headlines = (articles || []).map((a) => ({
      title: a.title || "",
      source: (a.source && a.source.name) || "",
      url: a.url || "",
      publishedAt: a.publishedAt || new Date().toISOString()
    }));

    return formatAndSendResponse(res, articles);
  } catch (err) {
    console.error("assistant.getNews unexpected error:", err.response?.data || err.message || err);
    return res.status(500).json({ 
      message: "Error fetching news",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Helper function to format and send the response
 */
const formatAndSendResponse = (res, articles) => {
  const headlines = (articles || []).map((a) => ({
    title: a.title || "",
    source: (a.source && a.source.name) || "",
    url: a.url || "",
    publishedAt: a.publishedAt || new Date().toISOString()
  }));

  if (!headlines.length) {
    console.warn("assistant.getNews: no articles found; returning fallback");
    return res.json({
      headlines: [
        {
          title: "Latest news not available at the moment. Please try again later.",
          source: "System",
          url: "",
          publishedAt: new Date().toISOString()
        }
      ]
    });
  }

  return res.json({ headlines });
};


// Helper: try to get client IP from request (Express). May be '::1' or '::ffff:127.0.0.1'
const getClientIp = (req) => {
  // Express may put forwarded IPs in x-forwarded-for
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    // x-forwarded-for may be comma separated list — pick first
    const parts = String(xff).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[0];
  }
  // fallback to connection remote address
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
  return ip;
};

const geolocateIp = async (ip) => {
  try {
    // ip-api.com (free) — simple JSON response
    // If ip is localhost (127.0.0.1 / ::1) this will usually not produce a meaningful result.
    const target = ip ? `http://ip-api.com/json/${encodeURIComponent(ip)}` : `http://ip-api.com/json`;
    const r = await axios.get(target, { timeout: 8000 });
    if (r?.data?.status === 'success') {
      return {
        lat: r.data.lat,
        lon: r.data.lon,
        city: r.data.city,
        region: r.data.regionName,
        country: r.data.country,
        provider: 'ip-api'
      };
    }
    return null;
  } catch (err) {
    console.warn("geolocateIp failed:", err.response?.data || err.message);
    return null;
  }
};


const getWeather = async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_KEY;
    if (!apiKey) {
      console.error("assistant.getWeather: OPENWEATHER_KEY is not set");
      return res.status(500).json({ message: "OPENWEATHER_KEY not configured" });
    }

    const lat = req.query.lat;
    const lon = req.query.lon;
    const cityQuery = req.query.city;
    const defaultCity = process.env.DEFAULT_CITY || "Delhi";

    const baseUrl = "https://api.openweathermap.org/data/2.5/weather";

    // If lat & lon provided, use them (preferred)
    if (lat && lon) {
      const params = { lat, lon, appid: apiKey, units: "metric" };
      console.log("assistant.getWeather: calling OpenWeather by coords", { params });
      try {
        const r = await axios.get(baseUrl, { params, timeout: 10000 });
        const d = r.data;
        const weather = {
          city: d.name || cityQuery || defaultCity,
          description: d.weather?.[0]?.description || "",
          temp: d.main?.temp ?? null,
          feels_like: d.main?.feels_like ?? null,
          humidity: d.main?.humidity ?? null,
          wind_speed: d.wind?.speed ?? null,
          coord: d.coord || { lat, lon },
          source: "coords"
        };
        return res.json(weather);
      } catch (err) {
        console.error("assistant.getWeather (coords) error:", err.response?.data || err.message || err);
        // If coords call fails, continue to try other fallbacks below
      }
    }

    // If city param provided, try by city name
    if (cityQuery) {
      const params = { q: cityQuery, appid: apiKey, units: "metric" };
      console.log("assistant.getWeather: calling OpenWeather by city", { params });
      try {
        const r = await axios.get(baseUrl, { params, timeout: 10000 });
        const d = r.data;
        const weather = {
          city: d.name || cityQuery,
          description: d.weather?.[0]?.description || "",
          temp: d.main?.temp ?? null,
          feels_like: d.main?.feels_like ?? null,
          humidity: d.main?.humidity ?? null,
          wind_speed: d.wind?.speed ?? null,
          coord: d.coord || null,
          source: "city"
        };
        return res.json(weather);
      } catch (err) {
        console.error("assistant.getWeather (city) error:", err.response?.data || err.message || err);
        if (err.response && err.response.status === 404) {
          return res.status(404).json({ message: "city not found" });
        }
        // else continue to IP fallback
      }
    }

    // IP-based fallback: try to geolocate the client IP and use coords
    const clientIp = getClientIp(req);
    console.log("assistant.getWeather: no coords/city provided — attempting IP geolocation for", clientIp);

    const geo = await geolocateIp(clientIp);
    if (geo && geo.lat != null && geo.lon != null) {
      try {
        const params = { lat: geo.lat, lon: geo.lon, appid: apiKey, units: "metric" };
        console.log("assistant.getWeather: calling OpenWeather by ip-derived coords", { params });
        const r = await axios.get(baseUrl, { params, timeout: 10000 });
        const d = r.data;
        const weather = {
          city: d.name || geo.city || defaultCity,
          description: d.weather?.[0]?.description || "",
          temp: d.main?.temp ?? null,
          feels_like: d.main?.feels_like ?? null,
          humidity: d.main?.humidity ?? null,
          wind_speed: d.wind?.speed ?? null,
          coord: d.coord || { lat: geo.lat, lon: geo.lon },
          source: "ip"
        };
        return res.json(weather);
      } catch (err) {
        console.error("assistant.getWeather (ip coords -> openweather) error:", err.response?.data || err.message || err);
        // fallthrough to default city
      }
    } else {
      console.warn("assistant.getWeather: IP geolocation failed or returned no coords");
    }

    // Final fallback: use DEFAULT_CITY
    try {
      const params = { q: defaultCity, appid: apiKey, units: "metric" };
      console.log("assistant.getWeather: final fallback calling OpenWeather by DEFAULT_CITY", { params });
      const r = await axios.get(baseUrl, { params, timeout: 10000 });
      const d = r.data;
      const weather = {
        city: d.name || defaultCity,
        description: d.weather?.[0]?.description || "",
        temp: d.main?.temp ?? null,
        feels_like: d.main?.feels_like ?? null,
        humidity: d.main?.humidity ?? null,
        wind_speed: d.wind?.speed ?? null,
        coord: d.coord || null,
        source: "fallback"
      };
      return res.json(weather);
    } catch (err) {
      console.error("assistant.getWeather (final fallback) error:", err.response?.data || err.message || err);
      return res.status(500).json({ message: "error fetching weather" });
    }

  } catch (err) {
    console.error("assistant.getWeather unexpected error:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "error fetching weather" });
  }
};


module.exports = { getNews, getWeather };
