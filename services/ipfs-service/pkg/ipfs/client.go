package ipfs

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	shell "github.com/ipfs/go-ipfs-api"
	"go.uber.org/zap"
)

// Client wraps IPFS operations
type Client struct {
	shell  *shell.Shell
	logger *zap.Logger
	apiURL string
}

// NewClient creates a new IPFS client
func NewClient(apiURL string, logger *zap.Logger) *Client {
	sh := shell.NewShell(apiURL)
	return &Client{
		shell:  sh,
		logger: logger,
		apiURL: apiURL,
	}
}

// Document represents a document stored in IPFS
type Document struct {
	Hash        string    `json:"hash"`
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	ContentType string    `json:"contentType"`
	Encrypted   bool      `json:"encrypted"`
	UploadedAt  time.Time `json:"uploadedAt"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// UploadDocument uploads a document to IPFS
func (c *Client) UploadDocument(ctx context.Context, data []byte, filename string, contentType string) (*Document, error) {
	hash, err := c.shell.Add(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to upload to IPFS: %w", err)
	}

	doc := &Document{
		Hash:        hash,
		Name:        filename,
		Size:        int64(len(data)),
		ContentType: contentType,
		Encrypted:   false,
		UploadedAt:  time.Now(),
	}

	c.logger.Info("Document uploaded to IPFS",
		zap.String("hash", hash),
		zap.String("filename", filename),
		zap.Int64("size", doc.Size),
	)

	return doc, nil
}

// UploadEncryptedDocument uploads an encrypted document to IPFS
func (c *Client) UploadEncryptedDocument(ctx context.Context, data []byte, filename string, contentType string, encryptionKey []byte) (*Document, error) {
	// Encrypt the data
	encryptedData, err := c.encrypt(data, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt document: %w", err)
	}

	hash, err := c.shell.Add(bytes.NewReader(encryptedData))
	if err != nil {
		return nil, fmt.Errorf("failed to upload encrypted document to IPFS: %w", err)
	}

	doc := &Document{
		Hash:        hash,
		Name:        filename,
		Size:        int64(len(encryptedData)),
		ContentType: contentType,
		Encrypted:   true,
		UploadedAt:  time.Now(),
	}

	c.logger.Info("Encrypted document uploaded to IPFS",
		zap.String("hash", hash),
		zap.String("filename", filename),
		zap.Int64("size", doc.Size),
	)

	return doc, nil
}

// DownloadDocument downloads a document from IPFS
func (c *Client) DownloadDocument(ctx context.Context, hash string) ([]byte, error) {
	reader, err := c.shell.Cat(hash)
	if err != nil {
		return nil, fmt.Errorf("failed to download from IPFS: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read IPFS data: %w", err)
	}

	c.logger.Info("Document downloaded from IPFS",
		zap.String("hash", hash),
		zap.Int("size", len(data)),
	)

	return data, nil
}

// DownloadEncryptedDocument downloads and decrypts a document from IPFS
func (c *Client) DownloadEncryptedDocument(ctx context.Context, hash string, encryptionKey []byte) ([]byte, error) {
	encryptedData, err := c.DownloadDocument(ctx, hash)
	if err != nil {
		return nil, err
	}

	// Decrypt the data
	data, err := c.decrypt(encryptedData, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt document: %w", err)
	}

	c.logger.Info("Encrypted document downloaded and decrypted from IPFS",
		zap.String("hash", hash),
	)

	return data, nil
}

// PinDocument pins a document to ensure it stays in IPFS
func (c *Client) PinDocument(ctx context.Context, hash string) error {
	err := c.shell.Pin(hash)
	if err != nil {
		return fmt.Errorf("failed to pin document: %w", err)
	}

	c.logger.Info("Document pinned",
		zap.String("hash", hash),
	)

	return nil
}

// UnpinDocument unpins a document
func (c *Client) UnpinDocument(ctx context.Context, hash string) error {
	err := c.shell.Unpin(hash)
	if err != nil {
		return fmt.Errorf("failed to unpin document: %w", err)
	}

	c.logger.Info("Document unpinned",
		zap.String("hash", hash),
	)

	return nil
}

// GetDocumentInfo gets information about a document
func (c *Client) GetDocumentInfo(ctx context.Context, hash string) (*Document, error) {
	stat, err := c.shell.ObjectStat(hash)
	if err != nil {
		return nil, fmt.Errorf("failed to get document info: %w", err)
	}

	doc := &Document{
		Hash: hash,
		Size: int64(stat.CumulativeSize),
	}

	return doc, nil
}

// UploadMultipleDocuments uploads multiple documents and returns their hashes
func (c *Client) UploadMultipleDocuments(ctx context.Context, files []*multipart.FileHeader) ([]Document, error) {
	var documents []Document

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open file %s: %w", fileHeader.Filename, err)
		}
		defer file.Close()

		data, err := io.ReadAll(file)
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %w", fileHeader.Filename, err)
		}

		doc, err := c.UploadDocument(ctx, data, fileHeader.Filename, fileHeader.Header.Get("Content-Type"))
		if err != nil {
			return nil, fmt.Errorf("failed to upload file %s: %w", fileHeader.Filename, err)
		}

		documents = append(documents, *doc)
	}

	return documents, nil
}

// CreateDirectory creates a directory in IPFS
func (c *Client) CreateDirectory(ctx context.Context, name string) (string, error) {
	hash, err := c.shell.NewObject("unixfs-dir")
	if err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	c.logger.Info("Directory created in IPFS",
		zap.String("hash", hash),
		zap.String("name", name),
	)

	return hash, nil
}

// AddToDirectory adds a file to a directory
func (c *Client) AddToDirectory(ctx context.Context, dirHash, filename, fileHash string) (string, error) {
	newDirHash, err := c.shell.PatchLink(dirHash, filename, fileHash, true)
	if err != nil {
		return "", fmt.Errorf("failed to add file to directory: %w", err)
	}

	c.logger.Info("File added to directory",
		zap.String("dir_hash", newDirHash),
		zap.String("filename", filename),
		zap.String("file_hash", fileHash),
	)

	return newDirHash, nil
}

// GetGatewayURL returns the HTTP gateway URL for a hash
func (c *Client) GetGatewayURL(hash string) string {
	return fmt.Sprintf("https://ipfs.io/ipfs/%s", hash)
}

// VerifyDocument verifies the integrity of a document
func (c *Client) VerifyDocument(ctx context.Context, hash string, expectedChecksum string) (bool, error) {
	data, err := c.DownloadDocument(ctx, hash)
	if err != nil {
		return false, err
	}

	checksum := c.calculateChecksum(data)
	return checksum == expectedChecksum, nil
}

// Helper functions

func (c *Client) encrypt(data []byte, key []byte) ([]byte, error) {
	// Use AES-256-GCM for encryption
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	return ciphertext, nil
}

func (c *Client) decrypt(data []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

func (c *Client) calculateChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// GenerateEncryptionKey generates a random encryption key
func GenerateEncryptionKey() ([]byte, error) {
	key := make([]byte, 32) // 256-bit key
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}
