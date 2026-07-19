# Alertmanager Setup Guide

## Quick Start

### 1. Configure Secrets

```bash
# Copy secrets template
cp secrets.yaml.template secrets.yaml

# Edit with your actual credentials
vim secrets.yaml

# Apply secrets
kubectl apply -f secrets.yaml
```

### 2. Get Integration Keys

#### Slack
1. Go to https://api.slack.com/apps
2. Create a new app or select existing
3. Enable "Incoming Webhooks"
4. Create webhook for each channel:
   - #alerts-critical
   - #alerts-warnings
   - #database-alerts
   - #infrastructure-alerts
   - #business-metrics
5. Copy webhook URL to secrets.yaml

#### SendGrid
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create new API key with "Mail Send" permission
3. Copy API key to secrets.yaml

#### PagerDuty
1. Go to https://your-account.pagerduty.com/services
2. Create new service or select existing
3. Add "Events API V2" integration
4. Copy integration key to secrets.yaml

### 3. Deploy Alertmanager

```bash
kubectl apply -f k8s-deployment.yaml
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n monitoring -l app=alertmanager

# Check logs
kubectl logs -f deployment/alertmanager -n monitoring

# Access UI
kubectl port-forward svc/alertmanager 9093:9093 -n monitoring
# Open http://localhost:9093
```

## Configuration

### Alert Routing

Alerts are routed based on:
- **Severity**: critical, warning
- **Category**: database, infrastructure, business
- **Service**: specific microservice

### Notification Channels

| Severity | Email | Slack | PagerDuty |
|----------|-------|-------|-----------|
| Critical | ✅ | ✅ | ✅ |
| Warning  | ✅ | ✅ | ❌ |

### Grouping

Alerts are grouped by:
- Alert name
- Cluster
- Service

This prevents alert storms.

### Inhibition

- Warning alerts are suppressed if critical alert exists for same service
- Service alerts are suppressed if cluster is down

## Testing

### Test Slack Integration

```bash
# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "service": "test-service"
    },
    "annotations": {
      "summary": "This is a test alert",
      "description": "Testing Slack integration"
    }
  }
]'
```

### Test Email

```bash
# Send test critical alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestCriticalAlert",
      "severity": "critical",
      "service": "test-service"
    },
    "annotations": {
      "summary": "This is a critical test alert",
      "description": "Testing email integration"
    }
  }
]'
```

## Customization

### Add New Receiver

Edit `config.yml`:

```yaml
receivers:
  - name: 'custom-team'
    email_configs:
      - to: 'team@realestate.com'
    slack_configs:
      - channel: '#custom-alerts'
```

### Add New Route

```yaml
routes:
  - match:
      team: custom
    receiver: 'custom-team'
```

### Customize Templates

Edit templates in `templates/` directory:
- `slack.tmpl` - Slack message formatting
- `email.tmpl` - Email HTML formatting

## Troubleshooting

### Alerts Not Sending

1. Check Alertmanager logs
2. Verify secrets are correct
3. Test webhook URLs manually
4. Check Prometheus is sending alerts

### Duplicate Alerts

1. Review grouping configuration
2. Adjust `group_wait` and `group_interval`
3. Check inhibition rules

### Missing Alerts

1. Verify alert rules in Prometheus
2. Check routing configuration
3. Ensure receivers are configured

## Best Practices

1. **Test Regularly**: Send test alerts weekly
2. **Review Routes**: Ensure alerts go to right teams
3. **Update On-Call**: Keep PagerDuty schedules current
4. **Monitor Alertmanager**: Set up alerts for Alertmanager itself
5. **Document Runbooks**: Link to runbooks in alert annotations

## Maintenance

### Rotate Secrets

```bash
# Update secrets
kubectl edit secret alertmanager-secrets -n monitoring

# Restart Alertmanager
kubectl rollout restart deployment/alertmanager -n monitoring
```

### Update Configuration

```bash
# Edit config
vim config.yml

# Apply changes
kubectl create configmap alertmanager-config \
  --from-file=config.yml \
  --dry-run=client -o yaml | kubectl apply -f -

# Reload Alertmanager
kubectl exec deployment/alertmanager -n monitoring -- \
  kill -HUP 1
```

## Support

For issues with Alertmanager:
- Check logs: `kubectl logs -f deployment/alertmanager -n monitoring`
- Verify configuration: http://localhost:9093/#/status
- Test alerts: http://localhost:9093/#/alerts
