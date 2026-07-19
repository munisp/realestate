package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realestate-platform/tigerbeetle-service/pkg/ledger"
	"github.com/tigerbeetle/tigerbeetle-go/pkg/types"
	"go.uber.org/zap"
)

// LedgerService provides high-level ledger operations for real estate transactions
type LedgerService struct {
	client *ledger.Client
	logger *zap.Logger
}

// NewLedgerService creates a new ledger service
func NewLedgerService(client *ledger.Client, logger *zap.Logger) *LedgerService {
	return &LedgerService{
		client: client,
		logger: logger,
	}
}

// PropertyTransaction represents a property purchase transaction
type PropertyTransaction struct {
	TransactionID   uuid.UUID
	BuyerAccountID  types.Uint128
	SellerAccountID types.Uint128
	EscrowAccountID types.Uint128
	Amount          types.Uint128
	Commission      types.Uint128
	Fees            types.Uint128
	PropertyID      string
	Timestamp       time.Time
}

// CreateUserAccount creates a ledger account for a user
func (s *LedgerService) CreateUserAccount(ctx context.Context, userID string, accountType uint16) (types.Uint128, error) {
	accountID := s.generateAccountID(userID)
	
	account := ledger.Account{
		ID:          accountID,
		UserData128: s.stringToUint128(userID),
		Ledger:      ledger.LedgerUSD,
		Code:        accountType,
		Flags:       0,
	}

	err := s.client.CreateAccount(ctx, account)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to create user account: %w", err)
	}

	s.logger.Info("User account created",
		zap.String("user_id", userID),
		zap.String("account_id", accountID.String()),
	)

	return accountID, nil
}

// CreateEscrowAccount creates an escrow account for a property transaction
func (s *LedgerService) CreateEscrowAccount(ctx context.Context, transactionID uuid.UUID) (types.Uint128, error) {
	accountID := s.uuidToUint128(transactionID)
	
	account := ledger.Account{
		ID:          accountID,
		UserData128: accountID, // Store transaction ID
		Ledger:      ledger.LedgerUSD,
		Code:        ledger.AccountTypeEscrow,
		Flags:       0,
	}

	err := s.client.CreateAccount(ctx, account)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to create escrow account: %w", err)
	}

	s.logger.Info("Escrow account created",
		zap.String("transaction_id", transactionID.String()),
		zap.String("account_id", accountID.String()),
	)

	return accountID, nil
}

// DepositToEscrow deposits funds from buyer to escrow account
func (s *LedgerService) DepositToEscrow(ctx context.Context, buyerAccountID, escrowAccountID types.Uint128, amount types.Uint128) (types.Uint128, error) {
	transferID := s.generateTransferID()
	
	transfer := ledger.Transfer{
		ID:              transferID,
		DebitAccountID:  buyerAccountID,
		CreditAccountID: escrowAccountID,
		Amount:          amount,
		Ledger:          ledger.LedgerUSD,
		Code:            ledger.TransferTypeEscrow,
		Flags:           0,
	}

	err := s.client.CreateTransfer(ctx, transfer)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to deposit to escrow: %w", err)
	}

	s.logger.Info("Funds deposited to escrow",
		zap.String("transfer_id", transferID.String()),
		zap.String("amount", amount.String()),
	)

	return transferID, nil
}

// ReleaseEscrowToSeller releases funds from escrow to seller
func (s *LedgerService) ReleaseEscrowToSeller(ctx context.Context, escrowAccountID, sellerAccountID types.Uint128, amount types.Uint128) (types.Uint128, error) {
	transferID := s.generateTransferID()
	
	transfer := ledger.Transfer{
		ID:              transferID,
		DebitAccountID:  escrowAccountID,
		CreditAccountID: sellerAccountID,
		Amount:          amount,
		Ledger:          ledger.LedgerUSD,
		Code:            ledger.TransferTypePayment,
		Flags:           0,
	}

	err := s.client.CreateTransfer(ctx, transfer)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to release escrow to seller: %w", err)
	}

	s.logger.Info("Escrow released to seller",
		zap.String("transfer_id", transferID.String()),
		zap.String("amount", amount.String()),
	)

	return transferID, nil
}

// RefundEscrowToBuyer refunds funds from escrow back to buyer
func (s *LedgerService) RefundEscrowToBuyer(ctx context.Context, escrowAccountID, buyerAccountID types.Uint128, amount types.Uint128) (types.Uint128, error) {
	transferID := s.generateTransferID()
	
	transfer := ledger.Transfer{
		ID:              transferID,
		DebitAccountID:  escrowAccountID,
		CreditAccountID: buyerAccountID,
		Amount:          amount,
		Ledger:          ledger.LedgerUSD,
		Code:            ledger.TransferTypeRefund,
		Flags:           0,
	}

	err := s.client.CreateTransfer(ctx, transfer)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to refund escrow to buyer: %w", err)
	}

	s.logger.Info("Escrow refunded to buyer",
		zap.String("transfer_id", transferID.String()),
		zap.String("amount", amount.String()),
	)

	return transferID, nil
}

// PayCommission pays commission to agent
func (s *LedgerService) PayCommission(ctx context.Context, escrowAccountID, agentAccountID types.Uint128, amount types.Uint128) (types.Uint128, error) {
	transferID := s.generateTransferID()
	
	transfer := ledger.Transfer{
		ID:              transferID,
		DebitAccountID:  escrowAccountID,
		CreditAccountID: agentAccountID,
		Amount:          amount,
		Ledger:          ledger.LedgerUSD,
		Code:            ledger.TransferTypeCommission,
		Flags:           0,
	}

	err := s.client.CreateTransfer(ctx, transfer)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to pay commission: %w", err)
	}

	s.logger.Info("Commission paid to agent",
		zap.String("transfer_id", transferID.String()),
		zap.String("amount", amount.String()),
	)

	return transferID, nil
}

// PayPlatformFee pays platform fee
func (s *LedgerService) PayPlatformFee(ctx context.Context, escrowAccountID, platformAccountID types.Uint128, amount types.Uint128) (types.Uint128, error) {
	transferID := s.generateTransferID()
	
	transfer := ledger.Transfer{
		ID:              transferID,
		DebitAccountID:  escrowAccountID,
		CreditAccountID: platformAccountID,
		Amount:          amount,
		Ledger:          ledger.LedgerUSD,
		Code:            ledger.TransferTypeFee,
		Flags:           0,
	}

	err := s.client.CreateTransfer(ctx, transfer)
	if err != nil {
		return types.Uint128{}, fmt.Errorf("failed to pay platform fee: %w", err)
	}

	s.logger.Info("Platform fee paid",
		zap.String("transfer_id", transferID.String()),
		zap.String("amount", amount.String()),
	)

	return transferID, nil
}

// ExecutePropertyTransaction executes a complete property transaction with escrow
func (s *LedgerService) ExecutePropertyTransaction(ctx context.Context, tx PropertyTransaction) error {
	// 1. Create escrow account
	escrowAccountID, err := s.CreateEscrowAccount(ctx, tx.TransactionID)
	if err != nil {
		return fmt.Errorf("failed to create escrow account: %w", err)
	}

	// 2. Deposit funds to escrow
	_, err = s.DepositToEscrow(ctx, tx.BuyerAccountID, escrowAccountID, tx.Amount)
	if err != nil {
		return fmt.Errorf("failed to deposit to escrow: %w", err)
	}

	// 3. Calculate net amount to seller (total - commission - fees)
	netAmount := s.subtractUint128(tx.Amount, tx.Commission)
	netAmount = s.subtractUint128(netAmount, tx.Fees)

	// 4. Release funds to seller
	_, err = s.ReleaseEscrowToSeller(ctx, escrowAccountID, tx.SellerAccountID, netAmount)
	if err != nil {
		// Refund to buyer if seller payment fails
		s.RefundEscrowToBuyer(ctx, escrowAccountID, tx.BuyerAccountID, tx.Amount)
		return fmt.Errorf("failed to release funds to seller: %w", err)
	}

	// 5. Pay commission (if any)
	if !s.isZero(tx.Commission) {
		// Assume agent account ID is derived from transaction metadata
		agentAccountID := s.generateAccountID("agent-" + tx.PropertyID)
		_, err = s.PayCommission(ctx, escrowAccountID, agentAccountID, tx.Commission)
		if err != nil {
			s.logger.Error("Failed to pay commission", zap.Error(err))
			// Continue - commission payment failure shouldn't block transaction
		}
	}

	// 6. Pay platform fee (if any)
	if !s.isZero(tx.Fees) {
		platformAccountID := s.generateAccountID("platform")
		_, err = s.PayPlatformFee(ctx, escrowAccountID, platformAccountID, tx.Fees)
		if err != nil {
			s.logger.Error("Failed to pay platform fee", zap.Error(err))
			// Continue - fee payment failure shouldn't block transaction
		}
	}

	s.logger.Info("Property transaction completed",
		zap.String("transaction_id", tx.TransactionID.String()),
		zap.String("property_id", tx.PropertyID),
		zap.String("amount", tx.Amount.String()),
	)

	return nil
}

// GetAccountBalance retrieves the current balance of an account
func (s *LedgerService) GetAccountBalance(ctx context.Context, accountID types.Uint128) (types.Uint128, error) {
	return s.client.GetAccountBalance(ctx, accountID)
}

// Helper functions

func (s *LedgerService) generateAccountID(seed string) types.Uint128 {
	// Generate deterministic account ID from seed
	id := uuid.NewSHA1(uuid.NameSpaceURL, []byte(seed))
	return s.uuidToUint128(id)
}

func (s *LedgerService) generateTransferID() types.Uint128 {
	// Generate random transfer ID
	id := uuid.New()
	return s.uuidToUint128(id)
}

func (s *LedgerService) uuidToUint128(id uuid.UUID) types.Uint128 {
	bytes := [16]byte(id)
	return types.Uint128{
		Lo: uint64(bytes[0]) | uint64(bytes[1])<<8 | uint64(bytes[2])<<16 | uint64(bytes[3])<<24 |
			uint64(bytes[4])<<32 | uint64(bytes[5])<<40 | uint64(bytes[6])<<48 | uint64(bytes[7])<<56,
		Hi: uint64(bytes[8]) | uint64(bytes[9])<<8 | uint64(bytes[10])<<16 | uint64(bytes[11])<<24 |
			uint64(bytes[12])<<32 | uint64(bytes[13])<<40 | uint64(bytes[14])<<48 | uint64(bytes[15])<<56,
	}
}

func (s *LedgerService) stringToUint128(str string) types.Uint128 {
	id := uuid.NewSHA1(uuid.NameSpaceURL, []byte(str))
	return s.uuidToUint128(id)
}

func (s *LedgerService) subtractUint128(a, b types.Uint128) types.Uint128 {
	// Simplified subtraction - production code should handle overflow
	result := types.Uint128{
		Lo: a.Lo - b.Lo,
		Hi: a.Hi - b.Hi,
	}
	if a.Lo < b.Lo {
		result.Hi--
	}
	return result
}

func (s *LedgerService) isZero(val types.Uint128) bool {
	return val.Lo == 0 && val.Hi == 0
}
