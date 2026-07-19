package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

type PropertyAnalytics struct {
	PropertyID      string    `json:"propertyId"`
	Views           int       `json:"views"`
	Favorites       int       `json:"favorites"`
	Inquiries       int       `json:"inquiries"`
	AverageViewTime int       `json:"averageViewTime"`
	LastViewed      time.Time `json:"lastViewed"`
}

type MarketTrend struct {
	Location      string  `json:"location"`
	AveragePrice  float64 `json:"averagePrice"`
	PriceChange   float64 `json:"priceChange"`
	TotalListings int     `json:"totalListings"`
	Period        string  `json:"period"`
}

var analyticsStore = make(map[string]*PropertyAnalytics)
var marketTrends = make(map[string]*MarketTrend)

func main() {
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

func getPropertyAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]

	analytics, exists := analyticsStore[propertyID]
	if !exists {
		analytics = &PropertyAnalytics{
			PropertyID: propertyID,
			Views:      0,
			Favorites:  0,
			Inquiries:  0,
		}
		analyticsStore[propertyID] = analytics
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordPropertyView(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]

	analytics, exists := analyticsStore[propertyID]
	if !exists {
		analytics = &PropertyAnalytics{
			PropertyID: propertyID,
		}
		analyticsStore[propertyID] = analytics
	}

	analytics.Views++
	analytics.LastViewed = time.Now()

	var viewData struct {
		ViewTime int `json:"viewTime"`
	}
	json.NewDecoder(r.Body).Decode(&viewData)

	if viewData.ViewTime > 0 {
		totalTime := analytics.AverageViewTime * (analytics.Views - 1)
		analytics.AverageViewTime = (totalTime + viewData.ViewTime) / analytics.Views
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordFavorite(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]

	analytics, exists := analyticsStore[propertyID]
	if !exists {
		analytics = &PropertyAnalytics{
			PropertyID: propertyID,
		}
		analyticsStore[propertyID] = analytics
	}

	analytics.Favorites++

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func recordInquiry(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	propertyID := vars["id"]

	analytics, exists := analyticsStore[propertyID]
	if !exists {
		analytics = &PropertyAnalytics{
			PropertyID: propertyID,
		}
		analyticsStore[propertyID] = analytics
	}

	analytics.Inquiries++

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analytics)
}

func getMarketTrends(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	location := vars["location"]

	trend, exists := marketTrends[location]
	if !exists {
		trend = &MarketTrend{
			Location:      location,
			AveragePrice:  0,
			PriceChange:   0,
			TotalListings: 0,
			Period:        "month",
		}
		marketTrends[location] = trend
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trend)
}

func updateMarketTrends(w http.ResponseWriter, r *http.Request) {
	var trend MarketTrend
	err := json.NewDecoder(r.Body).Decode(&trend)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	marketTrends[trend.Location] = &trend

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trend)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "go-analytics",
	})
}
