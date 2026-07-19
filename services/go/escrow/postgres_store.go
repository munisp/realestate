package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// PostgresEscrowStore implements StoreInterface backed by PostgreSQL
type PostgresEscrowStore struct {
	db *sql.DB
}

// NewPostgresEscrowStore creates a new PostgreSQL-backed escrow store
func NewPostgresEscrowStore() (*PostgresEscrowStore, error) {
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

	store := &PostgresEscrowStore{db: db}
	if err = store.migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("PostgreSQL escrow store initialized")
	return store, nil
}

func (s *PostgresEscrowStore) migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS go_escrow_accounts (
			id                   TEXT PRIMARY KEY,
			project_id           INTEGER NOT NULL DEFAULT 0,
			amount               BIGINT NOT NULL,
			currency             TEXT NOT NULL DEFAULT 'NGN',
			buyer_id             TEXT NOT NULL,
			seller_id            TEXT NOT NULL,
			status               TEXT NOT NULL DEFAULT 'pending',
			provider_name        TEXT NOT NULL DEFAULT '',
			provider_escrow_id   TEXT NOT NULL DEFAULT '',
			held_amount          BIGINT NOT NULL DEFAULT 0,
			released_amount      BIGINT NOT NULL DEFAULT 0,
			refunded_amount      BIGINT NOT NULL DEFAULT 0,
			metadata             JSONB,
			dispute_reason       TEXT NOT NULL DEFAULT '',
			expires_at           TIMESTAMPTZ,
			dispute_resolved_at  TIMESTAMPTZ,
			created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_go_escrow_buyer    ON go_escrow_accounts(buyer_id);
		CREATE INDEX IF NOT EXISTS idx_go_escrow_seller   ON go_escrow_accounts(seller_id);
		CREATE INDEX IF NOT EXISTS idx_go_escrow_status   ON go_escrow_accounts(status);
		CREATE INDEX IF NOT EXISTS idx_go_escrow_project  ON go_escrow_accounts(project_id);
	`)
	return err
}

// Create adds a new escrow to PostgreSQL
func (s *PostgresEscrowStore) Create(escrow *Escrow) error {
	metadataJSON, _ := json.Marshal(escrow.Metadata)
	now := time.Now()
	escrow.CreatedAt = now
	escrow.UpdatedAt = now

	_, err := s.db.Exec(`
		INSERT INTO go_escrow_accounts
			(id, project_id, amount, currency, buyer_id, seller_id, status,
			 provider_name, provider_escrow_id, held_amount, released_amount,
			 refunded_amount, metadata, dispute_reason, expires_at,
			 dispute_resolved_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18)
	`,
		escrow.ID, escrow.ProjectID, escrow.Amount, escrow.Currency,
		escrow.BuyerID, escrow.SellerID, string(escrow.Status),
		escrow.ProviderName, escrow.ProviderEscrowID,
		escrow.HeldAmount, escrow.ReleasedAmount, escrow.RefundedAmount,
		string(metadataJSON), escrow.DisputeReason,
		nullableTime(escrow.ExpiresAt), nullableTime(escrow.DisputeResolvedAt),
		now, now,
	)
	if err != nil {
		return fmt.Errorf("failed to create escrow: %w", err)
	}
	return nil
}

// Get retrieves an escrow by ID from PostgreSQL
func (s *PostgresEscrowStore) Get(id string) (*Escrow, error) {
	escrow := &Escrow{}
	var metadataJSON []byte
	var expiresAt, disputeResolvedAt sql.NullTime

	err := s.db.QueryRow(`
		SELECT id, project_id, amount, currency, buyer_id, seller_id, status,
		       provider_name, provider_escrow_id, held_amount, released_amount,
		       refunded_amount, COALESCE(metadata::text,'null'), dispute_reason,
		       expires_at, dispute_resolved_at, created_at, updated_at
		FROM go_escrow_accounts WHERE id = $1
	`, id).Scan(
		&escrow.ID, &escrow.ProjectID, &escrow.Amount, &escrow.Currency,
		&escrow.BuyerID, &escrow.SellerID, &escrow.Status,
		&escrow.ProviderName, &escrow.ProviderEscrowID,
		&escrow.HeldAmount, &escrow.ReleasedAmount, &escrow.RefundedAmount,
		&metadataJSON, &escrow.DisputeReason,
		&expiresAt, &disputeResolvedAt,
		&escrow.CreatedAt, &escrow.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("escrow not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get escrow: %w", err)
	}

	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &escrow.Metadata)
	}
	if expiresAt.Valid {
		t := expiresAt.Time
		escrow.ExpiresAt = &t
	}
	if disputeResolvedAt.Valid {
		t := disputeResolvedAt.Time
		escrow.DisputeResolvedAt = &t
	}
	return escrow, nil
}

// Update updates an existing escrow in PostgreSQL
func (s *PostgresEscrowStore) Update(escrow *Escrow) error {
	metadataJSON, _ := json.Marshal(escrow.Metadata)
	escrow.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE go_escrow_accounts SET
			status               = $2,
			provider_name        = $3,
			provider_escrow_id   = $4,
			held_amount          = $5,
			released_amount      = $6,
			refunded_amount      = $7,
			metadata             = $8::jsonb,
			dispute_reason       = $9,
			expires_at           = $10,
			dispute_resolved_at  = $11,
			updated_at           = NOW()
		WHERE id = $1
	`,
		escrow.ID, string(escrow.Status),
		escrow.ProviderName, escrow.ProviderEscrowID,
		escrow.HeldAmount, escrow.ReleasedAmount, escrow.RefundedAmount,
		string(metadataJSON), escrow.DisputeReason,
		nullableTime(escrow.ExpiresAt), nullableTime(escrow.DisputeResolvedAt),
	)
	if err != nil {
		return fmt.Errorf("failed to update escrow: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("escrow not found: %s", escrow.ID)
	}
	return nil
}

// List returns all escrows for a project from PostgreSQL
func (s *PostgresEscrowStore) List(projectID int) []*Escrow {
	rows, err := s.db.Query(`
		SELECT id FROM go_escrow_accounts WHERE project_id = $1 ORDER BY created_at DESC
	`, projectID)
	if err != nil {
		log.Printf("PostgresEscrowStore.List error: %v", err)
		return nil
	}
	defer rows.Close()

	var escrows []*Escrow
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		if e, err := s.Get(id); err == nil {
			escrows = append(escrows, e)
		}
	}
	return escrows
}

// Close closes the database connection
func (s *PostgresEscrowStore) Close() {
	s.db.Close()
}

func nullableTime(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return *t
}
