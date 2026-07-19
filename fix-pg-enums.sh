#!/bin/bash
# Extract all unique enum names and their values from the schema
# PostgreSQL requires enums to be declared before use

cd /home/ubuntu/realestate-platform

# Create a temporary file with enum declarations
cat > /tmp/enum_declarations.ts << 'EOF'
// PostgreSQL enum declarations - must be defined before tables
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const propertyTypeEnum = pgEnum("propertyType", ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]);
export const listingTypeEnum = pgEnum("listingType", ["sale", "rent", "sold", "off_market"]);
export const propertyStatusEnum = pgEnum("status", ["active", "pending", "sold", "off_market", "archived"]);
export const transactionTypeEnum = pgEnum("transactionType", ["sale", "rent", "lease"]);
export const transactionStatusEnum = pgEnum("transactionStatus", ["pending", "in_progress", "completed", "cancelled"]);
export const paymentTypeEnum = pgEnum("paymentType", ["deposit", "down_payment", "installment", "full_payment", "refund"]);
export const paymentStatusEnum = pgEnum("paymentStatus", ["pending", "processing", "completed", "failed", "refunded", "escrow", "released"]);
export const boundaryTypeEnum = pgEnum("boundaryType", ["none", "polygon", "circle", "rectangle"]);

EOF

echo "Enum declarations created"
