# Staging Deployment Checklist

## Pre-Deployment

- [ ] All tests passing in CI/CD
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Secrets created in Kubernetes
- [ ] SSL certificates ready
- [ ] Backup of production data taken

## Deployment

- [ ] Run `./deploy-staging.sh`
- [ ] Verify all pods are running: `kubectl get pods -n realestate-staging`
- [ ] Check pod logs for errors
- [ ] Run smoke tests: `./smoke-tests.sh`
- [ ] Verify monitoring dashboards
- [ ] Check Prometheus targets are up
- [ ] Test critical user flows manually

## Post-Deployment

- [ ] Run load tests: `./load-test.sh`
- [ ] Monitor error rates in Grafana
- [ ] Check database performance
- [ ] Verify all integrations working
- [ ] Test payment processing
- [ ] Test notification delivery
- [ ] Verify search functionality
- [ ] Check analytics data ingestion

## Rollback Plan

If issues are detected:
1. Run `./rollback.sh realestate-staging`
2. Investigate root cause
3. Fix issues in development
4. Re-deploy when ready

## Success Criteria

- [ ] All health checks passing
- [ ] Error rate < 1%
- [ ] P95 latency < 500ms
- [ ] All critical features working
- [ ] No database connection issues
- [ ] Monitoring and alerts functioning
- [ ] Load test passed

## Sign-off

- Developer: _______________
- QA: _______________
- DevOps: _______________
- Product Owner: _______________

Date: _______________
