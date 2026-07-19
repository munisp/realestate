package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// PostgresMojaloopStore implements EscrowStoreInterface backed by PostgreSQL
type PostgresMojaloopStore struct {
	db *sql.DB
}

// NewPostgresMojaloopStore creates a new PostgreSQL-backed mojaloop escrow store
func NewPostgresMojaloopStore() (*PostgresMojaloopStore, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	store := &PostgresMojaloopStore{db: db}
	if err = store.migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("PostgreSQL mojaloop store initialized")
	return store, nil
}

func (s *PostgresMojaloopStore) migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS go_mojaloop_escrows (
			escrow_id     TEXT PRIMARY KEY,
			transfer_id   TEXT NOT NULL DEFAULT '',
			quote_id      TEXT NOT NULL DEFAULT '',
			amount        TEXT NOT NULL DEFAULT '0',
			currency      TEXT NOT NULL DEFAULT 'NGN',
			payer_id      TEXT NOT NULL DEFAULT '',
			payee_id      TEXT NOT NULL DEFAULT '',
			status        TEXT NOT NULL DEFAULT 'PENDING',
			metadata      JSONB,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_mojaloop_transfer ON go_mojaloop_escrows(transfer_id);
		CREATE INDEX IF NOT EXISTS idx_mojaloop_quote    ON go_mojaloop_escrows(quote_id);
		CREATE INDEX IF NOT EXISTS idx_mojaloop_status   ON go_mojaloop_escrows(status);
	`)
	return err
}

// Set creates or updates an escrow record in PostgreSQL
func (s *PostgresMojaloopStore) Set(escrowID string, data *EscrowData) {
	_, err := s.db.Exec(`
		INSERT INTO go_mojaloop_escrows
			(escrow_id, transfer_id, quote_id, amount, currency, payer_id, payee_id, status, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (escrow_id) DO UPDATE SET
			transfer_id = EXCLUDED.transfer_id,
			quote_id    = EXCLUDED.quote_id,
			amount      = EXCLUDED.amount,
			currency    = EXCLUDED.currency,
			payer_id    = EXCLUDED.payer_id,
			payee_id    = EXCLUDED.payee_id,
			status      = EXCLUDED.status,
			updated_at  = NOW()
	`,
		escrowID, data.TransferID, data.QuoteID, data.Amount, data.Currency,
		data.PayerID, data.PayeeID, data.Status,
	)
	if err != nil {
		log.Printf("PostgresMojaloopStore.Set error for %s: %v", escrowID, err)
	}
}

// Get retrieves an escrow record from PostgreSQL
func (s *PostgresMojaloopStore) Get(escrowID string) (*EscrowData, bool) {
	data := &EscrowData{EscrowID: escrowID}
	err := s.db.QueryRow(`
		SELECT transfer_id, quote_id, amount, currency, payer_id, payee_id, status
		FROM go_mojaloop_escrows WHERE escrow_id = $1
	`, escrowID).Scan(
		&data.TransferID, &data.QuoteID, &data.Amount, &data.Currency,
		&data.PayerID, &data.PayeeID, &data.Status,
	)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		log.Printf("PostgresMojaloopStore.Get error for %s: %v", escrowID, err)
		return nil, false
	}
	return data, true
}

// FindByTransferID finds an escrow by its Mojaloop transfer ID
func (s *PostgresMojaloopStore) FindByTransferID(transferID string) (*EscrowData, bool) {
	data := &EscrowData{}
	err := s.db.QueryRow(`
		SELECT escrow_id, transfer_id, quote_id, amount, currency, payer_id, payee_id, status
		FROM go_mojaloop_escrows WHERE transfer_id = $1
	`, transferID).Scan(
		&data.EscrowID, &data.TransferID, &data.QuoteID, &data.Amount, &data.Currency,
		&data.PayerID, &data.PayeeID, &data.Status,
	)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		log.Printf("PostgresMojaloopStore.FindByTransferID error: %v", err)
		return nil, false
	}
	return data, true
}

// UpdateStatus updates the status of an escrow record
func (s *PostgresMojaloopStore) UpdateStatus(escrowID string, status string) {
	_, err := s.db.Exec(`
		UPDATE go_mojaloop_escrows SET status = $2, updated_at = NOW() WHERE escrow_id = $1
	`, escrowID, status)
	if err != nil {
		log.Printf("PostgresMojaloopStore.UpdateStatus error for %s: %v", escrowID, err)
	}
}

// Close closes the database connection
func (s *PostgresMojaloopStore) Close() {
	s.db.Close()
}
