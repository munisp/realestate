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
