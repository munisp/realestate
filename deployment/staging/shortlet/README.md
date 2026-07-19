# Shortlet Platform - Staging Deployment Guide

## Prerequisites

1. **Kubernetes Cluster**
   - Kubernetes 1.24+
   - kubectl configured and connected to cluster
   - LoadBalancer support (cloud provider or MetalLB)

2. **Container Registry**
   - Docker images built and pushed:
     - `your-registry/booking-service:latest`
     - `your-registry/verification-service:latest`
     - `your-registry/whatsapp-service:latest`
     - `your-registry/host-dashboard:latest`
     - `your-registry/guest-booking-app:latest`

3. **External Services**
   - Paystack account with test API keys
   - Flutterwave account with test API keys
   - WhatsApp Business API access
   - NIMC API access (for NIN verification)
   - NIBSS API access (for BVN verification)

## Deployment Steps

### 1. Build and Push Docker Images

```bash
# Booking Service
cd services/booking-service
docker build -t your-registry/booking-service:latest .
docker push your-registry/booking-service:latest

# Verification Service
cd ../verification-service
docker build -t your-registry/verification-service:latest .
docker push your-registry/verification-service:latest

# WhatsApp Service
cd ../whatsapp-service
docker build -t your-registry/whatsapp-service:latest .
docker push your-registry/whatsapp-service:latest

# Host Dashboard
cd ../../host-dashboard
docker build -t your-registry/host-dashboard:latest .
docker push your-registry/host-dashboard:latest

# Guest Booking App
cd ../guest-booking-app
docker build -t your-registry/guest-booking-app:latest .
docker push your-registry/guest-booking-app:latest
```

### 2. Configure Secrets

Edit the deployment script and update these secrets:

```bash
# In deploy-shortlet-platform.sh, update:
- PAYSTACK_SECRET_KEY
- FLUTTERWAVE_SECRET_KEY
- AIRBNB_API_KEY
- WHATSAPP_API_KEY
- WHATSAPP_PHONE_NUMBER_ID
- NIMC_API_KEY
- NIBSS_API_KEY
```

### 3. Deploy to Staging

```bash
chmod +x deploy-shortlet-platform.sh
./deploy-shortlet-platform.sh
```

This will deploy:
- PostgreSQL database
- Redis cache
- Booking Service (2 replicas)
- Verification Service (2 replicas)
- WhatsApp Messaging Service (1 replica)
- Host Dashboard (2 replicas)
- Guest Booking App (2 replicas)

### 4. Run Smoke Tests

```bash
chmod +x smoke-tests.sh
./smoke-tests.sh
```

Expected output:
```
Testing: Booking Service Health... ✓ PASSED
Testing: Verification Service Health... ✓ PASSED
Testing: Database Connection... ✓ PASSED
Testing: Redis Connection... ✓ PASSED
...
All tests passed!
```

### 5. Run End-to-End Booking Test

```bash
chmod +x e2e-booking-test.sh
./e2e-booking-test.sh
```

This tests the complete booking flow:
1. Create property
2. Check availability
3. Get price quote
4. Create booking
5. Initialize payment
6. Process payment callback
7. Confirm booking

### 6. Test Payment Integration

```bash
chmod +x test-payment-integration.sh
./test-payment-integration.sh
```

Tests both Paystack and Flutterwave payment providers.

### 7. Run Load Test (Optional)

```bash
chmod +x load-test.sh
./load-test.sh
```

Simulates 100 concurrent users for 9 minutes.

## Accessing Services

After deployment, get service URLs:

```bash
kubectl get svc -n shortlet-staging
```

- **Host Dashboard**: http://<host-dashboard-ip>
- **Guest Booking App**: http://<guest-app-ip>
- **Booking Service API**: http://<booking-service-ip>

## Monitoring

View logs:

```bash
# Booking Service logs
kubectl logs -n shortlet-staging -l app=booking-service -f

# Verification Service logs
kubectl logs -n shortlet-staging -l app=verification-service -f

# WhatsApp Service logs
kubectl logs -n shortlet-staging -l app=whatsapp-service -f
```

Check pod status:

```bash
kubectl get pods -n shortlet-staging
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n shortlet-staging
```

### Database connection issues

```bash
kubectl exec -n shortlet-staging postgres-0 -- psql -U shortlet_user -d shortlet -c '\l'
```

### Service not accessible

```bash
kubectl get svc -n shortlet-staging
kubectl describe svc <service-name> -n shortlet-staging
```

## Cleanup

To remove the staging deployment:

```bash
kubectl delete namespace shortlet-staging
```

## Next Steps

1. Recruit 5-10 pilot hosts
2. Onboard hosts and list properties
3. Test with real bookings
4. Gather feedback
5. Iterate and improve
6. Prepare for production deployment
