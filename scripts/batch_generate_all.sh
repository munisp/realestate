#!/bin/bash

# Batch Generation Script - Creates all remaining service files
# This dramatically speeds up implementation by generating all files at once

set -e

BASE="/home/ubuntu/realestate-platform"

echo "================================================"
echo "BATCH GENERATION: All Remaining Services"
echo "================================================"

# Generate Developer Service remaining files (handlers, main, configs)
echo "1/6 Generating Developer Service complete implementation..."
cd "$BASE/services/developer-service"

# Create all remaining Developer Service files in one go
cat > internal/handler/developer_handler.go << 'EOFHANDLER'
package handler

import (
"net/http"
"strconv"

"github.com/gin-gonic/gin"
"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"github.com/realestate/developer-service/internal/service"
)

type DeveloperHandler struct {
service *service.DeveloperService
}

func NewDeveloperHandler(service *service.DeveloperService) *DeveloperHandler {
return &DeveloperHandler{service: service}
}

func (h *DeveloperHandler) CreateDeveloper(c *gin.Context) {
var developer model.Developer
if err := c.ShouldBindJSON(&developer); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

if err := h.service.CreateDeveloper(c.Request.Context(), &developer); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusCreated, developer)
}

func (h *DeveloperHandler) GetDeveloper(c *gin.Context) {
id, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
return
}

developer, err := h.service.GetDeveloper(c.Request.Context(), id)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, developer)
}

func (h *DeveloperHandler) ListDevelopers(c *gin.Context) {
skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

filters := make(map[string]interface{})
if status := c.Query("status"); status != "" {
filters["status"] = status
}

developers, total, err := h.service.ListDevelopers(c.Request.Context(), filters, skip, limit)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{
"developers": developers,
"total":      total,
"skip":       skip,
"limit":      limit,
})
}

func (h *DeveloperHandler) CreateProject(c *gin.Context) {
var project model.Project
if err := c.ShouldBindJSON(&project); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

if err := h.service.CreateProject(c.Request.Context(), &project); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusCreated, project)
}

func (h *DeveloperHandler) CreateUnit(c *gin.Context) {
var unit model.Unit
if err := c.ShouldBindJSON(&unit); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

if err := h.service.CreateUnit(c.Request.Context(), &unit); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusCreated, unit)
}

func (h *DeveloperHandler) ReserveUnit(c *gin.Context) {
unitID, _ := uuid.Parse(c.Param("id"))
var req struct {
UserID uuid.UUID `json:"user_id"`
}
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

if err := h.service.ReserveUnit(c.Request.Context(), unitID, req.UserID); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{"message": "unit reserved successfully"})
}

func (h *DeveloperHandler) GetInventoryAnalytics(c *gin.Context) {
projectID, err := uuid.Parse(c.Param("projectId"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
return
}

analytics, err := h.service.GetInventoryAnalytics(c.Request.Context(), projectID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, analytics)
}
EOFHANDLER

# Create main server file
cat > cmd/server/main.go << 'EOFMAIN'
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

"github.com/gin-gonic/gin"
"github.com/realestate/developer-service/internal/handler"
"github.com/realestate/developer-service/internal/repository"
"github.com/realestate/developer-service/internal/service"
"github.com/realestate/developer-service/pkg/database"
"github.com/realestate/developer-service/pkg/kafka"
"github.com/realestate/developer-service/pkg/logger"
)

func main() {
// Initialize logger
log := logger.New()

// Initialize database
db, err := database.Connect()
if err != nil {
log.Fatal("Failed to connect to database", "error", err)
}

// Auto-migrate models
database.AutoMigrate(db)

// Initialize Kafka producer
kafkaProducer, err := kafka.NewProducer()
if err != nil {
log.Fatal("Failed to initialize Kafka producer", "error", err)
}
defer kafkaProducer.Close()

// Initialize repositories
developerRepo := repository.NewDeveloperRepository(db)
projectRepo := repository.NewProjectRepository(db)
unitRepo := repository.NewUnitRepository(db)
milestoneRepo := repository.NewMilestoneRepository(db)
saleRepo := repository.NewSaleRepository(db)

// Initialize service
developerService := service.NewDeveloperService(
developerRepo,
projectRepo,
unitRepo,
milestoneRepo,
saleRepo,
kafkaProducer,
log,
)

// Initialize handler
developerHandler := handler.NewDeveloperHandler(developerService)

// Setup Gin router
router := gin.Default()

// Health check
router.GET("/health", func(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"status": "healthy"})
})

// API routes
v1 := router.Group("/api/v1")
{
// Developer routes
v1.POST("/developers", developerHandler.CreateDeveloper)
v1.GET("/developers/:id", developerHandler.GetDeveloper)
v1.GET("/developers", developerHandler.ListDevelopers)

// Project routes
v1.POST("/projects", developerHandler.CreateProject)

// Unit routes
v1.POST("/units", developerHandler.CreateUnit)
v1.POST("/units/:id/reserve", developerHandler.ReserveUnit)

// Analytics routes
v1.GET("/analytics/inventory/:projectId", developerHandler.GetInventoryAnalytics)
}

// Start server
port := os.Getenv("PORT")
if port == "" {
port = "3005"
}

srv := &http.Server{
Addr:    fmt.Sprintf(":%s", port),
Handler: router,
}

// Graceful shutdown
go func() {
if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
log.Fatal("Failed to start server", "error", err)
}
}()

log.Info("Developer Service started", "port", port)

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Info("Shutting down server...")

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := srv.Shutdown(ctx); err != nil {
log.Fatal("Server forced to shutdown", "error", err)
}

log.Info("Server exited")
}
EOFMAIN

# Create infrastructure packages
mkdir -p pkg/database pkg/kafka pkg/logger

cat > pkg/database/database.go << 'EOFDB'
package database

import (
"fmt"
"os"

"github.com/realestate/developer-service/internal/model"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)

func Connect() (*gorm.DB, error) {
dsn := fmt.Sprintf(
"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
os.Getenv("DB_HOST"),
os.Getenv("DB_PORT"),
os.Getenv("DB_USER"),
os.Getenv("DB_PASSWORD"),
os.Getenv("DB_NAME"),
)

db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
if err != nil {
return nil, err
}

return db, nil
}

func AutoMigrate(db *gorm.DB) error {
return db.AutoMigrate(
&model.Developer{},
&model.Project{},
&model.Unit{},
&model.Milestone{},
&model.Sale{},
)
}
EOFDB

cat > pkg/kafka/producer.go << 'EOFKAFKA'
package kafka

import (
"context"
"encoding/json"
"os"
"strings"

"github.com/segmentio/kafka-go"
)

type Producer struct {
writer *kafka.Writer
}

func NewProducer() (*Producer, error) {
brokers := strings.Split(os.Getenv("KAFKA_BROKERS"), ",")

writer := &kafka.Writer{
Addr:     kafka.TCP(brokers...),
Balancer: &kafka.LeastBytes{},
}

return &Producer{writer: writer}, nil
}

func (p *Producer) PublishEvent(topic string, data map[string]interface{}) error {
value, err := json.Marshal(data)
if err != nil {
return err
}

return p.writer.WriteMessages(context.Background(), kafka.Message{
Topic: topic,
Value: value,
})
}

func (p *Producer) Close() error {
return p.writer.Close()
}
EOFKAFKA

cat > pkg/logger/logger.go << 'EOFLOGGER'
package logger

import (
"os"

"github.com/sirupsen/logrus"
)

type Logger struct {
*logrus.Logger
}

func New() *Logger {
log := logrus.New()
log.SetOutput(os.Stdout)
log.SetFormatter(&logrus.JSONFormatter{})

level := os.Getenv("LOG_LEVEL")
if level == "" {
level = "info"
}

logLevel, err := logrus.ParseLevel(level)
if err != nil {
logLevel = logrus.InfoLevel
}
log.SetLevel(logLevel)

return &Logger{log}
}
EOFLOGGER

# Create Dockerfile
cat > Dockerfile << 'EOFDOCKER'
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o developer-service ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/developer-service .

EXPOSE 3005

CMD ["./developer-service"]
EOFDOCKER

# Create docker-compose.yml
cat > docker-compose.yml << 'EOFCOMPOSE'
version: '3.8'

services:
  developer-service:
    build: .
    ports:
      - "3005:3005"
    environment:
      - PORT=3005
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=developer_db
      - KAFKA_BROKERS=kafka:9092
      - LOG_LEVEL=info
    depends_on:
      - postgres
      - kafka
    networks:
      - developer-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=developer_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - developer-postgres-data:/var/lib/postgresql/data
    ports:
      - "5435:5432"
    networks:
      - developer-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - developer-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9095:9095"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9095
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - developer-network

networks:
  developer-network:
    driver: bridge

volumes:
  developer-postgres-data:
EOFCOMPOSE

# Create Kubernetes deployment
mkdir -p k8s
cat > k8s/deployment.yaml << 'EOFK8S'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: developer-service
  namespace: realestate
spec:
  replicas: 3
  selector:
    matchLabels:
      app: developer-service
  template:
    metadata:
      labels:
        app: developer-service
    spec:
      containers:
      - name: developer-service
        image: realestate/developer-service:latest
        ports:
        - containerPort: 3005
        env:
        - name: PORT
          value: "3005"
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "developer_db"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: developer-secrets
              key: db-user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: developer-secrets
              key: db-password
        - name: KAFKA_BROKERS
          value: "kafka-service:9092"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: developer-service
  namespace: realestate
spec:
  type: ClusterIP
  ports:
  - port: 3005
    targetPort: 3005
  selector:
    app: developer-service
EOFK8S

echo "✓ Developer Service complete (all files generated)"

echo "================================================"
echo "Developer Service: COMPLETE"
echo "================================================"
echo "Files created:"
echo "  - Handlers (HTTP API)"
echo "  - Main server"
echo "  - Database package"
echo "  - Kafka producer"
echo "  - Logger"
echo "  - Dockerfile"
echo "  - docker-compose.yml"
echo "  - Kubernetes deployment"
echo "================================================"

