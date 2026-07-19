package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// PropertyAnalytics represents analytics data for a property
type PropertyAnalytics struct {
	PropertyID      string    `json:"propertyId"`
	Views           int       `json:"views"`
	Favorites       int       `json:"favorites"`
	Inquiries       int       `json:"inquiries"`
	AverageViewTime int       `json:"averageViewTime"`
	LastViewed      time.Time `json:"lastViewed"`
}

// MarketTrend represents market trend data for a location
type MarketTrend struct {
	Location      string  `json:"location"`
	AveragePrice  float64 `json:"averagePrice"`
	PriceChange   float64 `json:"priceChange"`
	TotalListings int     `json:"totalListings"`
	Period        string  `json:"period"`
}

var db *sql.DB

func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err = db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS go_property_analytics (
			property_id     TEXT PRIMARY KEY,
			views           INTEGER NOT NULL DEFAULT 0,
			favorites       INTEGER NOT NULL DEFAULT 0,
			inquiries       INTEGER NOT NULL DEFAULT 0,
			avg_view_time   INTEGER NOT NULL DEFAULT 0,
			last_viewed     TIMESTAMPTZ,
			updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS go_market_trends (
			location        TEXT PRIMARY KEY,
			average_price   DOUBLE PRECISION NOT NULL DEFAULT 0,
			price_change    DOUBLE PRECISION NOT NULL DEFAULT 0,
			total_listings  INTEGER NOT NULL DEFAULT 0,
			period          TEXT NOT NULL DEFAULT 'month',
			updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}
	log.Println("Database initialized successfully")
}

func main() {
	initDB()
	defer db.Close()
	r := mux.NewRouter()
	r.HandleFunc("/analytics/property/{id}", getPropertyAnalytics).Methods("GET")
	r.HandleFunc("/analytics/property/{id}/view", recordPropertyView).Methods("POST")
	r.HandleFunc("/analytics/property/{id}/favorite", recordFavorite).Methods("POST")
	r.HandleFunc("/analytics/property/{id}/inquiry", recordInquiry).Methods("POST")
	r.HandleFunc("/analytics/market/{location}", getMarketTrends).Methods("GET")
	r.HandleFunc("/analytics/market", updateMarketTrends).Methods("POST")
	r.HandleFunc("/health", healthCheck).Methods("GET")
	log.Println("Go analytics service running on :5115")
	log.Fatal(http.ListenAndServe(":5115", r))
}

func ensureRow(propertyID string) {
	db.Exec(`INSERT INTO go_property_analytics (property_id) VALUES ($1) ON CONFLICT DO NOTHING`, propertyID)
}

func getPropertyAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]
	ensureRow(propertyID)
	analytics := &PropertyAnalytics{PropertyID: propertyID, LastViewed: time.Now()}
	db.QueryRow(`SELECT views, favorites, inquiries, avg_view_time, COALESCE(last_viewed, NOW()) FROM go_property_analytics WHERE property_id = $1`, propertyID).Scan(&analytics.Views, &analytics.Favorites, &analytics.Inquiries, &analytics.AverageViewTime, &analytics.LastViewed)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordPropertyView(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]
	ensureRow(propertyID)
	var viewData struct{ ViewTime int `json:"viewTime"` }
	json.NewDecoder(r.Body).Decode(&viewData)
	analytics := &PropertyAnalytics{PropertyID: propertyID}
	db.QueryRow(`UPDATE go_property_analytics SET views = views + 1, last_viewed = NOW(), avg_view_time = CASE WHEN $2 > 0 THEN (avg_view_time * views + $2) / (views + 1) ELSE avg_view_time END, updated_at = NOW() WHERE property_id = $1 RETURNING views, favorites, inquiries, avg_view_time, COALESCE(last_viewed, NOW())`, propertyID, viewData.ViewTime).Scan(&analytics.Views, &analytics.Favorites, &analytics.Inquiries, &analytics.AverageViewTime, &analytics.LastViewed)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordFavorite(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]
	ensureRow(propertyID)
	analytics := &PropertyAnalytics{PropertyID: propertyID}
	db.QueryRow(`UPDATE go_property_analytics SET favorites = favorites + 1, updated_at = NOW() WHERE property_id = $1 RETURNING views, favorites, inquiries, avg_view_time, COALESCE(last_viewed, NOW())`, propertyID).Scan(&analytics.Views, &analytics.Favorites, &analytics.Inquiries, &analytics.AverageViewTime, &analytics.LastViewed)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordInquiry(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]
	ensureRow(propertyID)
	analytics := &PropertyAnalytics{PropertyID: propertyID}
	db.QueryRow(`UPDATE go_property_analytics SET inquiries = inquiries + 1, updated_at = NOW() WHERE property_id = $1 RETURNING views, favorites, inquiries, avg_view_time, COALESCE(last_viewed, NOW())`, propertyID).Scan(&analytics.Views, &analytics.Favorites, &analytics.Inquiries, &analytics.AverageViewTime, &analytics.LastViewed)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func getMarketTrends(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	location := vars["location"]
	trend := &MarketTrend{Location: location, Period: "month"}
	db.QueryRow(`SELECT average_price, price_change, total_listings, period FROM go_market_trends WHERE location = $1`, location).Scan(&trend.AveragePrice, &trend.PriceChange, &trend.TotalListings, &trend.Period)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trend)
}

func updateMarketTrends(w http.ResponseWriter, r *http.Request) {
	var trend MarketTrend
	if err := json.NewDecoder(r.Body).Decode(&trend); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := db.Exec(`INSERT INTO go_market_trends (location, average_price, price_change, total_listings, period, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (location) DO UPDATE SET average_price = EXCLUDED.average_price, price_change = EXCLUDED.price_change, total_listings = EXCLUDED.total_listings, period = EXCLUDED.period, updated_at = NOW()`, trend.Location, trend.AveragePrice, trend.PriceChange, trend.TotalListings, trend.Period)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trend)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	status := "healthy"
	httpStatus := http.StatusOK
	if err := db.Ping(); err != nil {
		status = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(map[string]string{"status": status, "service": "go-analytics"})
}
