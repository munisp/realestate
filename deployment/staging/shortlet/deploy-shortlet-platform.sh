#!/bin/bash
set -euo pipefail

echo "======================================"
echo "Shortlet Platform - Staging Deployment"
echo "======================================"

# Configuration
NAMESPACE="shortlet-staging"
KUBECTL="kubectl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create namespace
log_info "Creating namespace: $NAMESPACE"
$KUBECTL create namespace $NAMESPACE --dry-run=client -o yaml | $KUBECTL apply -f -

# Step 2: Deploy PostgreSQL for services
log_info "Deploying PostgreSQL database..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: $NAMESPACE
data:
  POSTGRES_DB: shortlet
  POSTGRES_USER: shortlet_user
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: $NAMESPACE
type: Opaque
stringData:
  POSTGRES_PASSWORD: shortlet_staging_pass_2025
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: $NAMESPACE
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        envFrom:
        - configMapRef:
            name: postgres-config
        - secretRef:
            name: postgres-secret
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: $NAMESPACE
spec:
  ports:
  - port: 5432
  selector:
    app: postgres
  clusterIP: None
EOF

# Step 3: Deploy Redis
log_info "Deploying Redis..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server", "--appendonly", "yes"]
        volumeMounts:
        - name: redis-storage
          mountPath: /data
      volumes:
      - name: redis-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: $NAMESPACE
spec:
  ports:
  - port: 6379
  selector:
    app: redis
EOF

# Step 4: Deploy Booking Service
log_info "Deploying Booking Service..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: booking-service-config
  namespace: $NAMESPACE
data:
  NODE_ENV: staging
  DATABASE_URL: postgresql://shortlet_user:shortlet_staging_pass_2025@postgres:5432/shortlet
  REDIS_URL: redis://redis:6379
  KAFKA_BROKERS: kafka:9092
  PORT: "3000"
---
apiVersion: v1
kind: Secret
metadata:
  name: booking-service-secret
  namespace: $NAMESPACE
type: Opaque
stringData:
  PAYSTACK_SECRET_KEY: sk_test_your_paystack_key
  FLUTTERWAVE_SECRET_KEY: FLWSECK_TEST-your_flutterwave_key
  AIRBNB_API_KEY: your_airbnb_api_key
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: booking-service
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: booking-service
  template:
    metadata:
      labels:
        app: booking-service
    spec:
      containers:
      - name: booking-service
        image: your-registry/booking-service:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: booking-service-config
        - secretRef:
            name: booking-service-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: booking-service
  namespace: $NAMESPACE
spec:
  selector:
    app: booking-service
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
EOF

# Step 5: Deploy Verification Service
log_info "Deploying Verification Service..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: verification-service-config
  namespace: $NAMESPACE
data:
  NODE_ENV: staging
  DATABASE_URL: postgresql://shortlet_user:shortlet_staging_pass_2025@postgres:5432/shortlet
  REDIS_URL: redis://redis:6379
  KAFKA_BROKERS: kafka:9092
  PORT: "3001"
---
apiVersion: v1
kind: Secret
metadata:
  name: verification-service-secret
  namespace: $NAMESPACE
type: Opaque
stringData:
  NIMC_API_KEY: your_nimc_api_key
  NIBSS_API_KEY: your_nibss_api_key
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verification-service
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: verification-service
  template:
    metadata:
      labels:
        app: verification-service
    spec:
      containers:
      - name: verification-service
        image: your-registry/verification-service:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: verification-service-config
        - secretRef:
            name: verification-service-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: verification-service
  namespace: $NAMESPACE
spec:
  selector:
    app: verification-service
  ports:
  - port: 80
    targetPort: 3001
EOF

# Step 6: Deploy WhatsApp Messaging Service
log_info "Deploying WhatsApp Messaging Service..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: whatsapp-service-config
  namespace: $NAMESPACE
data:
  NODE_ENV: staging
  REDIS_URL: redis://redis:6379
  KAFKA_BROKERS: kafka:9092
  PORT: "3002"
---
apiVersion: v1
kind: Secret
metadata:
  name: whatsapp-service-secret
  namespace: $NAMESPACE
type: Opaque
stringData:
  WHATSAPP_API_KEY: your_whatsapp_business_api_key
  WHATSAPP_PHONE_NUMBER_ID: your_phone_number_id
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-service
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: whatsapp-service
  template:
    metadata:
      labels:
        app: whatsapp-service
    spec:
      containers:
      - name: whatsapp-service
        image: your-registry/whatsapp-service:latest
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: whatsapp-service-config
        - secretRef:
            name: whatsapp-service-secret
---
apiVersion: v1
kind: Service
metadata:
  name: whatsapp-service
  namespace: $NAMESPACE
spec:
  selector:
    app: whatsapp-service
  ports:
  - port: 80
    targetPort: 3002
EOF

# Step 7: Deploy Host Dashboard
log_info "Deploying Host Dashboard..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: host-dashboard-config
  namespace: $NAMESPACE
data:
  REACT_APP_API_URL: http://booking-service
  REACT_APP_ENV: staging
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: host-dashboard
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: host-dashboard
  template:
    metadata:
      labels:
        app: host-dashboard
    spec:
      containers:
      - name: host-dashboard
        image: your-registry/host-dashboard:latest
        ports:
        - containerPort: 80
        envFrom:
        - configMapRef:
            name: host-dashboard-config
---
apiVersion: v1
kind: Service
metadata:
  name: host-dashboard
  namespace: $NAMESPACE
spec:
  selector:
    app: host-dashboard
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
EOF

# Step 8: Deploy Guest Booking App
log_info "Deploying Guest Booking App..."
cat <<EOF | $KUBECTL apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: guest-app-config
  namespace: $NAMESPACE
data:
  REACT_APP_API_URL: http://booking-service
  REACT_APP_ENV: staging
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guest-app
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: guest-app
  template:
    metadata:
      labels:
        app: guest-app
    spec:
      containers:
      - name: guest-app
        image: your-registry/guest-booking-app:latest
        ports:
        - containerPort: 80
        envFrom:
        - configMapRef:
            name: guest-app-config
---
apiVersion: v1
kind: Service
metadata:
  name: guest-app
  namespace: $NAMESPACE
spec:
  selector:
    app: guest-app
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
EOF

# Wait for deployments to be ready
log_info "Waiting for deployments to be ready..."
$KUBECTL wait --for=condition=available --timeout=300s deployment --all -n $NAMESPACE

# Get service URLs
log_info "\n======================================"
log_info "Deployment Complete!"
log_info "======================================\n"

log_info "Service URLs:"
$KUBECTL get svc -n $NAMESPACE -o wide

log_info "\nTo access services:"
log_info "Host Dashboard: http://$(kubectl get svc host-dashboard -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
log_info "Guest App: http://$(kubectl get svc guest-app -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
log_info "Booking Service: http://$(kubectl get svc booking-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"

log_info "\nNext steps:"
log_info "1. Run smoke tests: ./smoke-tests.sh"
log_info "2. Test booking flow end-to-end"
log_info "3. Verify payment processing"
log_info "4. Check WhatsApp message delivery"
