# Real Estate Platform - Complete Deployment Guide

## 🏗️ Architecture Overview

This enterprise-scale real estate platform consists of:

### Microservices (8 services)
1. **Property Service** (Node.js/TypeScript) - Core property management
2. **User Service** (Node.js/TypeScript) - User authentication & profiles
3. **Transaction Service** (Node.js/TypeScript) - Payment & transactions
4. **Search Service** (Node.js/TypeScript) - Full-text search with OpenSearch
5. **CRM Service** (Node.js/TypeScript) - Lead & contact management
6. **Developer Service** (Go) - Property developer portal
7. **Analytics Service** (Python) - Real-time analytics with ClickHouse
8. **Notification Service** (Python) - Multi-channel notifications

### Infrastructure Components
- **ClickHouse** - Analytics database
- **OpenSearch** - Search engine
- **Fluvio** - Event streaming
- **PostgreSQL** - Primary database
- **Redis** - Caching & sessions
- **Kafka** - Message broker

### Client Applications
- **Web Frontend** - React 19 + Tailwind 4 + tRPC
- **Mobile Apps** - React Native (iOS + Android)
- **Admin Dashboard** - React + TypeScript

---

## 📦 Quick Start (Docker Compose)

### Prerequisites
- Docker 24+ & Docker Compose 2+
- 16GB RAM minimum
- 100GB disk space

### 1. Clone and Setup
```bash
git clone <repository>
cd realestate-platform
```

### 2. Start Infrastructure
```bash
# Start databases and message brokers
docker-compose -f infrastructure/docker-compose.yml up -d

# Verify all services are running
docker-compose -f infrastructure/docker-compose.yml ps
```

### 3. Deploy Microservices
```bash
# Build all services
docker-compose -f services/docker-compose.yml build

# Start all microservices
docker-compose -f services/docker-compose.yml up -d
```

### 4. Deploy Frontend
```bash
cd client
npm install
npm run build
npm run start
```

### 5. Access Applications
- **Web App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **API Gateway**: http://localhost:8080
- **OpenSearch Dashboards**: http://localhost:5601

---

## ☸️ Kubernetes Deployment (Production)

### Prerequisites
- Kubernetes 1.28+
- kubectl configured
- Helm 3+
- 32GB RAM cluster minimum

### 1. Create Namespace
```bash
kubectl create namespace realestate
kubectl config set-context --current --namespace=realestate
```

### 2. Deploy Infrastructure

#### ClickHouse
```bash
kubectl apply -f infrastructure/clickhouse/k8s-deployment.yaml
kubectl wait --for=condition=ready pod -l app=clickhouse --timeout=300s
```

#### OpenSearch
```bash
kubectl apply -f infrastructure/opensearch/k8s-deployment.yaml
kubectl wait --for=condition=ready pod -l app=opensearch --timeout=300s
```

#### Fluvio
```bash
helm repo add fluvio https://infinyon.github.io/charts
helm install fluvio fluvio/fluvio --namespace fluvio-system --create-namespace
```

### 3. Deploy Microservices
```bash
# Deploy all services
for service in property-service user-service transaction-service search-service crm-service developer-service analytics-service notification-service; do
  kubectl apply -f services/$service/k8s/deployment.yaml
done

# Verify deployments
kubectl get deployments
kubectl get pods
```

### 4. Deploy API Gateway
```bash
kubectl apply -f infrastructure/api-gateway/k8s-deployment.yaml
```

### 5. Configure Ingress
```bash
kubectl apply -f infrastructure/ingress.yaml
```

---

## 🔧 Configuration

### Environment Variables

Each service requires specific environment variables. Create a `.env` file or Kubernetes secrets:

#### Property Service
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/properties
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
PORT=8001
```

#### Analytics Service
```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=admin
CLICKHOUSE_PASSWORD=admin123
KAFKA_BROKERS=localhost:9092
PORT=8003
```

#### Notification Service
```env
SENDGRID_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
REDIS_URL=redis://localhost:6379
PORT=8002
```

### Kubernetes Secrets
```bash
kubectl create secret generic property-service-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=REDIS_URL=redis://...

kubectl create secret generic notification-secrets \
  --from-literal=sendgrid-api-key=... \
  --from-literal=twilio-account-sid=... \
  --from-literal=twilio-auth-token=...
```

---

## 📊 Monitoring & Observability

### Prometheus + Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80
# Default: admin/prom-operator
```

### Jaeger (Distributed Tracing)
```bash
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
kubectl apply -f infrastructure/jaeger/deployment.yaml
```

### Logs (ELK Stack)
```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install filebeat elastic/filebeat
```

---

## 🔐 Security

### SSL/TLS Certificates
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f infrastructure/cert-manager/cluster-issuer.yaml
```

### Network Policies
```bash
kubectl apply -f infrastructure/network-policies/
```

### RBAC
```bash
kubectl apply -f infrastructure/rbac/
```

---

## 📱 Mobile App Deployment

### iOS
```bash
cd mobile
npm install
cd ios && pod install && cd ..

# Build
xcodebuild -workspace ios/RealEstateApp.xcworkspace \
  -scheme RealEstateApp \
  -configuration Release \
  -archivePath build/RealEstateApp.xcarchive \
  archive

# Upload to App Store Connect
```

### Android
```bash
cd mobile/android
./gradlew assembleRelease

# APK location: app/build/outputs/apk/release/app-release.apk
```

---

## 🧪 Testing

### Unit Tests
```bash
# All services
npm test

# Specific service
cd services/property-service && npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

---

## 📈 Scaling

### Horizontal Pod Autoscaler
```bash
kubectl autoscale deployment property-service --cpu-percent=70 --min=3 --max=10
kubectl autoscale deployment search-service --cpu-percent=70 --min=3 --max=10
```

### Database Scaling
```bash
# ClickHouse: Increase replicas
kubectl scale statefulset clickhouse --replicas=5

# OpenSearch: Increase replicas
kubectl scale statefulset opensearch --replicas=5
```

---

## 🔄 CI/CD

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push images
        run: |
          docker build -t registry/property-service:${{ github.sha }} services/property-service
          docker push registry/property-service:${{ github.sha }}
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/property-service \
            property-service=registry/property-service:${{ github.sha }}
```

---

## 🆘 Troubleshooting

### Service Not Starting
```bash
# Check logs
kubectl logs -f deployment/property-service

# Check events
kubectl describe pod <pod-name>

# Check resource usage
kubectl top pods
```

### Database Connection Issues
```bash
# Test ClickHouse
kubectl run -it --rm clickhouse-test --image=clickhouse/clickhouse-client -- clickhouse-client --host=clickhouse

# Test OpenSearch
kubectl run -it --rm opensearch-test --image=curlimages/curl -- curl -X GET "opensearch:9200"
```

### Performance Issues
```bash
# Check HPA status
kubectl get hpa

# Check resource limits
kubectl describe deployment property-service

# View metrics
kubectl top pods
kubectl top nodes
```

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8080/docs
- **Architecture Diagrams**: `/docs/architecture/`
- **Database Schemas**: `/docs/schemas/`
- **Runbooks**: `/docs/runbooks/`

---

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring dashboards set up
- [ ] Log aggregation configured
- [ ] Secrets rotated
- [ ] Network policies applied
- [ ] Resource limits set
- [ ] HPA configured
- [ ] Disaster recovery plan tested
- [ ] Load testing completed
- [ ] Security audit passed

---

## 📞 Support

For deployment issues or questions:
- Create an issue in the repository
- Contact DevOps team
- Check documentation at `/docs/`

