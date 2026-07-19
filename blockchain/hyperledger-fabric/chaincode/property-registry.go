package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// PropertyRegistryContract provides functions for managing property records on the blockchain
type PropertyRegistryContract struct {
	contractapi.Contract
}

// Property represents a real estate property on the blockchain
type Property struct {
	PropertyID    string    `json:"propertyId"`
	Address       string    `json:"address"`
	Owner         string    `json:"owner"`
	PreviousOwner string    `json:"previousOwner,omitempty"`
	Price         float64   `json:"price"`
	SquareFeet    int       `json:"squareFeet"`
	Bedrooms      int       `json:"bedrooms"`
	Bathrooms     int       `json:"bathrooms"`
	YearBuilt     int       `json:"yearBuilt"`
	PropertyType  string    `json:"propertyType"`
	Status        string    `json:"status"` // available, under_contract, sold, foreclosure
	TitleHash     string    `json:"titleHash"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	TransferCount int       `json:"transferCount"`
}

// Transaction represents a property transaction
type Transaction struct {
	TransactionID string    `json:"transactionId"`
	PropertyID    string    `json:"propertyId"`
	FromOwner     string    `json:"fromOwner"`
	ToOwner       string    `json:"toOwner"`
	Price         float64   `json:"price"`
	Timestamp     time.Time `json:"timestamp"`
	TxType        string    `json:"txType"` // sale, transfer, foreclosure
	EscrowAddress string    `json:"escrowAddress,omitempty"`
	Status        string    `json:"status"` // pending, completed, cancelled
}

// InitLedger initializes the ledger with sample properties
func (c *PropertyRegistryContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	properties := []Property{
		{
			PropertyID:   "PROP001",
			Address:      "123 Main St, Lagos, Nigeria",
			Owner:        "ORG1",
			Price:        250000,
			SquareFeet:   2000,
			Bedrooms:     3,
			Bathrooms:    2,
			YearBuilt:    2020,
			PropertyType: "Single Family",
			Status:       "available",
			TitleHash:    "hash123",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	for _, property := range properties {
		propertyJSON, err := json.Marshal(property)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(property.PropertyID, propertyJSON)
		if err != nil {
			return fmt.Errorf("failed to put property to world state: %v", err)
		}
	}

	return nil
}

// RegisterProperty creates a new property on the blockchain
func (c *PropertyRegistryContract) RegisterProperty(ctx contractapi.TransactionContextInterface, propertyID string, address string, owner string, price float64, squareFeet int, bedrooms int, bathrooms int, yearBuilt int, propertyType string, titleHash string) error {
	exists, err := c.PropertyExists(ctx, propertyID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("property %s already exists", propertyID)
	}

	property := Property{
		PropertyID:    propertyID,
		Address:       address,
		Owner:         owner,
		Price:         price,
		SquareFeet:    squareFeet,
		Bedrooms:      bedrooms,
		Bathrooms:     bathrooms,
		YearBuilt:     yearBuilt,
		PropertyType:  propertyType,
		Status:        "available",
		TitleHash:     titleHash,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		TransferCount: 0,
	}

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// ReadProperty returns the property stored in the world state with given id
func (c *PropertyRegistryContract) ReadProperty(ctx contractapi.TransactionContextInterface, propertyID string) (*Property, error) {
	propertyJSON, err := ctx.GetStub().GetState(propertyID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if propertyJSON == nil {
		return nil, fmt.Errorf("property %s does not exist", propertyID)
	}

	var property Property
	err = json.Unmarshal(propertyJSON, &property)
	if err != nil {
		return nil, err
	}

	return &property, nil
}

// TransferProperty transfers ownership of a property
func (c *PropertyRegistryContract) TransferProperty(ctx contractapi.TransactionContextInterface, propertyID string, newOwner string, price float64, escrowAddress string) error {
	property, err := c.ReadProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	if property.Status != "available" && property.Status != "under_contract" {
		return fmt.Errorf("property is not available for transfer")
	}

	// Create transaction record
	transaction := Transaction{
		TransactionID: fmt.Sprintf("TX-%s-%d", propertyID, time.Now().Unix()),
		PropertyID:    propertyID,
		FromOwner:     property.Owner,
		ToOwner:       newOwner,
		Price:         price,
		Timestamp:     time.Now(),
		TxType:        "sale",
		EscrowAddress: escrowAddress,
		Status:        "pending",
	}

	transactionJSON, err := json.Marshal(transaction)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(transaction.TransactionID, transactionJSON)
	if err != nil {
		return err
	}

	// Update property
	property.PreviousOwner = property.Owner
	property.Owner = newOwner
	property.Price = price
	property.Status = "sold"
	property.UpdatedAt = time.Now()
	property.TransferCount++

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// UpdatePropertyStatus updates the status of a property
func (c *PropertyRegistryContract) UpdatePropertyStatus(ctx contractapi.TransactionContextInterface, propertyID string, status string) error {
	property, err := c.ReadProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	property.Status = status
	property.UpdatedAt = time.Now()

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// GetPropertyHistory returns the transaction history for a property
func (c *PropertyRegistryContract) GetPropertyHistory(ctx contractapi.TransactionContextInterface, propertyID string) ([]Transaction, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(propertyID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var transactions []Transaction
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var property Property
		if err := json.Unmarshal(response.Value, &property); err != nil {
			continue
		}

		transaction := Transaction{
			TransactionID: response.TxId,
			PropertyID:    property.PropertyID,
			ToOwner:       property.Owner,
			FromOwner:     property.PreviousOwner,
			Price:         property.Price,
			Timestamp:     time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)),
			Status:        "completed",
		}
		transactions = append(transactions, transaction)
	}

	return transactions, nil
}

// PropertyExists returns true when property with given ID exists in world state
func (c *PropertyRegistryContract) PropertyExists(ctx contractapi.TransactionContextInterface, propertyID string) (bool, error) {
	propertyJSON, err := ctx.GetStub().GetState(propertyID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return propertyJSON != nil, nil
}

// GetAllProperties returns all properties found in world state
func (c *PropertyRegistryContract) GetAllProperties(ctx contractapi.TransactionContextInterface) ([]*Property, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var properties []*Property
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var property Property
		err = json.Unmarshal(queryResponse.Value, &property)
		if err != nil {
			continue
		}
		properties = append(properties, &property)
	}

	return properties, nil
}

func main() {
	propertyChaincode, err := contractapi.NewChaincode(&PropertyRegistryContract{})
	if err != nil {
		fmt.Printf("Error creating property registry chaincode: %v\n", err)
		return
	}

	if err := propertyChaincode.Start(); err != nil {
		fmt.Printf("Error starting property registry chaincode: %v\n", err)
	}
}
