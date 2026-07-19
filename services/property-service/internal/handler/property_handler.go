package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/realestate-platform/property-service/internal/model"
	"github.com/realestate-platform/property-service/internal/service"
	"go.uber.org/zap"
)

type PropertyHandler struct {
	service service.PropertyService
	logger  *zap.Logger
}

func NewPropertyHandler(service service.PropertyService, logger *zap.Logger) *PropertyHandler {
	return &PropertyHandler{
		service: service,
		logger:  logger,
	}
}

func (h *PropertyHandler) Create(c *gin.Context) {
	var req model.CreatePropertyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	uid, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}
	
	property, err := h.service.CreateProperty(c.Request.Context(), &req, uid)
	if err != nil {
		h.logger.Error("Failed to create property", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create property"})
		return
	}
	
	c.JSON(http.StatusCreated, property)
}

func (h *PropertyHandler) Get(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property ID"})
		return
	}
	
	property, err := h.service.GetProperty(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get property", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "property not found"})
		return
	}
	
	// Record view
	if userID, exists := c.Get("user_id"); exists {
		if uid, err := uuid.Parse(userID.(string)); err == nil {
			go h.service.RecordView(c.Request.Context(), id, uid)
		}
	}
	
	c.JSON(http.StatusOK, property)
}

func (h *PropertyHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	
	if limit > 100 {
		limit = 100
	}
	
	properties, err := h.service.ListProperties(c.Request.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list properties", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list properties"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"properties": properties,
		"limit":      limit,
		"offset":     offset,
	})
}

func (h *PropertyHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property ID"})
		return
	}
	
	var req model.UpdatePropertyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	uid, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}
	
	property, err := h.service.UpdateProperty(c.Request.Context(), id, &req, uid)
	if err != nil {
		h.logger.Error("Failed to update property", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, property)
}

func (h *PropertyHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property ID"})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	uid, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}
	
	if err := h.service.DeleteProperty(c.Request.Context(), id, uid); err != nil {
		h.logger.Error("Failed to delete property", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "property deleted successfully"})
}

func (h *PropertyHandler) GetNearby(c *gin.Context) {
	latStr := c.Query("lat")
	lonStr := c.Query("lon")
	radiusStr := c.DefaultQuery("radius", "10")
	limitStr := c.DefaultQuery("limit", "20")
	
	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid latitude"})
		return
	}
	
	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid longitude"})
		return
	}
	
	radius, _ := strconv.ParseFloat(radiusStr, 64)
	limit, _ := strconv.Atoi(limitStr)
	
	if limit > 100 {
		limit = 100
	}
	
	properties, err := h.service.GetNearbyProperties(c.Request.Context(), lat, lon, radius, limit)
	if err != nil {
		h.logger.Error("Failed to get nearby properties", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get nearby properties"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"properties": properties,
		"latitude":   lat,
		"longitude":  lon,
		"radius_km":  radius,
	})
}
