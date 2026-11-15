package config

import (
	"os"
	"strings"
)

// Config represents runtime application configuration
type Config struct {
	Port                 string
	Env                  string
	APIPrefix            string
	CORSAllowedOrigins   []string
	NASAEarthdataUser    string
	NASAEarthdataPass    string
	NASAEarthdataToken   string
	NASAGIBSEndpoint     string
	CacheDir             string
	EnableLocalBenchmark bool
	UseSpatialEngine     bool
}

// Load reads configuration from environment variables or returns defaults
func Load() *Config {
	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")
	apiPrefix := getEnv("API_PREFIX", "/api/v1")
	corsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
	origins := strings.Split(corsRaw, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	nasaUser := getEnv("NASA_EARTHDATA_USERNAME", "")
	nasaPass := getEnv("NASA_EARTHDATA_PASSWORD", "")
	nasaToken := getEnv("NASA_EARTHDATA_BEARER_TOKEN", "")
	gibsEndpoint := getEnv("NASA_GIBS_ENDPOINT", "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best")
	cacheDir := getEnv("CACHE_DIR", "./data/cache")
	enableBenchmark := getEnv("ENABLE_LOCAL_BENCHMARK", "true") == "true"
	useSpatialEngine := getEnv("USE_SPATIAL_ENGINE", "true") == "true"

	return &Config{
		Port:                 port,
		Env:                  env,
		APIPrefix:            apiPrefix,
		CORSAllowedOrigins:   origins,
		NASAEarthdataUser:    nasaUser,
		NASAEarthdataPass:    nasaPass,
		NASAEarthdataToken:   nasaToken,
		NASAGIBSEndpoint:     gibsEndpoint,
		CacheDir:             cacheDir,
		EnableLocalBenchmark: enableBenchmark,
		UseSpatialEngine:     useSpatialEngine,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
