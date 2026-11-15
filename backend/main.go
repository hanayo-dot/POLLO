package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pollo/backend/api"
	"github.com/pollo/backend/internal/config"
)

func main() {
	cfg := config.Load()
	router := api.NewRouter(cfg)

	server := &http.Server{
		Addr:        ":" + cfg.Port,
		Handler:     router,
		ReadTimeout: 15 * time.Second,
		// Multi-year quality-screened vegetation subsets can take several minutes.
		// Each observation handler separately limits upstream work to four minutes.
		WriteTimeout: 5 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	// Listen for OS interrupt and termination signals for graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		fmt.Println("==========================================================")
		fmt.Printf(" POLLO Backend Service running on port %s\n", cfg.Port)
		fmt.Printf(" Mode: %s | API Prefix: %s\n", cfg.Env, cfg.APIPrefix)
		fmt.Printf(" Benchmark Region: Lake Victoria Basin (2000-2024)\n")
		fmt.Println("==========================================================")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server startup failed: %v", err)
		}
	}()

	<-stop
	fmt.Println("\nInitiating graceful server shutdown...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown with error: %v", err)
	}

	fmt.Println("POLLO Backend Service stopped cleanly.")
}
