# Staging Deployment Runbook

## Overview

This runbook provides step-by-step instructions for deploying the complete shortlet booking platform to the staging environment for the Lagos pilot launch.

## Prerequisites

Before beginning deployment, ensure all prerequisites are met to avoid deployment failures and ensure smooth operations.

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.28+ with 5+ nodes
- **GPU Nodes**: 2x nodes with NVIDIA Tesla T4 GPUs
- **Storage**: 500GB persistent volume storage
- **Network**: Load balancer with public IP
- **Domain**: staging.platform.com configured

### Access Requirements

- `kubectl` configured with cluster admin access
- Docker registry credentials (for private images)
- Database connection strings (PostgreSQL, Redis, ClickHouse)
- API keys (Paystack, Flutterwave, WhatsApp Business, Onfido)
- SSL certificates (for HTTPS)

### Required Secrets

Create Kubernetes secrets before deployment:

\`\`\`bash
# Database credentials
kubectl create secret generic db-credentials \
  --from-literal=postgres-url='postgresql://user:pass@host:5432/db' \
  --from-literal=redis-url='redis://host:6379' \
  --from-literal=clickhouse-url='http://host:8123' \
  -n realestate

# Payment gateway credentials
kubectl create secret generic payment-credentials \
  --from-literal=paystack-secret-key='sk_test_xxxxx' \
  --from-literal=flutterwave-secret-key='FLWSECK_TEST-xxxxx' \
  -n realestate

# Verification service credentials
kubectl create secret generic verification-credentials \
  --from-literal=onfido-api-key='api_live.xxxxx' \
  --from-literal=nin-api-key='xxxxx' \
  --from-literal=bvn-api-key='xxxxx' \
  -n realestate

# WhatsApp Business credentials
kubectl create secret generic whatsapp-credentials \
  --from-literal=whatsapp-api-key='xxxxx' \
  --from-literal=whatsapp-phone-number='+234xxxxxxxxxx' \
  -n realestate

# JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=jwt-secret='your-secret-key-here' \
  -n realestate
\`\`\`

## Deployment Steps

### Step 1: Create Namespace

\`\`\`bash
kubectl create namespace realestate
kubectl label namespace realestate env=staging
\`\`\`

### Step 2: Deploy Infrastructure Services

Deploy supporting infrastructure in the correct order to ensure dependencies are met.

#### 2.1 PostgreSQL Database

\`\`\`bash
kubectl apply -f infrastructure/postgres/deployment.yaml -n realestate
kubectl apply -f infrastructure/postgres/service.yaml -n realestate

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n realestate --timeout=300s

# Run database migrations
kubectl apply -f infrastructure/postgres/migrations-job.yaml -n realestate
kubectl wait --for=condition=complete job/db-migrations -n realestate --timeout=300s
\`\`\`

#### 2.2 Redis Cache

\`\`\`bash
kubectl apply -f infrastructure/redis/deployment.yaml -n realestate
kubectl apply -f infrastructure/redis/service.yaml -n realestate

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis -n realestate --timeout=300s
\`\`\`

#### 2.3 ClickHouse Analytics

\`\`\`bash
kubectl apply -f infrastructure/clickhouse/statefulset.yaml -n realestate
kubectl apply -f infrastructure/clickhouse/service.yaml -n realestate

# Wait for ClickHouse to be ready
kubectl wait --for=condition=ready pod -l app=clickhouse -n realestate --timeout=300s

# Initialize ClickHouse schema
kubectl apply -f infrastructure/clickhouse/schema-job.yaml -n realestate
kubectl wait --for=condition=complete job/clickhouse-schema -n realestate --timeout=300s
\`\`\`

#### 2.4 Kafka Event Streaming

\`\`\`bash
kubectl apply -f infrastructure/kafka/statefulset.yaml -n realestate
kubectl apply -f infrastructure/kafka/service.yaml -n realestate

# Wait for Kafka to be ready
kubectl wait --for=condition=ready pod -l app=kafka -n realestate --timeout=300s

# Create Kafka topics
kubectl apply -f infrastructure/kafka/topics-job.yaml -n realestate
kubectl wait --for=condition=complete job/kafka-topics -n realestate --timeout=300s
\`\`\`

### Step 3: Deploy Microservices

Deploy microservices in dependency order to ensure proper startup sequence.

#### 3.1 User Service

\`\`\`bash
kubectl apply -f services/user-service/deployment.yaml -n realestate
kubectl apply -f services/user-service/service.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/user-service -n realestate --timeout=300s

# Verify health
kubectl exec -it deployment/user-service -n realestate -- curl http://localhost:3000/health
\`\`\`

#### 3.2 Property Service

\`\`\`bash
kubectl apply -f services/property-service/deployment.yaml -n realestate
kubectl apply -f services/property-service/service.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/property-service -n realestate --timeout=300s

# Verify health
kubectl exec -it deployment/property-service -n realestate -- curl http://localhost:3001/health
\`\`\`

#### 3.3 OCR Service (GPU)

\`\`\`bash
kubectl apply -f services/ocr-service/k8s/gpu/deployment-gpu.yaml -n realestate
kubectl apply -f services/ocr-service/k8s/gpu/service.yaml -n realestate
kubectl apply -f services/ocr-service/k8s/gpu/hpa-gpu.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/ocr-service-gpu -n realestate --timeout=600s

# Verify GPU allocation
kubectl get pods -n realestate -l app=ocr-service-gpu -o json | jq '.items[].spec.containers[].resources.limits'

# Verify health
kubectl exec -it deployment/ocr-service-gpu -n realestate -- curl http://localhost:8000/health
\`\`\`

#### 3.4 Verification Service

\`\`\`bash
kubectl apply -f services/verification-service/deployment.yaml -n realestate
kubectl apply -f services/verification-service/service.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/verification-service -n realestate --timeout=300s

# Verify health
kubectl exec -it deployment/verification-service -n realestate -- curl http://localhost:3002/health
\`\`\`

#### 3.5 Booking Service

\`\`\`bash
kubectl apply -f services/booking-service/deployment.yaml -n realestate
kubectl apply -f services/booking-service/service.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/booking-service -n realestate --timeout=300s

# Verify health
kubectl exec -it deployment/booking-service -n realestate -- curl http://localhost:3003/health
\`\`\`

#### 3.6 WhatsApp Service

\`\`\`bash
kubectl apply -f apps/whatsapp-service/deployment.yaml -n realestate
kubectl apply -f apps/whatsapp-service/service.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/whatsapp-service -n realestate --timeout=300s

# Verify health
kubectl exec -it deployment/whatsapp-service -n realestate -- curl http://localhost:3004/health
\`\`\`

### Step 4: Deploy Frontend Applications

#### 4.1 Host Dashboard

\`\`\`bash
kubectl apply -f apps/host-dashboard/deployment.yaml -n realestate
kubectl apply -f apps/host-dashboard/service.yaml -n realestate
kubectl apply -f apps/host-dashboard/ingress.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/host-dashboard -n realestate --timeout=300s

# Get ingress URL
kubectl get ingress host-dashboard -n realestate
\`\`\`

#### 4.2 Guest Booking App

\`\`\`bash
kubectl apply -f apps/guest-app/deployment.yaml -n realestate
kubectl apply -f apps/guest-app/service.yaml -n realestate
kubectl apply -f apps/guest-app/ingress.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/guest-app -n realestate --timeout=300s

# Get ingress URL
kubectl get ingress guest-app -n realestate
\`\`\`

### Step 5: Deploy Monitoring Stack

#### 5.1 Prometheus

\`\`\`bash
kubectl apply -f monitoring/prometheus/deployment.yaml -n realestate
kubectl apply -f monitoring/prometheus/service.yaml -n realestate
kubectl apply -f monitoring/prometheus/configmap.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/prometheus -n realestate --timeout=300s
\`\`\`

#### 5.2 Grafana

\`\`\`bash
kubectl apply -f monitoring/grafana/deployment.yaml -n realestate
kubectl apply -f monitoring/grafana/service.yaml -n realestate
kubectl apply -f monitoring/grafana/dashboards-configmap.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/grafana -n realestate --timeout=300s

# Get Grafana URL
kubectl get svc grafana -n realestate
\`\`\`

#### 5.3 Alertmanager

\`\`\`bash
kubectl apply -f monitoring/alertmanager/deployment.yaml -n realestate
kubectl apply -f monitoring/alertmanager/service.yaml -n realestate
kubectl apply -f monitoring/alertmanager/config-configmap.yaml -n realestate

# Wait for deployment
kubectl rollout status deployment/alertmanager -n realestate --timeout=300s
\`\`\`

## Post-Deployment Verification

### Step 6: Run Smoke Tests

\`\`\`bash
cd deployment/staging/shortlet
./smoke-tests.sh
\`\`\`

**Expected output**:
\`\`\`
✅ All services are healthy
✅ Database connectivity verified
✅ Redis connectivity verified
✅ Kafka connectivity verified
✅ OCR service GPU allocation verified
✅ Payment gateway integration verified
✅ WhatsApp Business API verified
✅ Frontend applications accessible
\`\`\`

### Step 7: Run E2E Tests

\`\`\`bash
cd deployment/staging/shortlet
./e2e-tests.sh
\`\`\`

**Expected output**:
\`\`\`
✅ User registration and login
✅ Property listing creation
✅ Guest verification flow (all tiers)
✅ Booking creation and payment
✅ Calendar synchronization
✅ WhatsApp notifications
✅ Host payout processing
\`\`\`

### Step 8: Load Testing

\`\`\`bash
cd deployment/staging/shortlet
k6 run load-tests/baseline.js
\`\`\`

**Expected results**:
- **Throughput**: >100 requests/second
- **Latency (p95)**: <500ms
- **Error rate**: <0.1%
- **OCR processing**: <2 seconds per document

## Monitoring and Alerts

### Access Dashboards

**Grafana**:
- URL: https://grafana.staging.platform.com
- Username: admin
- Password: (from secret)

**Key Dashboards**:
- Platform Overview
- Service Health
- OCR Performance
- Booking Funnel
- Payment Processing

### Configure Alerts

Verify alert channels are configured:

\`\`\`bash
kubectl get configmap alertmanager-config -n realestate -o yaml
\`\`\`

**Alert Channels**:
- Slack: #platform-alerts
- Email: ops@platform.com
- PagerDuty: On-call rotation

## Rollback Procedure

If deployment fails or critical issues are detected:

### Quick Rollback

\`\`\`bash
# Rollback specific service
kubectl rollout undo deployment/<service-name> -n realestate

# Rollback all services
./rollback-all.sh
\`\`\`

### Full Rollback

\`\`\`bash
# Delete all deployments
kubectl delete namespace realestate

# Redeploy previous version
git checkout <previous-commit>
./deploy-staging.sh
\`\`\`

## Troubleshooting

### Service Not Starting

**Symptoms**: Pod in CrashLoopBackOff or Pending state

**Diagnosis**:
\`\`\`bash
kubectl describe pod <pod-name> -n realestate
kubectl logs <pod-name> -n realestate --previous
\`\`\`

**Common Causes**:
1. Missing secrets or config maps
2. Database connection failure
3. Insufficient resources
4. Image pull errors

### GPU Not Allocated

**Symptoms**: OCR service slow or failing

**Diagnosis**:
\`\`\`bash
kubectl describe pod <ocr-pod> -n realestate | grep nvidia.com/gpu
kubectl get nodes -o json | jq '.items[].status.allocatable."nvidia.com/gpu"'
\`\`\`

**Solution**:
\`\`\`bash
# Verify NVIDIA device plugin is running
kubectl get daemonset nvidia-device-plugin-daemonset -n kube-system

# Restart OCR service
kubectl rollout restart deployment/ocr-service-gpu -n realestate
\`\`\`

### Payment Gateway Errors

**Symptoms**: Booking payments failing

**Diagnosis**:
\`\`\`bash
kubectl logs deployment/booking-service -n realestate | grep payment
\`\`\`

**Common Causes**:
1. Invalid API keys
2. Webhook URL not configured
3. Test mode vs. live mode mismatch

**Solution**:
\`\`\`bash
# Verify secrets
kubectl get secret payment-credentials -n realestate -o yaml

# Update secrets if needed
kubectl delete secret payment-credentials -n realestate
kubectl create secret generic payment-credentials \
  --from-literal=paystack-secret-key='sk_test_xxxxx' \
  --from-literal=flutterwave-secret-key='FLWSECK_TEST-xxxxx' \
  -n realestate

# Restart booking service
kubectl rollout restart deployment/booking-service -n realestate
\`\`\`

## Maintenance

### Updating Services

\`\`\`bash
# Update service image
kubectl set image deployment/<service-name> \
  <container-name>=<new-image>:<tag> \
  -n realestate

# Monitor rollout
kubectl rollout status deployment/<service-name> -n realestate
\`\`\`

### Scaling Services

\`\`\`bash
# Manual scaling
kubectl scale deployment/<service-name> --replicas=5 -n realestate

# Update HPA
kubectl edit hpa/<service-name>-hpa -n realestate
\`\`\`

### Database Backups

\`\`\`bash
# Create backup
kubectl exec -it deployment/postgres -n realestate -- \
  pg_dump -U postgres realestate > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
kubectl exec -i deployment/postgres -n realestate -- \
  psql -U postgres realestate < backup_20251117_120000.sql
\`\`\`

## Checklist

Before declaring deployment complete, verify:

- [ ] All pods are running and healthy
- [ ] Smoke tests pass
- [ ] E2E tests pass
- [ ] Load tests meet performance targets
- [ ] Monitoring dashboards show green status
- [ ] Alerts are configured and firing test alerts
- [ ] Frontend applications accessible via ingress
- [ ] SSL certificates valid
- [ ] Database migrations completed
- [ ] Kafka topics created
- [ ] GPU nodes allocated to OCR service
- [ ] Payment gateways responding
- [ ] WhatsApp Business API connected
- [ ] Documentation updated

## Support Contacts

- **Platform Team**: platform@company.com
- **DevOps**: devops@company.com
- **On-Call**: +234-XXX-XXXX-XXX
- **Slack**: #platform-ops

---

*Last updated: November 17, 2025*
