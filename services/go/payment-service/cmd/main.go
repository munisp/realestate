package main

import (
"context"
"fmt"
"log"
"net"
"net/http"
"os"
"os/signal"
"syscall"
"time"

"github.com/gin-gonic/gin"
"google.golang.org/grpc"
)

type PaymentService struct {
router *gin.Engine
grpcServer *grpc.Server
}

func NewPaymentService() *PaymentService {
router := gin.Default()

// Health check endpoint
router.GET("/health", func(c *gin.Context) {
(http.StatusOK, gin.H{"status": "healthy", "service": "payment-processing"})
})

// Payment processing endpoints
router.POST("/api/v1/payments/process", processPayment)
router.POST("/api/v1/payments/verify", verifyPayment)
router.POST("/api/v1/escrow/hold", holdEscrow)
router.POST("/api/v1/escrow/release", releaseEscrow)
router.GET("/api/v1/payments/:id/status", getPaymentStatus)

return &PaymentService{
router,
grpc.NewServer(),
}
}

func processPayment(c *gin.Context) {
var req struct {
  string  `json:"gateway"`
t   float64 `json:"amount"`
cy string  `json:"currency"`
map[string]interface{} `json:"metadata"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

// Simulate payment processing
paymentID := fmt.Sprintf("pay_%d", time.Now().Unix())

c.JSON(http.StatusOK, gin.H{
ment_id": paymentID,
"processing",
": req.Gateway,
t": req.Amount,
cy": req.Currency,
})
}

func verifyPayment(c *gin.Context) {
var req struct {
mentID string `json:"payment_id"`
ce string `json:"reference"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

c.JSON(http.StatusOK, gin.H{
ment_id": req.PaymentID,
"verified",
time.Now().Unix(),
})
}

func holdEscrow(c *gin.Context) {
var req struct {
mentID string  `json:"payment_id"`
t    float64 `json:"amount"`
e string  `json:"milestone"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

escrowID := fmt.Sprintf("esc_%d", time.Now().Unix())

c.JSON(http.StatusOK, gin.H{
escrowID,
"held",
t": req.Amount,
e": req.Milestone,
})
}

func releaseEscrow(c *gin.Context) {
var req struct {
string `json:"escrow_id"`
bool   `json:"verified"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

c.JSON(http.StatusOK, gin.H{
req.EscrowID,
"released",
time.Now().Unix(),
})
}

func getPaymentStatus(c *gin.Context) {
paymentID := c.Param("id")

c.JSON(http.StatusOK, gin.H{
ment_id": paymentID,
"completed",
t": 100000,
cy": "NGN",
})
}

func (s *PaymentService) Start() error {
// Start HTTP server
go func() {
tln("Starting HTTP server on :8081")
err := s.router.Run(":8081"); err != nil {
to start HTTP server:", err)
Start gRPC server
go func() {
err := net.Listen("tcp", ":50051")
err != nil {
to listen:", err)
tln("Starting gRPC server on :50051")
err := s.grpcServer.Serve(lis); err != nil {
to start gRPC server:", err)
 nil
}

func (s *PaymentService) Shutdown(ctx context.Context) error {
s.grpcServer.GracefulStop()
return nil
}

func main() {
service := NewPaymentService()

if err := service.Start(); err != nil {
to start service:", err)
}

// Wait for interrupt signal
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Println("Shutting down payment service...")

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := service.Shutdown(ctx); err != nil {
forced to shutdown:", err)
}

log.Println("Payment service stopped")
}
