# Deployment Scripts

Automated deployment and verification scripts for staging and production environments.

## Scripts

### deploy-staging.sh
Deploys the entire platform to staging environment.

```bash
./deploy-staging.sh
```

### smoke-tests.sh
Runs quick smoke tests to verify basic functionality.

```bash
./smoke-tests.sh realestate-staging
```

### load-test.sh
Runs comprehensive load tests using k6.

```bash
./load-test.sh
```

### verify-deployment.py
Python script for comprehensive deployment verification.

```bash
./verify-deployment.py http://staging.realestate.com
```

### rollback.sh
Rolls back all services to previous version.

```bash
./rollback.sh realestate-staging
```

## Deployment Process

1. Review `DEPLOYMENT_CHECKLIST.md`
2. Run `./deploy-staging.sh`
3. Run `./smoke-tests.sh`
4. Run `./verify-deployment.py`
5. Run `./load-test.sh`
6. Manual testing of critical flows
7. Sign off deployment checklist

## Monitoring

After deployment, monitor:
- Grafana dashboards
- Prometheus alerts
- Application logs
- Error rates
- Response times

## Rollback

If issues are detected:
```bash
./rollback.sh realestate-staging
```
