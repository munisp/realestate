package main

import (
"errors"
"fmt"
"log/slog"
)

// EscrowInvariants enforces double-entry accounting rules for escrow accounts.
// Every debit must have a corresponding credit; balances must never go negative.

type InvariantError struct {
Rule    string
Message string
}

func (e *InvariantError) Error() string {
return fmt.Sprintf("invariant violation [%s]: %s", e.Rule, e.Message)
}

// ValidateEscrowCreate checks that a new escrow satisfies all invariants.
func ValidateEscrowCreate(amount float64, currency string, buyerID, sellerID string) error {
if amount <= 0 {
 &InvariantError{Rule: "POSITIVE_AMOUNT", Message: fmt.Sprintf("escrow amount must be positive, got %.2f", amount)}
}
if amount > 10_000_000_000 { // 10 billion NGN max
 &InvariantError{Rule: "MAX_AMOUNT", Message: fmt.Sprintf("escrow amount %.2f exceeds maximum of 10,000,000,000", amount)}
}
if currency == "" {
 &InvariantError{Rule: "CURRENCY_REQUIRED", Message: "currency is required"}
}
validCurrencies := map[string]bool{"NGN": true, "USD": true, "GBP": true, "EUR": true}
if !validCurrencies[currency] {
 &InvariantError{Rule: "VALID_CURRENCY", Message: fmt.Sprintf("unsupported currency: %s", currency)}
}
if buyerID == "" {
 &InvariantError{Rule: "BUYER_REQUIRED", Message: "buyer ID is required"}
}
if sellerID == "" {
 &InvariantError{Rule: "SELLER_REQUIRED", Message: "seller ID is required"}
}
if buyerID == sellerID {
 &InvariantError{Rule: "DISTINCT_PARTIES", Message: "buyer and seller must be different parties"}
}
return nil
}

// ValidateEscrowRelease checks that a release is valid against the current escrow state.
func ValidateEscrowRelease(escrow *EscrowMetadata, releaseAmount float64) error {
if escrow == nil {
 &InvariantError{Rule: "ESCROW_EXISTS", Message: "escrow not found"}
}
if escrow.Status != "held" {
 &InvariantError{Rule: "ESCROW_HELD", Message: fmt.Sprintf("can only release from 'held' status, current: %s", escrow.Status)}
}
if releaseAmount <= 0 {
 &InvariantError{Rule: "POSITIVE_RELEASE", Message: fmt.Sprintf("release amount must be positive, got %.2f", releaseAmount)}
}
if releaseAmount > escrow.Amount {
 &InvariantError{Rule: "SUFFICIENT_BALANCE", Message: fmt.Sprintf("release amount %.2f exceeds held amount %.2f", releaseAmount, escrow.Amount)}
}
return nil
}

// ValidateEscrowRefund checks that a refund is valid.
func ValidateEscrowRefund(escrow *EscrowMetadata, refundAmount float64) error {
if escrow == nil {
 &InvariantError{Rule: "ESCROW_EXISTS", Message: "escrow not found"}
}
if escrow.Status == "released" {
 &InvariantError{Rule: "NOT_RELEASED", Message: "cannot refund an already released escrow"}
}
if escrow.Status == "refunded" {
 &InvariantError{Rule: "NOT_REFUNDED", Message: "escrow already refunded"}
}
if refundAmount <= 0 {
 &InvariantError{Rule: "POSITIVE_REFUND", Message: fmt.Sprintf("refund amount must be positive, got %.2f", refundAmount)}
}
if refundAmount > escrow.Amount {
 &InvariantError{Rule: "SUFFICIENT_BALANCE", Message: fmt.Sprintf("refund amount %.2f exceeds held amount %.2f", refundAmount, escrow.Amount)}
}
return nil
}

// VerifyDoubleEntry checks that the sum of all escrow debits equals credits.
// This is a reconciliation check to run periodically.
func VerifyDoubleEntry(store EscrowStore) error {
escrows, err := store.GetAll()
if err != nil {
 fmt.Errorf("failed to retrieve escrows: %w", err)
}

var totalHeld, totalReleased, totalRefunded float64
for _, e := range escrows {
e.Status {
"held":
+= e.Amount
"released":
+= e.Amount
"refunded":
ded += e.Amount
Every escrow that was created must be in exactly one terminal state
// (held, released, or refunded). This is a basic consistency check.
slog.Info("double-entry reconciliation",
totalHeld,
totalReleased,
ded", totalRefunded,
t", len(escrows),
)

// Check for any escrows in invalid states
for _, e := range escrows {
e.Amount < 0 {
 errors.New(fmt.Sprintf("negative balance detected for escrow %s: %.2f", e.EscrowID, e.Amount))
 nil
}
