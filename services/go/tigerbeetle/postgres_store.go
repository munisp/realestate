package main

import (
"database/sql"
"encoding/json"
"fmt"
"log"
"os"
"time"

tb_types "github.com/tigerbeetle/tigerbeetle-go/pkg/types"
_ "github.com/lib/pq"
)

// PostgresTigerBeetleStore implements EscrowMetadata persistence backed by PostgreSQL.
// TigerBeetle Uint128 account IDs are stored as their Lo/Hi uint64 components.
type PostgresTigerBeetleStore struct {
db *sql.DB
}

// NewPostgresTigerBeetleStore creates a new PostgreSQL-backed TigerBeetle metadata store
func NewPostgresTigerBeetleStore() (*PostgresTigerBeetleStore, error) {
dsn := os.Getenv("DATABASE_URL")
if dsn == "" {
 nil, fmt.Errorf("DATABASE_URL environment variable is required")
}

db, err := sql.Open("postgres", dsn)
if err != nil {
 nil, fmt.Errorf("failed to open database: %w", err)
}

db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)

if err = db.Ping(); err != nil {
 nil, fmt.Errorf("failed to ping database: %w", err)
}

store := &PostgresTigerBeetleStore{db: db}
if err = store.migrate(); err != nil {
 nil, fmt.Errorf("failed to run migrations: %w", err)
}

log.Println("PostgreSQL TigerBeetle store initialized")
return store, nil
}

func (s *PostgresTigerBeetleStore) migrate() error {
_, err := s.db.Exec(`
TABLE IF NOT EXISTS go_tigerbeetle_escrows (
           TEXT PRIMARY KEY,
t_id_lo BIGINT NOT NULL DEFAULT 0,
t_id_hi BIGINT NOT NULL DEFAULT 0,
er_id             TEXT NOT NULL DEFAULT '',
er_account_id_lo  BIGINT NOT NULL DEFAULT 0,
er_account_id_hi  BIGINT NOT NULL DEFAULT 0,
           TEXT NOT NULL DEFAULT '',
t_id_lo BIGINT NOT NULL DEFAULT 0,
t_id_hi BIGINT NOT NULL DEFAULT 0,
t               BIGINT NOT NULL DEFAULT 0,
cy             TEXT NOT NULL DEFAULT 'NGN',
              TEXT NOT NULL DEFAULT 'pending',
sfer_id_lo  BIGINT NOT NULL DEFAULT 0,
sfer_id_hi  BIGINT NOT NULL DEFAULT 0,
            JSONB,
t          BIGINT NOT NULL DEFAULT 0,
t      BIGINT NOT NULL DEFAULT 0,
ded_amount      BIGINT NOT NULL DEFAULT 0,
             TIMESTAMPTZ,
         TIMESTAMPTZ,
ded_at          TIMESTAMPTZ,
          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          TIMESTAMPTZ NOT NULL DEFAULT NOW()
INDEX IF NOT EXISTS idx_tb_escrow_buyer   ON go_tigerbeetle_escrows(buyer_id);
INDEX IF NOT EXISTS idx_tb_escrow_seller  ON go_tigerbeetle_escrows(seller_id);
INDEX IF NOT EXISTS idx_tb_escrow_status  ON go_tigerbeetle_escrows(status);
`)
return err
}

// Set creates or updates an escrow metadata record
func (s *PostgresTigerBeetleStore) Set(escrowID string, data *EscrowMetadata) {
metadataJSON, _ := json.Marshal(data.Metadata)
_, err := s.db.Exec(`
SERT INTO go_tigerbeetle_escrows
escrow_account_id_lo, escrow_account_id_hi,
buyer_id, buyer_account_id_lo, buyer_account_id_hi,
seller_id, seller_account_id_lo, seller_account_id_hi,
amount, currency, status,
hold_transfer_id_lo, hold_transfer_id_hi,
metadata, held_amount, released_amount, refunded_amount,
held_at, released_at, refunded_at, created_at, updated_at)
($1, $2,$3, $4,$5,$6, $7,$8,$9, $10,$11,$12, $13,$14,
       $15::jsonb, $16,$17,$18, $19,$20,$21, $22, NOW())
 CONFLICT (escrow_id) DO UPDATE SET
              = EXCLUDED.status,
sfer_id_lo  = EXCLUDED.hold_transfer_id_lo,
sfer_id_hi  = EXCLUDED.hold_transfer_id_hi,
            = EXCLUDED.metadata,
t          = EXCLUDED.held_amount,
t      = EXCLUDED.released_amount,
ded_amount      = EXCLUDED.refunded_amount,
             = EXCLUDED.held_at,
         = EXCLUDED.released_at,
ded_at          = EXCLUDED.refunded_at,
          = NOW()
`,
t64(data.EscrowAccountID.Lo), int64(data.EscrowAccountID.Hi),
erID, int64(data.BuyerAccountID.Lo), int64(data.BuyerAccountID.Hi),
int64(data.SellerAccountID.Lo), int64(data.SellerAccountID.Hi),
t, data.Currency, data.Status,
t64(data.HoldTransferID.Lo), int64(data.HoldTransferID.Hi),
g(metadataJSON), data.HeldAmount, data.ReleasedAmount, data.RefundedAmount,
ullableTimePtr(data.HeldAt), nullableTimePtr(data.ReleasedAt), nullableTimePtr(data.RefundedAt),
err != nil {
tf("PostgresTigerBeetleStore.Set error for %s: %v", escrowID, err)
}
}

// Get retrieves an escrow metadata record by ID
func (s *PostgresTigerBeetleStore) Get(escrowID string) (*EscrowMetadata, bool) {
data := &EscrowMetadata{EscrowID: escrowID}
var metadataJSON []byte
var heldAt, releasedAt, refundedAt sql.NullTime
var escrowAccLo, escrowAccHi int64
var buyerAccLo, buyerAccHi int64
var sellerAccLo, sellerAccHi int64
var holdTransLo, holdTransHi int64

err := s.db.QueryRow(`
escrow_account_id_lo, escrow_account_id_hi,
      buyer_id, buyer_account_id_lo, buyer_account_id_hi,
      seller_id, seller_account_id_lo, seller_account_id_hi,
      amount, currency, status,
      hold_transfer_id_lo, hold_transfer_id_hi,
      COALESCE(metadata::text,'null'),
      held_amount, released_amount, refunded_amount,
      held_at, released_at, refunded_at, created_at
go_tigerbeetle_escrows WHERE escrow_id = $1
`, escrowID).Scan(
&escrowAccHi,
erID, &buyerAccLo, &buyerAccHi,
&sellerAccLo, &sellerAccHi,
t, &data.Currency, &data.Status,
sLo, &holdTransHi,
,
t, &data.ReleasedAmount, &data.RefundedAmount,
&releasedAt, &refundedAt, &data.CreatedAt,
)
if err == sql.ErrNoRows {
 nil, false
}
if err != nil {
tf("PostgresTigerBeetleStore.Get error for %s: %v", escrowID, err)
 nil, false
}

data.EscrowAccountID = uint128FromLoHi(uint64(escrowAccLo), uint64(escrowAccHi))
data.BuyerAccountID = uint128FromLoHi(uint64(buyerAccLo), uint64(buyerAccHi))
data.SellerAccountID = uint128FromLoHi(uint64(sellerAccLo), uint64(sellerAccHi))
data.HoldTransferID = uint128FromLoHi(uint64(holdTransLo), uint64(holdTransHi))

if len(metadataJSON) > 0 {
.Unmarshal(metadataJSON, &data.Metadata)
}
if heldAt.Valid {
= &heldAt.Time
}
if releasedAt.Valid {
= &releasedAt.Time
}
if refundedAt.Valid {
dedAt = &refundedAt.Time
}
return data, true
}

// Close closes the database connection
func (s *PostgresTigerBeetleStore) Close() {
s.db.Close()
}

// uint128FromLoHi reconstructs a tb_types.Uint128 from its Lo and Hi components
func uint128FromLoHi(lo, hi uint64) tb_types.Uint128 {
return tb_types.Uint128{Lo: lo, Hi: hi}
}

func nullableTimePtr(t *time.Time) interface{} {
if t == nil {
 nil
}
return *t
}
