package ledger

import (
	"context"
	"fmt"
	"time"

	tb "github.com/tigerbeetle/tigerbeetle-go"
	"github.com/tigerbeetle/tigerbeetle-go/pkg/types"
	"go.uber.org/zap"
)

// Client wraps TigerBeetle client with high-level operations
type Client struct {
	client *tb.Client
	logger *zap.Logger
}

// NewClient creates a new TigerBeetle client
func NewClient(addresses []string, clusterID uint128, logger *zap.Logger) (*Client, error) {
	client, err := tb.NewClient(types.ToUint128(clusterID), addresses)
	if err != nil {
		return nil, fmt.Errorf("failed to create TigerBeetle client: %w", err)
	}

	return &Client{
		client: client,
		logger: logger,
	}, nil
}

// Close closes the TigerBeetle client connection
func (c *Client) Close() {
	c.client.Close()
}

// Account represents a ledger account
type Account struct {
	ID             types.Uint128
	UserData128    types.Uint128
	UserData64     uint64
	UserData32     uint32
	Ledger         uint32
	Code           uint16
	Flags          uint16
	DebitsPending  types.Uint128
	DebitsPosted   types.Uint128
	CreditsPending types.Uint128
	CreditsPosted  types.Uint128
	Timestamp      uint64
}

// Transfer represents a ledger transfer
type Transfer struct {
	ID              types.Uint128
	DebitAccountID  types.Uint128
	CreditAccountID types.Uint128
	Amount          types.Uint128
	PendingID       types.Uint128
	UserData128     types.Uint128
	UserData64      uint64
	UserData32      uint32
	Timeout         uint64
	Ledger          uint32
	Code            uint16
	Flags           uint16
	Timestamp       uint64
}

// CreateAccount creates a new account in the ledger
func (c *Client) CreateAccount(ctx context.Context, account Account) error {
	accounts := []types.Account{
		{
			ID:          account.ID,
			UserData128: account.UserData128,
			UserData64:  account.UserData64,
			UserData32:  account.UserData32,
			Ledger:      account.Ledger,
			Code:        account.Code,
			Flags:       account.Flags,
		},
	}

	results, err := c.client.CreateAccounts(accounts)
	if err != nil {
		return fmt.Errorf("failed to create account: %w", err)
	}

	if len(results) > 0 {
		return fmt.Errorf("account creation failed with result: %v", results[0].Result)
	}

	c.logger.Info("Account created", zap.String("account_id", account.ID.String()))
	return nil
}

// CreateAccounts creates multiple accounts in a batch
func (c *Client) CreateAccounts(ctx context.Context, accounts []Account) error {
	tbAccounts := make([]types.Account, len(accounts))
	for i, acc := range accounts {
		tbAccounts[i] = types.Account{
			ID:          acc.ID,
			UserData128: acc.UserData128,
			UserData64:  acc.UserData64,
			UserData32:  acc.UserData32,
			Ledger:      acc.Ledger,
			Code:        acc.Code,
			Flags:       acc.Flags,
		}
	}

	results, err := c.client.CreateAccounts(tbAccounts)
	if err != nil {
		return fmt.Errorf("failed to create accounts: %w", err)
	}

	if len(results) > 0 {
		return fmt.Errorf("some accounts failed to create: %d errors", len(results))
	}

	c.logger.Info("Accounts created", zap.Int("count", len(accounts)))
	return nil
}

// CreateTransfer creates a new transfer between accounts
func (c *Client) CreateTransfer(ctx context.Context, transfer Transfer) error {
	transfers := []types.Transfer{
		{
			ID:              transfer.ID,
			DebitAccountID:  transfer.DebitAccountID,
			CreditAccountID: transfer.CreditAccountID,
			Amount:          transfer.Amount,
			PendingID:       transfer.PendingID,
			UserData128:     transfer.UserData128,
			UserData64:      transfer.UserData64,
			UserData32:      transfer.UserData32,
			Timeout:         transfer.Timeout,
			Ledger:          transfer.Ledger,
			Code:            transfer.Code,
			Flags:           transfer.Flags,
		},
	}

	results, err := c.client.CreateTransfers(transfers)
	if err != nil {
		return fmt.Errorf("failed to create transfer: %w", err)
	}

	if len(results) > 0 {
		return fmt.Errorf("transfer failed with result: %v", results[0].Result)
	}

	c.logger.Info("Transfer created",
		zap.String("transfer_id", transfer.ID.String()),
		zap.String("amount", transfer.Amount.String()),
	)
	return nil
}

// CreateTransfers creates multiple transfers in a batch
func (c *Client) CreateTransfers(ctx context.Context, transfers []Transfer) error {
	tbTransfers := make([]types.Transfer, len(transfers))
	for i, t := range transfers {
		tbTransfers[i] = types.Transfer{
			ID:              t.ID,
			DebitAccountID:  t.DebitAccountID,
			CreditAccountID: t.CreditAccountID,
			Amount:          t.Amount,
			PendingID:       t.PendingID,
			UserData128:     t.UserData128,
			UserData64:      t.UserData64,
			UserData32:      t.UserData32,
			Timeout:         t.Timeout,
			Ledger:          t.Ledger,
			Code:            t.Code,
			Flags:           t.Flags,
		}
	}

	results, err := c.client.CreateTransfers(tbTransfers)
	if err != nil {
		return fmt.Errorf("failed to create transfers: %w", err)
	}

	if len(results) > 0 {
		return fmt.Errorf("some transfers failed: %d errors", len(results))
	}

	c.logger.Info("Transfers created", zap.Int("count", len(transfers)))
	return nil
}

// LookupAccount retrieves account information
func (c *Client) LookupAccount(ctx context.Context, accountID types.Uint128) (*Account, error) {
	accounts, err := c.client.LookupAccounts([]types.Uint128{accountID})
	if err != nil {
		return nil, fmt.Errorf("failed to lookup account: %w", err)
	}

	if len(accounts) == 0 {
		return nil, fmt.Errorf("account not found")
	}

	acc := accounts[0]
	return &Account{
		ID:             acc.ID,
		UserData128:    acc.UserData128,
		UserData64:     acc.UserData64,
		UserData32:     acc.UserData32,
		Ledger:         acc.Ledger,
		Code:           acc.Code,
		Flags:          acc.Flags,
		DebitsPending:  acc.DebitsPending,
		DebitsPosted:   acc.DebitsPosted,
		CreditsPending: acc.CreditsPending,
		CreditsPosted:  acc.CreditsPosted,
		Timestamp:      acc.Timestamp,
	}, nil
}

// GetAccountBalance returns the current balance of an account
func (c *Client) GetAccountBalance(ctx context.Context, accountID types.Uint128) (types.Uint128, error) {
	account, err := c.LookupAccount(ctx, accountID)
	if err != nil {
		return types.Uint128{}, err
	}

	// Balance = Credits - Debits
	balance := types.Uint128{}
	// Implement balance calculation
	// Note: TigerBeetle uses double-entry accounting
	// Balance depends on account type (asset, liability, etc.)
	
	return balance, nil
}

// CreatePendingTransfer creates a pending transfer (two-phase commit)
func (c *Client) CreatePendingTransfer(ctx context.Context, transfer Transfer, timeout time.Duration) error {
	transfer.Flags |= types.TransferFlagsPending
	transfer.Timeout = uint64(timeout.Nanoseconds())
	return c.CreateTransfer(ctx, transfer)
}

// PostPendingTransfer posts a pending transfer
func (c *Client) PostPendingTransfer(ctx context.Context, pendingID types.Uint128, transferID types.Uint128) error {
	transfer := Transfer{
		ID:        transferID,
		PendingID: pendingID,
		Flags:     types.TransferFlagsPostPendingTransfer,
	}
	return c.CreateTransfer(ctx, transfer)
}

// VoidPendingTransfer voids a pending transfer
func (c *Client) VoidPendingTransfer(ctx context.Context, pendingID types.Uint128, transferID types.Uint128) error {
	transfer := Transfer{
		ID:        transferID,
		PendingID: pendingID,
		Flags:     types.TransferFlagsVoidPendingTransfer,
	}
	return c.CreateTransfer(ctx, transfer)
}

// Account types (codes)
const (
	AccountTypeAsset      uint16 = 1
	AccountTypeLiability  uint16 = 2
	AccountTypeEquity     uint16 = 3
	AccountTypeRevenue    uint16 = 4
	AccountTypeExpense    uint16 = 5
	AccountTypeEscrow     uint16 = 100
	AccountTypeCommission uint16 = 101
	AccountTypeFee        uint16 = 102
)

// Transfer types (codes)
const (
	TransferTypePayment     uint16 = 1
	TransferTypeRefund      uint16 = 2
	TransferTypeEscrow      uint16 = 3
	TransferTypeCommission  uint16 = 4
	TransferTypeFee         uint16 = 5
	TransferTypeWithdrawal  uint16 = 6
	TransferTypeDeposit     uint16 = 7
)

// Ledger IDs
const (
	LedgerUSD uint32 = 1
	LedgerEUR uint32 = 2
	LedgerGBP uint32 = 3
)
