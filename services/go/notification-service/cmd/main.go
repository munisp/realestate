package main

import (
"context"
"encoding/json"
"log"
"net/http"
"os"
"os/signal"
"sync"
"syscall"
"time"

"github.com/gin-gonic/gin"
"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
CheckOrigin: func(r *http.Request) bool {
 true
},
}

type Client struct {
ID     string
UserID string
Conn   *websocket.Conn
Send   chan []byte
}

type Hub struct {
clients    map[*Client]bool
broadcast  chan []byte
register   chan *Client
unregister chan *Client
mu         sync.RWMutex
}

func newHub() *Hub {
return &Hub{
 make(chan []byte),
  make(chan *Client),
register: make(chan *Client),
ts:    make(map[*Client]bool),
}
}

func (h *Hub) run() {
for {
{
client := <-h.register:
ts[client] = true
lock()
tf("Client registered: %s (User: %s)", client.ID, client.UserID)
client := <-h.unregister:
_, ok := h.clients[client]; ok {
ts, client)
t.Send)
lock()
tf("Client unregistered: %s", client.ID)
message := <-h.broadcast:
client := range h.clients {
{
client.Send <- message:
t.Send)
ts, client)
lock()
pe NotificationService struct {
router *gin.Engine
hub    *Hub
}

func NewNotificationService() *NotificationService {
router := gin.Default()
hub := newHub()

go hub.run()

service := &NotificationService{
router,
   hub,
}

// Health check
router.GET("/health", func(c *gin.Context) {
(http.StatusOK, gin.H{"status": "healthy", "service": "notification"})
})

// WebSocket endpoint
router.GET("/ws", service.handleWebSocket)

// REST API endpoints
router.POST("/api/v1/notifications/send", service.sendNotification)
router.POST("/api/v1/notifications/broadcast", service.broadcastNotification)

return service
}

func (s *NotificationService) handleWebSocket(c *gin.Context) {
userID := c.Query("user_id")
if userID == "" {
(http.StatusBadRequest, gin.H{"error": "user_id required"})

}

conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
if err != nil {
tln("WebSocket upgrade error:", err)

}

client := &Client{
    generateClientID(),
userID,
n:   conn,
d:   make(chan []byte, 256),
}

s.hub.register <- client

go s.writePump(client)
go s.readPump(client)
}

func (s *NotificationService) readPump(client *Client) {
defer func() {
register <- client
t.Conn.Close()
}()

for {
_, err := client.Conn.ReadMessage()
err != nil {
func (s *NotificationService) writePump(client *Client) {
ticker := time.NewTicker(54 * time.Second)
defer func() {
t.Conn.Close()
}()

for {
{
message, ok := <-client.Send:
!ok {
t.Conn.WriteMessage(websocket.CloseMessage, []byte{})

err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {

<-ticker.C:
err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {

func (s *NotificationService) sendNotification(c *gin.Context) {
var req struct {
 string                 `json:"user_id"`
pe    string                 `json:"type"`
  string                 `json:"title"`
string                 `json:"message"`
   map[string]interface{} `json:"data"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

notification := map[string]interface{}{
pe":    req.Type,
  req.Title,
req.Message,
   req.Data,
time.Now().Unix(),
}

message, _ := json.Marshal(notification)

// Send to specific user
s.hub.mu.RLock()
for client := range s.hub.clients {
client.UserID == req.UserID {
{
client.Send <- message:
lock()

c.JSON(http.StatusOK, gin.H{"status": "sent"})
}

func (s *NotificationService) broadcastNotification(c *gin.Context) {
var req struct {
pe    string                 `json:"type"`
  string                 `json:"title"`
string                 `json:"message"`
   map[string]interface{} `json:"data"`
}

if err := c.BindJSON(&req); err != nil {
(http.StatusBadRequest, gin.H{"error": err.Error()})

}

notification := map[string]interface{}{
pe":    req.Type,
  req.Title,
req.Message,
   req.Data,
time.Now().Unix(),
}

message, _ := json.Marshal(notification)
s.hub.broadcast <- message

c.JSON(http.StatusOK, gin.H{"status": "broadcast"})
}

func (s *NotificationService) Start() error {
log.Println("Starting notification service on :8082")
return s.router.Run(":8082")
}

func generateClientID() string {
return "client_" + time.Now().Format("20060102150405")
}

func main() {
service := NewNotificationService()

go func() {
err := service.Start(); err != nil {
to start service:", err)
uit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Println("Notification service stopped")
}
