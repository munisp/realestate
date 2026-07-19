# Docker Deployment Guide

**Platform**: Next-Generation Real Estate Platform  
**Target Environment**: Cloud Servers (AWS, GCP, Azure, DigitalOcean)  
**Prerequisites**: Docker 24+, Docker Compose 2.20+, 16GB RAM, 8 CPUs, 500GB Storage

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Service Configuration](#service-configuration)
6. [Verification & Testing](#verification--testing)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

This guide walks you through deploying all 22 microservices (19 application services + 3 lakehouse components) using Docker Compose on a cloud server.

**Architecture**:
```
Frontend (React) → tRPC API → Service Clients → Go/Python Microservices → Lakehouse
                                     ↓
                              Kafka Events → MinIO → Flink/Spark → Analytics
```

**Services to Deploy**:
- **Python Services** (7): ML valuation, OCR, fraud detection, geospatial, analytics, recommendation, e-signature
- **Go Services** (4): Payment, notification, image processing, search
- **Middleware** (11): Kafka, Redis, PostGIS, APIsix, Dapr, Temporal, TigerBeetle, MinIO, Flink, Spark, Keycloak

---

## Infrastructure Requirements

### Minimum Specifications

**Development/Staging**:
- **CPU**: 8 cores (Intel Xeon or AMD EPYC)
- **RAM**: 16GB
- **Storage**: 200GB SSD
- **Network**: 100 Mbps
- **OS**: Ubuntu 22.04 LTS or later

**Production**:
- **CPU**: 16 cores
- **RAM**: 32GB
- **Storage**: 500GB NVMe SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

### Cloud Provider Options

#### AWS EC2
**Instance Type**: `t3.2xlarge` (8 vCPUs, 32GB RAM) or `c6i.4xlarge` (16 vCPUs, 32GB RAM)  
**Storage**: 500GB gp3 EBS volume  
**Estimated Cost**: $200-400/month

#### Google Cloud Platform
**Machine Type**: `n2-standard-8` (8 vCPUs, 32GB RAM) or `n2-standard-16` (16 vCPUs, 64GB RAM)  
**Storage**: 500GB SSD persistent disk  
**Estimated Cost**: $250-450/month

#### Azure
**VM Size**: `Standard_D8s_v3` (8 vCPUs, 32GB RAM) or `Standard_D16s_v3` (16 vCPUs, 64GB RAM)  
**Storage**: 500GB Premium SSD  
**Estimated Cost**: $280-480/month

#### DigitalOcean
**Droplet**: `g-8vcpu-32gb` (8 vCPUs, 32GB RAM) or `g-16vcpu-64gb` (16 vCPUs, 64GB RAM)  
**Storage**: 500GB Block Storage  
**Estimated Cost**: $160-320/month

---

## Pre-Deployment Checklist

### 1. Provision Cloud Server

```bash
# Example: AWS EC2 launch command
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.2xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":500,"VolumeType":"gp3"}}]'
```

### 2. Install Docker

```bash
# SSH into server
ssh -i your-key.pem ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
# Expected: Docker version 24.0.0 or later
```

### 3. Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
# Expected: Docker Compose version v2.20.0 or later
```

### 4. Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3001/tcp    # Application
sudo ufw enable
```

### 5. Transfer Project Files

```bash
# On local machine
git clone <your-repository-url>
cd realestate-platform

# Transfer to server
rsync -avz -e "ssh -i your-key.pem" . ubuntu@your-server-ip:/home/ubuntu/realestate-platform/

# Or use git clone directly on server
ssh -i your-key.pem ubuntu@your-server-ip
git clone <your-repository-url>
cd realestate-platform
```

---

## Step-by-Step Deployment

### Step 1: Configure Environment Variables

```bash
cd /home/ubuntu/realestate-platform

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables**:

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Manus OAuth (already configured)
VITE_APP_ID=<your-app-id>
OAUTH_SERVER_URL=<oauth-server-url>
VITE_OAUTH_PORTAL_URL=<oauth-portal-url>
JWT_SECRET=<jwt-secret>

# Email (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
FROM_EMAIL=noreply@yourdomain.com

# Payment (Stripe)
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
VITE_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>

# Google Maps (if using custom key)
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>

# Service Ports (default values)
ML_VALUATION_SERVICE_URL=http://localhost:8001
OCR_SERVICE_URL=http://localhost:8002
FRAUD_DETECTION_SERVICE_URL=http://localhost:8003
GEOSPATIAL_SERVICE_URL=http://localhost:8004
ANALYTICS_SERVICE_URL=http://localhost:8005
RECOMMENDATION_SERVICE_URL=http://localhost:8006
SIGNATURE_SERVICE_URL=http://localhost:8007
PAYMENT_SERVICE_URL=http://localhost:9001
NOTIFICATION_SERVICE_URL=http://localhost:9002
IMAGE_SERVICE_URL=http://localhost:9003
SEARCH_SERVICE_URL=http://localhost:9004

# Kafka
KAFKA_BROKERS=localhost:9092,localhost:9093,localhost:9094

# Redis
REDIS_URL=redis://localhost:6379

# PostGIS
POSTGIS_URL=postgresql://postgres:postgres@localhost:5433/geospatial

# MinIO (Lakehouse)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# APIsix Gateway
APISIX_ADMIN_URL=http://localhost:9080
APISIX_ADMIN_KEY=edd1c9f034335f136f87ad84b625c8f1
```

### Step 2: Deploy Infrastructure Services

```bash
# Make deployment script executable
chmod +x scripts/deploy-infrastructure.sh

# Run deployment script
./scripts/deploy-infrastructure.sh
```

**What this script does**:
1. Starts Kafka brokers (3 instances)
2. Starts Redis cache
3. Starts PostGIS database
4. Starts MinIO object storage
5. Starts APIsix API gateway
6. Initializes Kafka topics
7. Creates MinIO buckets
8. Verifies all services are healthy

### Step 3: Deploy Application Services

```bash
# Start Python microservices
docker-compose -f microservices/python/docker-compose.yml up -d

# Start Go microservices
docker-compose -f microservices/go/docker-compose.yml up -d

# Verify services are running
docker-compose ps
```

### Step 4: Deploy Lakehouse Components

```bash
# Start Flink for stream processing
docker-compose -f microservices/infrastructure/flink/docker-compose.yml up -d

# Start Spark for batch processing
docker-compose -f microservices/infrastructure/spark/docker-compose.yml up -d

# Verify lakehouse is operational
docker-compose -f microservices/infrastructure/lakehouse/docker-compose.yml ps
```

### Step 5: Deploy Main Application

```bash
# Install dependencies
pnpm install

# Build frontend
pnpm build

# Start application server
pnpm start

# Or use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Configure Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/realestate-platform
```

**Nginx Configuration**:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets
    location /assets/ {
        alias /home/ubuntu/realestate-platform/client/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/realestate-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

### Step 7: Configure SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## Service Configuration

### Kafka Topics

```bash
# Create Kafka topics
docker exec -it kafka1 kafka-topics --create \
  --topic property-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 2

docker exec -it kafka1 kafka-topics --create \
  --topic transaction-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 2

docker exec -it kafka1 kafka-topics --create \
  --topic user-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 2

# Verify topics
docker exec -it kafka1 kafka-topics --list --bootstrap-server localhost:9092
```

### MinIO Buckets

```bash
# Create MinIO buckets for lakehouse
docker exec -it minio mc mb local/bronze
docker exec -it minio mc mb local/silver
docker exec -it minio mc mb local/gold
docker exec -it minio mc mb local/property-images
docker exec -it minio mc mb local/documents

# Set bucket policies (public read for images)
docker exec -it minio mc policy set download local/property-images
```

### PostGIS Extensions

```bash
# Enable PostGIS extensions
docker exec -it postgis psql -U postgres -d geospatial -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it postgis psql -U postgres -d geospatial -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
docker exec -it postgis psql -U postgres -d geospatial -c "CREATE EXTENSION IF NOT EXISTS h3;"
docker exec -it postgis psql -U postgres -d geospatial -c "CREATE EXTENSION IF NOT EXISTS h3_postgis;"
```

---

## Verification & Testing

### Health Checks

```bash
# Check all Docker containers
docker ps

# Check application logs
docker-compose logs -f

# Check specific service logs
docker logs ml-valuation-service
docker logs payment-service
docker logs kafka1

# Check application server logs
pm2 logs
```

### Service Endpoints

Test each service is responding:

```bash
# Python services
curl http://localhost:8001/health  # ML Valuation
curl http://localhost:8002/health  # OCR
curl http://localhost:8003/health  # Fraud Detection
curl http://localhost:8004/health  # Geospatial
curl http://localhost:8005/health  # Analytics
curl http://localhost:8006/health  # Recommendation
curl http://localhost:8007/health  # E-Signature

# Go services
curl http://localhost:9001/health  # Payment
curl http://localhost:9002/health  # Notification
curl http://localhost:9003/health  # Image Processing
curl http://localhost:9004/health  # Search

# Infrastructure
curl http://localhost:9092  # Kafka (should refuse connection, that's normal)
redis-cli ping  # Redis (should return PONG)
curl http://localhost:9000  # MinIO
curl http://localhost:9080  # APIsix
```

### Integration Tests

```bash
# Run integration test suite
pnpm test:integration

# Run end-to-end tests
pnpm test:e2e

# Load testing with k6
k6 run scripts/load-test.js
```

### Database Verification

```bash
# Check properties table
pnpm tsx scripts/verify-data.ts

# Expected output:
# ✅ Total properties: 1,622
# 📍 Properties by city: Lagos (365), Abuja (313), ...
# 🏠 Properties by type: Single Family (417), Condo (381), ...
```

---

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
docker logs <service-name>

# Check port conflicts
sudo netstat -tulpn | grep <port>

# Restart service
docker-compose restart <service-name>
```

#### 2. Database Connection Errors

```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
mysql -h <host> -u <user> -p<password> <database>

# Check firewall rules
sudo ufw status
```

#### 3. Kafka Not Connecting

```bash
# Check Kafka brokers
docker exec -it kafka1 kafka-broker-api-versions --bootstrap-server localhost:9092

# Verify topics
docker exec -it kafka1 kafka-topics --list --bootstrap-server localhost:9092

# Check consumer groups
docker exec -it kafka1 kafka-consumer-groups --list --bootstrap-server localhost:9092
```

#### 4. Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Increase swap space
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 5. Disk Space Full

```bash
# Check disk usage
df -h

# Clean Docker images
docker system prune -a

# Clean logs
sudo journalctl --vacuum-time=7d
```

---

## Monitoring & Maintenance

### Prometheus + Grafana Setup

```bash
# Start Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /home/ubuntu/realestate-platform/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana

# Access Grafana: http://your-server-ip:3000
# Default credentials: admin/admin
```

### Log Aggregation

```bash
# Install Loki for log aggregation
docker run -d \
  --name loki \
  -p 3100:3100 \
  grafana/loki

# Install Promtail for log shipping
docker run -d \
  --name promtail \
  -v /var/log:/var/log \
  -v /home/ubuntu/realestate-platform/monitoring/promtail-config.yml:/etc/promtail/config.yml \
  grafana/promtail
```

### Backup Strategy

```bash
# Database backup
mysqldump -h <host> -u <user> -p<password> <database> > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-backup-bucket/

# Automate with cron
crontab -e
# Add: 0 2 * * * /home/ubuntu/scripts/backup-database.sh
```

### Update Strategy

```bash
# Pull latest code
git pull origin main

# Rebuild services
docker-compose build

# Rolling update (zero downtime)
docker-compose up -d --no-deps --build <service-name>

# Verify deployment
curl http://localhost:3001/health
```

---

## Performance Optimization

### Redis Caching

```bash
# Configure Redis maxmemory
docker exec -it redis redis-cli CONFIG SET maxmemory 2gb
docker exec -it redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Database Indexing

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_properties_city_status ON properties(city, status);
CREATE INDEX idx_properties_price_range ON properties(price);
CREATE INDEX idx_properties_coordinates ON properties(latitude, longitude);
CREATE INDEX idx_properties_type_bedrooms ON properties(propertyType, bedrooms);
```

### CDN Configuration

```bash
# Use CloudFlare or CloudFront for static assets
# Configure in Nginx:
location /assets/ {
    proxy_pass https://cdn.yourdomain.com/assets/;
    proxy_cache_valid 200 1y;
}
```

---

## Security Hardening

### Firewall Rules

```bash
# Restrict service ports to localhost
sudo ufw deny 8001:8007/tcp  # Python services
sudo ufw deny 9001:9004/tcp  # Go services
sudo ufw deny 9092:9094/tcp  # Kafka
sudo ufw deny 6379/tcp       # Redis
sudo ufw deny 5433/tcp       # PostGIS
```

### Docker Security

```bash
# Run containers as non-root user
# Add to docker-compose.yml:
user: "1000:1000"

# Limit container resources
# Add to docker-compose.yml:
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
```

### Environment Secrets

```bash
# Use Docker secrets instead of .env
echo "your-secret-value" | docker secret create db_password -

# Reference in docker-compose.yml:
secrets:
  - db_password
```

---

## Cost Optimization

### Auto-Scaling

```bash
# Use cloud provider auto-scaling
# AWS: Configure Auto Scaling Groups
# GCP: Configure Managed Instance Groups
# Azure: Configure Virtual Machine Scale Sets
```

### Reserved Instances

- **AWS**: Purchase 1-year or 3-year Reserved Instances (save 30-60%)
- **GCP**: Commit to 1-year or 3-year usage (save 25-55%)
- **Azure**: Purchase Reserved VM Instances (save 30-72%)

### Spot Instances

- Use spot instances for non-critical workloads (save 70-90%)
- Suitable for: Analytics jobs, batch processing, development environments

---

## Support & Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Redis Documentation](https://redis.io/documentation)
- [PostGIS Documentation](https://postgis.net/documentation/)

### Community
- [Platform GitHub Repository](https://github.com/your-org/realestate-platform)
- [Discord Community](https://discord.gg/your-community)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/realestate-platform)

### Professional Support
- Email: support@yourdomain.com
- Slack: #platform-support
- Emergency: +1-XXX-XXX-XXXX

---

**Document Version**: 1.0  
**Last Updated**: January 17, 2025  
**Maintained By**: Platform DevOps Team
