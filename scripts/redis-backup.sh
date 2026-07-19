#!/bin/bash

# Redis Backup Script with S3 Integration
# Performs automated backups of Redis data and uploads to S3

set -e

# Configuration
REDIS_CONTAINER="${REDIS_CONTAINER:-escrow-redis}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/redis-backups}"
S3_BUCKET="${S3_BUCKET:-realestate-platform-backups}"
S3_PREFIX="${S3_PREFIX:-redis}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check if Redis container is running
    if ! docker ps | grep -q "$REDIS_CONTAINER"; then
        log_error "Redis container '$REDIS_CONTAINER' is not running"
        exit 1
    fi
    
    # Check if AWS CLI is available (for S3 upload)
    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI is not installed. S3 upload will be skipped."
        S3_UPLOAD=false
    else
        S3_UPLOAD=true
    fi
    
    log_info "Prerequisites check passed"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Trigger Redis BGSAVE
trigger_bgsave() {
    log_info "Triggering Redis BGSAVE..."
    
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    
    # Wait for BGSAVE to complete
    log_info "Waiting for BGSAVE to complete..."
    while true; do
        SAVE_STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
        sleep 2
        NEW_SAVE_STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
        
        if [ "$SAVE_STATUS" != "$NEW_SAVE_STATUS" ]; then
            log_info "BGSAVE completed successfully"
            break
        fi
        
        # Timeout after 5 minutes
        ELAPSED=$((ELAPSED + 2))
        if [ $ELAPSED -gt 300 ]; then
            log_error "BGSAVE timeout after 5 minutes"
            exit 1
        fi
    done
}

# Copy backup file from container
copy_backup_file() {
    log_info "Copying backup file from container..."
    
    # Get Redis data directory
    REDIS_DATA_DIR=$(docker exec "$REDIS_CONTAINER" redis-cli CONFIG GET dir | tail -n 1)
    
    # Copy dump.rdb to local backup directory
    docker cp "${REDIS_CONTAINER}:${REDIS_DATA_DIR}/dump.rdb" "$BACKUP_PATH"
    
    if [ -f "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_info "Backup file created: $BACKUP_PATH ($BACKUP_SIZE)"
    else
        log_error "Failed to create backup file"
        exit 1
    fi
}

# Compress backup file
compress_backup() {
    log_info "Compressing backup file..."
    
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"
    
    if [ -f "$BACKUP_PATH" ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_info "Backup compressed: $BACKUP_PATH ($COMPRESSED_SIZE)"
    else
        log_error "Failed to compress backup"
        exit 1
    fi
}

# Upload to S3
upload_to_s3() {
    if [ "$S3_UPLOAD" = false ]; then
        log_warn "Skipping S3 upload (AWS CLI not available)"
        return
    fi
    
    log_info "Uploading backup to S3..."
    
    S3_PATH="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}.gz"
    
    if aws s3 cp "$BACKUP_PATH" "$S3_PATH" --storage-class STANDARD_IA; then
        log_info "Backup uploaded to: $S3_PATH"
    else
        log_error "Failed to upload backup to S3"
        exit 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    REMAINING=$(find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -type f | wc -l)
    log_info "Local backups remaining: $REMAINING"
    
    if [ "$S3_UPLOAD" = true ]; then
        log_info "Cleaning up old S3 backups (older than $RETENTION_DAYS days)..."
        
        CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
            FILE_DATE=$(echo "$line" | awk '{print $4}' | grep -oP '\d{8}' | head -1)
            FILE_NAME=$(echo "$line" | awk '{print $4}')
            
            if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                log_info "Deleting old backup: $FILE_NAME"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${FILE_NAME}"
            fi
        done
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Extract to temp location
    TEMP_DIR=$(mktemp -d)
    gunzip -c "$BACKUP_PATH" > "${TEMP_DIR}/dump.rdb"
    
    # Check if file is valid RDB format
    if file "${TEMP_DIR}/dump.rdb" | grep -q "Redis"; then
        log_info "Backup integrity verified"
    else
        log_error "Backup file appears to be corrupted"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    rm -rf "$TEMP_DIR"
}

# Send notification (optional)
send_notification() {
    local STATUS=$1
    local MESSAGE=$2
    
    # TODO: Implement notification (email, Slack, etc.)
    log_info "Notification: $STATUS - $MESSAGE"
}

# Main execution
main() {
    log_info "==================================="
    log_info "Redis Backup Script"
    log_info "Timestamp: $TIMESTAMP"
    log_info "==================================="
    
    check_prerequisites
    create_backup_dir
    trigger_bgsave
    copy_backup_file
    compress_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups
    
    log_info "==================================="
    log_info "Backup completed successfully!"
    log_info "Backup file: $BACKUP_PATH"
    log_info "==================================="
    
    send_notification "SUCCESS" "Redis backup completed: $BACKUP_FILE"
}

# Error handler
error_handler() {
    log_error "Backup failed at line $1"
    send_notification "FAILURE" "Redis backup failed at line $1"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Run main function
main
