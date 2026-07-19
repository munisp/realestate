package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// PropertyContract provides functions for managing properties on the blockchain
type PropertyContract struct {
	contractapi.Contract
}

// Property represents a real estate property on the blockchain
type Property struct {
	PropertyID       string    `json:"propertyId"`
	Address          string    `json:"address"`
	City             string    `json:"city"`
	State            string    `json:"state"`
	ZipCode          string    `json:"zipCode"`
	Country          string    `json:"country"`
	PropertyType     string    `json:"propertyType"`
	OwnerID          string    `json:"ownerId"`
	OwnerName        string    `json:"ownerName"`
	PreviousOwnerID  string    `json:"previousOwnerId,omitempty"`
	PurchasePrice    float64   `json:"purchasePrice"`
	CurrentValue     float64   `json:"currentValue"`
	SquareFeet       int       `json:"squareFeet"`
	YearBuilt        int       `json:"yearBuilt"`
	TitleDeedHash    string    `json:"titleDeedHash"` // IPFS hash
	DocumentsHash    string    `json:"documentsHash"` // IPFS hash
	RegistrationDate time.Time `json:"registrationDate"`
	LastTransferDate time.Time `json:"lastTransferDate"`
	Status           string    `json:"status"` // ACTIVE, PENDING_TRANSFER, TRANSFERRED
	Encumbrances     []Encumbrance `json:"encumbrances,omitempty"`
	TransactionHistory []Transaction `json:"transactionHistory,omitempty"`
}

// Encumbrance represents a lien or mortgage on the property
type Encumbrance struct {
	EncumbranceID   string    `json:"encumbranceId"`
	Type            string    `json:"type"` // MORTGAGE, LIEN, EASEMENT
	Holder          string    `json:"holder"`
	Amount          float64   `json:"amount"`
	StartDate       time.Time `json:"startDate"`
	EndDate         time.Time `json:"endDate,omitempty"`
	Status          string    `json:"status"` // ACTIVE, RELEASED
	DocumentHash    string    `json:"documentHash"` // IPFS hash
}

// Transaction represents a property transaction
type Transaction struct {
	TransactionID   string    `json:"transactionId"`
	Type            string    `json:"type"` // SALE, TRANSFER, INHERITANCE
	FromOwnerID     string    `json:"fromOwnerId"`
	ToOwnerID       string    `json:"toOwnerId"`
	Amount          float64   `json:"amount"`
	Timestamp       time.Time `json:"timestamp"`
	DocumentHash    string    `json:"documentHash"` // IPFS hash
	Witnesses       []string  `json:"witnesses,omitempty"`
}

// InitLedger initializes the ledger with sample properties
func (pc *PropertyContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	properties := []Property{
		{
			PropertyID:       "PROP001",
			Address:          "123 Main St",
			City:             "San Francisco",
			State:            "CA",
			ZipCode:          "94102",
			Country:          "USA",
			PropertyType:     "RESIDENTIAL",
			OwnerID:          "USER001",
			OwnerName:        "John Doe",
			PurchasePrice:    1500000,
			CurrentValue:     1500000,
			SquareFeet:       2500,
			YearBuilt:        2020,
			TitleDeedHash:    "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
			DocumentsHash:    "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
			RegistrationDate: time.Now(),
			LastTransferDate: time.Now(),
			Status:           "ACTIVE",
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

// RegisterProperty registers a new property on the blockchain
func (pc *PropertyContract) RegisterProperty(ctx contractapi.TransactionContextInterface, propertyJSON string) error {
	var property Property
	err := json.Unmarshal([]byte(propertyJSON), &property)
	if err != nil {
		return fmt.Errorf("failed to unmarshal property: %v", err)
	}

	// Check if property already exists
	exists, err := pc.PropertyExists(ctx, property.PropertyID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("property %s already exists", property.PropertyID)
	}

	property.RegistrationDate = time.Now()
	property.LastTransferDate = time.Now()
	property.Status = "ACTIVE"

	propertyBytes, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(property.PropertyID, propertyBytes)
}

// GetProperty retrieves a property from the blockchain
func (pc *PropertyContract) GetProperty(ctx contractapi.TransactionContextInterface, propertyID string) (*Property, error) {
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
func (pc *PropertyContract) TransferProperty(ctx contractapi.TransactionContextInterface, propertyID, newOwnerID, newOwnerName string, salePrice float64, documentHash string) error {
	property, err := pc.GetProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	if property.Status != "ACTIVE" {
		return fmt.Errorf("property %s is not in ACTIVE status", propertyID)
	}

	// Create transaction record
	transaction := Transaction{
		TransactionID: fmt.Sprintf("TXN-%d", time.Now().Unix()),
		Type:          "SALE",
		FromOwnerID:   property.OwnerID,
		ToOwnerID:     newOwnerID,
		Amount:        salePrice,
		Timestamp:     time.Now(),
		DocumentHash:  documentHash,
	}

	// Update property
	property.PreviousOwnerID = property.OwnerID
	property.OwnerID = newOwnerID
	property.OwnerName = newOwnerName
	property.PurchasePrice = salePrice
	property.CurrentValue = salePrice
	property.LastTransferDate = time.Now()
	property.TransactionHistory = append(property.TransactionHistory, transaction)

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// AddEncumbrance adds a lien or mortgage to a property
func (pc *PropertyContract) AddEncumbrance(ctx contractapi.TransactionContextInterface, propertyID, encumbranceJSON string) error {
	property, err := pc.GetProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	var encumbrance Encumbrance
	err = json.Unmarshal([]byte(encumbranceJSON), &encumbrance)
	if err != nil {
		return fmt.Errorf("failed to unmarshal encumbrance: %v", err)
	}

	encumbrance.StartDate = time.Now()
	encumbrance.Status = "ACTIVE"

	property.Encumbrances = append(property.Encumbrances, encumbrance)

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// ReleaseEncumbrance releases a lien or mortgage
func (pc *PropertyContract) ReleaseEncumbrance(ctx contractapi.TransactionContextInterface, propertyID, encumbranceID string) error {
	property, err := pc.GetProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	for i, enc := range property.Encumbrances {
		if enc.EncumbranceID == encumbranceID {
			property.Encumbrances[i].Status = "RELEASED"
			property.Encumbrances[i].EndDate = time.Now()
			break
		}
	}

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// UpdatePropertyValue updates the current market value of a property
func (pc *PropertyContract) UpdatePropertyValue(ctx contractapi.TransactionContextInterface, propertyID string, newValue float64) error {
	property, err := pc.GetProperty(ctx, propertyID)
	if err != nil {
		return err
	}

	property.CurrentValue = newValue

	propertyJSON, err := json.Marshal(property)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(propertyID, propertyJSON)
}

// GetPropertyHistory retrieves the transaction history of a property
func (pc *PropertyContract) GetPropertyHistory(ctx contractapi.TransactionContextInterface, propertyID string) ([]Transaction, error) {
	property, err := pc.GetProperty(ctx, propertyID)
	if err != nil {
		return nil, err
	}

	return property.TransactionHistory, nil
}

// PropertyExists checks if a property exists
func (pc *PropertyContract) PropertyExists(ctx contractapi.TransactionContextInterface, propertyID string) (bool, error) {
	propertyJSON, err := ctx.GetStub().GetState(propertyID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return propertyJSON != nil, nil
}

// GetAllProperties retrieves all properties
func (pc *PropertyContract) GetAllProperties(ctx contractapi.TransactionContextInterface) ([]*Property, error) {
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
			return nil, err
		}
		properties = append(properties, &property)
	}

	return properties, nil
}

// GetPropertiesByOwner retrieves all properties owned by a specific owner
func (pc *PropertyContract) GetPropertiesByOwner(ctx contractapi.TransactionContextInterface, ownerID string) ([]*Property, error) {
	queryString := fmt.Sprintf(`{"selector":{"ownerId":"%s"}}`, ownerID)
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
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
			return nil, err
		}
		properties = append(properties, &property)
	}

	return properties, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&PropertyContract{})
	if err != nil {
		fmt.Printf("Error creating property chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting property chaincode: %v\n", err)
	}
}
