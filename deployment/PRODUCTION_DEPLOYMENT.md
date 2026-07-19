# Production Deployment Guide

## Prerequisites

1. **Kubernetes Cluster**
   - Kubernetes 1.28+
   - Minimum 5 nodes (8 CPU, 32GB RAM each)
   - Storage class with dynamic provisioning

2. **Access & Credentials**
   - kubectl configured with cluster admin access
   - Docker registry credentials
   - SSL/TLS certificates
   - All API keys and secrets

3. **External Services**
   - Stripe account (production keys)
   - SendGrid account (API key)
   - Domain name with DNS access

## Pre-Deployment Steps

### 1. Prepare Secrets

```bash
# Copy secrets template
cp production/secrets.yaml.template production/secrets.yaml

# Edit with actual production values
vim production/secrets.yaml

# Apply secrets
kubectl apply -f production/secrets.yaml
```

### 2. Configure DNS

Point your domain to the cluster load balancer:
```
app.realestate.com      → LoadBalancer IP
api.realestate.com      → LoadBalancer IP
grafana.realestate.com  → LoadBalancer IP
```

### 3. SSL Certificates

```bash
# Using cert-manager (recommended)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Or manually create secret
kubectl create secret tls tls-certificate \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n realestate-production
```

### 4. Database Backup

Set up automated backups:
```bash
kubectl apply -f production/backup-cronjob.yaml
```

## Deployment

### 1. Run Pre-Deployment Checks

```bash
./pre-deployment-checks.sh
```

### 2. Deploy to Production

```bash
./deploy-production.sh
```

### 3. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n realestate-production

# Run smoke tests
./smoke-tests.sh realestate-production

# Run security checks
./security-check.sh realestate-production

# Run verification suite
./verify-deployment.py https://api.realestate.com
```

### 4. Monitor Deployment

```bash
# Watch pod status
kubectl get pods -n realestate-production -w

# Check logs
kubectl logs -f deployment/property-service -n realestate-production

# View Grafana dashboards
open https://grafana.realestate.com
```

## Post-Deployment

### 1. Performance Testing

```bash
# Run load test
API_URL=https://api.realestate.com ./load-test.sh
```

### 2. Configure Monitoring Alerts

- Set up PagerDuty integration
- Configure Slack notifications
- Set up on-call schedules

### 3. Enable Auto-Scaling

```bash
kubectl apply -f production/hpa.yaml
```

### 4. Documentation

- Update runbooks
- Document any production-specific configurations
- Share access credentials with team (use password manager)

## Rollback Procedure

If issues are detected:

```bash
# Immediate rollback
./rollback.sh realestate-production

# Or rollback specific service
kubectl rollout undo deployment/property-service -n realestate-production
```

## Monitoring

### Key Metrics to Watch

- **Error Rate**: Should be < 0.1%
- **Latency (p95)**: Should be < 500ms
- **CPU Usage**: Should be < 70%
- **Memory Usage**: Should be < 80%
- **Database Connections**: Monitor for leaks

### Dashboards

- **Microservices Overview**: https://grafana.realestate.com/d/microservices
- **Infrastructure**: https://grafana.realestate.com/d/infrastructure
- **Business Metrics**: https://grafana.realestate.com/d/business

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n realestate-production
kubectl logs <pod-name> -n realestate-production
```

### High Error Rate

1. Check application logs
2. Check database connectivity
3. Check external service status (Stripe, SendGrid)
4. Review recent deployments

### Performance Issues

1. Check HPA status
2. Review resource limits
3. Check database query performance
4. Review caching effectiveness

## Security

### Regular Security Tasks

- [ ] Rotate secrets monthly
- [ ] Update SSL certificates before expiry
- [ ] Review and update network policies
- [ ] Scan images for vulnerabilities
- [ ] Review access logs
- [ ] Update dependencies

## Backup & Disaster Recovery

### Backup Schedule

- **Database**: Daily full backup, hourly incremental
- **Object Storage**: Continuous replication
- **Configuration**: Version controlled in Git

### Recovery Procedures

1. Restore from latest backup
2. Verify data integrity
3. Run smoke tests
4. Gradually restore traffic

## Support

For production issues:
- **Critical**: Page on-call engineer
- **High**: Create incident in PagerDuty
- **Medium**: Create ticket in Jira
- **Low**: Schedule for next sprint

## Checklist

- [ ] All secrets configured
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Backups configured
- [ ] Monitoring alerts set up
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback procedure tested
