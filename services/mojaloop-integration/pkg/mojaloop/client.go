package mojaloop

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Client wraps Mojaloop API operations
type Client struct {
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
	dfspID     string
}

// NewClient creates a new Mojaloop client
func NewClient(baseURL, dfspID string, logger *zap.Logger) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
		dfspID: dfspID,
	}
}

// PartyIdentifier represents a party in Mojaloop
type PartyIdentifier struct {
	PartyIDType string `json:"partyIdType"` // MSISDN, EMAIL, PERSONAL_ID, BUSINESS, etc.
	PartyID     string `json:"partyId"`
	SubIDOrType string `json:"subIdOrType,omitempty"`
	FSPId       string `json:"fspId,omitempty"`
}

// Money represents an amount with currency
type Money struct {
	Currency string `json:"currency"` // ISO 4217 currency code
	Amount   string `json:"amount"`   // Decimal string
}

// TransferRequest represents a transfer request
type TransferRequest struct {
	TransferID      string          `json:"transferId"`
	PayerFSP        string          `json:"payerFsp"`
	PayeeFSP        string          `json:"payeeFsp"`
	Amount          Money           `json:"amount"`
	ILPPacket       string          `json:"ilpPacket"`
	Condition       string          `json:"condition"`
	Expiration      time.Time       `json:"expiration"`
	ExtensionList   []Extension     `json:"extensionList,omitempty"`
}

// TransferFulfil represents a transfer fulfillment
type TransferFulfil struct {
	Fulfilment      string      `json:"fulfilment"`
	CompletedTime   time.Time   `json:"completedTimestamp"`
	TransferState   string      `json:"transferState"`
	ExtensionList   []Extension `json:"extensionList,omitempty"`
}

// QuoteRequest represents a quote request
type QuoteRequest struct {
	QuoteID       string          `json:"quoteId"`
	TransactionID string          `json:"transactionId"`
	Payer         PartyIdentifier `json:"payer"`
	Payee         PartyIdentifier `json:"payee"`
	AmountType    string          `json:"amountType"` // SEND or RECEIVE
	Amount        Money           `json:"amount"`
	TransactionType TransactionType `json:"transactionType"`
	Note          string          `json:"note,omitempty"`
	ExtensionList []Extension     `json:"extensionList,omitempty"`
}

// QuoteResponse represents a quote response
type QuoteResponse struct {
	TransferAmount Money       `json:"transferAmount"`
	PayeeReceiveAmount Money   `json:"payeeReceiveAmount,omitempty"`
	PayeeFSPFee    Money       `json:"payeeFspFee,omitempty"`
	PayeeFSPCommission Money   `json:"payeeFspCommission,omitempty"`
	Expiration     time.Time   `json:"expiration"`
	ILPPacket      string      `json:"ilpPacket"`
	Condition      string      `json:"condition"`
	ExtensionList  []Extension `json:"extensionList,omitempty"`
}

// TransactionType represents the type of transaction
type TransactionType struct {
	Scenario        string `json:"scenario"`        // DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT, REFUND
	SubScenario     string `json:"subScenario,omitempty"`
	Initiator       string `json:"initiator"`       // PAYER or PAYEE
	InitiatorType   string `json:"initiatorType"`   // CONSUMER, AGENT, BUSINESS, DEVICE
	RefundInfo      *RefundInfo `json:"refundInfo,omitempty"`
}

// RefundInfo represents refund information
type RefundInfo struct {
	OriginalTransactionID string `json:"originalTransactionId"`
	RefundReason          string `json:"refundReason,omitempty"`
}

// Extension represents a key-value extension
type Extension struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// PartyLookup performs a party lookup
func (c *Client) PartyLookup(ctx context.Context, partyType, partyID string) (*PartyIdentifier, error) {
	url := fmt.Sprintf("%s/parties/%s/%s", c.baseURL, partyType, partyID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform lookup: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("lookup failed with status %d: %s", resp.StatusCode, string(body))
	}

	var party PartyIdentifier
	if err := json.NewDecoder(resp.Body).Decode(&party); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	c.logger.Info("Party lookup successful",
		zap.String("party_type", partyType),
		zap.String("party_id", partyID),
	)

	return &party, nil
}

// RequestQuote requests a quote for a transfer
func (c *Client) RequestQuote(ctx context.Context, req QuoteRequest) (*QuoteResponse, error) {
	url := fmt.Sprintf("%s/quotes", c.baseURL)
	
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to request quote: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("quote request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var quote QuoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&quote); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	c.logger.Info("Quote requested successfully",
		zap.String("quote_id", req.QuoteID),
		zap.String("amount", req.Amount.Amount),
		zap.String("currency", req.Amount.Currency),
	)

	return &quote, nil
}

// InitiateTransfer initiates a transfer
func (c *Client) InitiateTransfer(ctx context.Context, req TransferRequest) error {
	url := fmt.Sprintf("%s/transfers", c.baseURL)
	
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to initiate transfer: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("transfer failed with status %d: %s", resp.StatusCode, string(body))
	}

	c.logger.Info("Transfer initiated successfully",
		zap.String("transfer_id", req.TransferID),
		zap.String("amount", req.Amount.Amount),
		zap.String("currency", req.Amount.Currency),
	)

	return nil
}

// FulfilTransfer fulfills a transfer
func (c *Client) FulfilTransfer(ctx context.Context, transferID string, fulfil TransferFulfil) error {
	url := fmt.Sprintf("%s/transfers/%s", c.baseURL, transferID)
	
	body, err := json.Marshal(fulfil)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to fulfil transfer: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("fulfillment failed with status %d: %s", resp.StatusCode, string(body))
	}

	c.logger.Info("Transfer fulfilled successfully",
		zap.String("transfer_id", transferID),
	)

	return nil
}

// GetTransferStatus gets the status of a transfer
func (c *Client) GetTransferStatus(ctx context.Context, transferID string) (string, error) {
	url := fmt.Sprintf("%s/transfers/%s", c.baseURL, transferID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get transfer status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("status check failed with status %d: %s", resp.StatusCode, string(body))
	}

	var transfer struct {
		TransferState string `json:"transferState"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&transfer); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return transfer.TransferState, nil
}

// Helper functions

func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/vnd.interoperability.transfers+json;version=1.1")
	req.Header.Set("Accept", "application/vnd.interoperability.transfers+json;version=1.1")
	req.Header.Set("FSPIOP-Source", c.dfspID)
	req.Header.Set("Date", time.Now().UTC().Format(http.TimeFormat))
}

// GenerateTransferID generates a new transfer ID
func GenerateTransferID() string {
	return uuid.New().String()
}

// GenerateQuoteID generates a new quote ID
func GenerateQuoteID() string {
	return uuid.New().String()
}

// GenerateTransactionID generates a new transaction ID
func GenerateTransactionID() string {
	return uuid.New().String()
}
