package main

import (
"bytes"
"fmt"
"image"
"image/jpeg"
"image/png"
"log"
"net/http"
"os"
"os/signal"
"strconv"
"syscall"

"github.com/gin-gonic/gin"
"github.com/nfnt/resize"
)

type ImageService struct {
router *gin.Engine
}

func NewImageService() *ImageService {
router := gin.Default()

router.GET("/health", func(c *gin.Context) {
(http.StatusOK, gin.H{"status": "healthy", "service": "image-processing"})
})

router.POST("/api/v1/images/resize", resizeImage)
router.POST("/api/v1/images/thumbnail", generateThumbnail)
router.POST("/api/v1/images/optimize", optimizeImage)
router.POST("/api/v1/images/convert", convertFormat)

return &ImageService{router: router}
}

func resizeImage(c *gin.Context) {
file, err := c.FormFile("image")
if err != nil {
(http.StatusBadRequest, gin.H{"error": "No image file provided"})

}

width, _ := strconv.Atoi(c.PostForm("width"))
height, _ := strconv.Atoi(c.PostForm("height"))

if width == 0 {
= 800
}
if height == 0 {
= 0 // maintain aspect ratio
}

src, err := file.Open()
if err != nil {
(http.StatusInternalServerError, gin.H{"error": "Failed to open image"})

}
defer src.Close()

img, format, err := image.Decode(src)
if err != nil {
(http.StatusBadRequest, gin.H{"error": "Invalid image format"})

}

resized := resize.Resize(uint(width), uint(height), img, resize.Lanczos3)

var buf bytes.Buffer
switch format {
case "jpeg", "jpg":
code(&buf, resized, &jpeg.Options{Quality: 85})
case "png":
g.Encode(&buf, resized)
default:
code(&buf, resized, &jpeg.Options{Quality: 85})
}

c.Data(http.StatusOK, "image/"+format, buf.Bytes())
}

func generateThumbnail(c *gin.Context) {
file, err := c.FormFile("image")
if err != nil {
(http.StatusBadRequest, gin.H{"error": "No image file provided"})

}

src, err := file.Open()
if err != nil {
(http.StatusInternalServerError, gin.H{"error": "Failed to open image"})

}
defer src.Close()

img, _, err := image.Decode(src)
if err != nil {
(http.StatusBadRequest, gin.H{"error": "Invalid image format"})

}

thumbnail := resize.Thumbnail(200, 200, img, resize.Lanczos3)

var buf bytes.Buffer
jpeg.Encode(&buf, thumbnail, &jpeg.Options{Quality: 80})

c.Data(http.StatusOK, "image/jpeg", buf.Bytes())
}

func optimizeImage(c *gin.Context) {
file, err := c.FormFile("image")
if err != nil {
(http.StatusBadRequest, gin.H{"error": "No image file provided"})

}

quality, _ := strconv.Atoi(c.PostForm("quality"))
if quality == 0 || quality > 100 {
uality = 75
}

src, err := file.Open()
if err != nil {
(http.StatusInternalServerError, gin.H{"error": "Failed to open image"})

}
defer src.Close()

img, _, err := image.Decode(src)
if err != nil {
(http.StatusBadRequest, gin.H{"error": "Invalid image format"})

}

var buf bytes.Buffer
jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality})

c.Data(http.StatusOK, "image/jpeg", buf.Bytes())
}

func convertFormat(c *gin.Context) {
file, err := c.FormFile("image")
if err != nil {
(http.StatusBadRequest, gin.H{"error": "No image file provided"})

}

targetFormat := c.PostForm("format")
if targetFormat == "" {
= "jpeg"
}

src, err := file.Open()
if err != nil {
(http.StatusInternalServerError, gin.H{"error": "Failed to open image"})

}
defer src.Close()

img, _, err := image.Decode(src)
if err != nil {
(http.StatusBadRequest, gin.H{"error": "Invalid image format"})

}

var buf bytes.Buffer
var contentType string

switch targetFormat {
case "png":
g.Encode(&buf, img)
tentType = "image/png"
case "jpeg", "jpg":
code(&buf, img, &jpeg.Options{Quality: 85})
tentType = "image/jpeg"
default:
(http.StatusBadRequest, gin.H{"error": "Unsupported format"})

}

c.Data(http.StatusOK, contentType, buf.Bytes())
}

func (s *ImageService) Start() error {
log.Println("Starting image processing service on :8083")
return s.router.Run(":8083")
}

func main() {
service := NewImageService()

go func() {
err := service.Start(); err != nil {
to start service:", err)
uit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Println("Image processing service stopped")
}
