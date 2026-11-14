package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/pollo/backend/api"
	"github.com/pollo/backend/internal/config"
)

func main() {
	cfg := config.Load()
	router := api.NewRouter(cfg)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Println("==========================================================")
	fmt.Printf(" POLLO Backend Service running on port %s\n", cfg.Port)
	fmt.Printf(" Mode: %s | API Prefix: %s\n", cfg.Env, cfg.APIPrefix)
	fmt.Printf(" Benchmark Region: Lake Victoria Basin (2000-2024)\n")
	fmt.Println("==========================================================")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to start: %v", err)
	}
}
