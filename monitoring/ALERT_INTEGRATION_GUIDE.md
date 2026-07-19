# Alert Integration Configuration & Testing Guide

## Overview

This guide walks you through configuring and testing all alert notification channels (Slack, Email, PagerDuty) for the Real Estate Platform.

---

## Prerequisites

You'll need:
1. Slack workspace with admin access
2. SendGrid account with API key
3. PagerDuty account with service configured
4. Access to Kubernetes cluster

---

## Step 1: Slack Integration

### 1.1 Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Real Estate Platform Alerts"
4. Select your workspace

### 1.2 Enable Incoming Webhooks

1. In your app settings, click "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to ON
3. Click "Add New Webhook to Workspace"
4. Select channels (create if needed):
   - `#alerts-critical`
   - `#alerts-warnings`
   - `#database-alerts`
   - `#infrastructure-alerts`
   - `#business-metrics`
5. Copy each webhook URL

### 1.3 Test Slack Webhook

```bash
# Test webhook
curl -X POST -H 'Content-type: application/json' \\
  --data '{"text":"🔔 Test alert from Real Estate Platform"}' \\
  YOUR_WEBHOOK_URL
```

You should see the message in your Slack channel.

---

## Step 2: SendGrid Email Integration

### 2.1 Create SendGrid API Key

1. Go to https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: "Real Estate Platform Alerts"
4. Permissions: "Mail Send" (Full Access)
5. Click "Create & View"
6. Copy the API key (you won't see it again!)

### 2.2 Verify Sender Email

1. Go to https://app.sendgrid.com/settings/sender_auth
2. Click "Verify a Single Sender"
3. Enter: alerts@realestate.com (or your domain)
4. Complete verification

### 2.3 Test Email

```bash
# Test SendGrid API
curl --request POST \\
  --url https://api.sendgrid.com/v3/mail/send \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
    "personalizations": [{
      "to": [{"email": "your-email@example.com"}]
    }],
    "from": {"email": "alerts@realestate.com"},
    "subject": "Test Alert",
    "content": [{
      "type": "text/plain",
      "value": "This is a test alert from Real Estate Platform"
    }]
  }'
```

---

## Step 3: PagerDuty Integration

### 3.1 Create Service

1. Go to https://your-account.pagerduty.com/services
2. Click "New Service"
3. Name: "Real Estate Platform - Production"
4. Escalation Policy: Select or create
5. Alert Grouping: "Intelligent"
6. Click "Next"

### 3.2 Add Integration

1. Integration Type: "Events API V2"
2. Integration Name: "Alertmanager"
3. Click "Add Integration"
4. Copy the "Integration Key"

### 3.3 Test PagerDuty

```bash
# Test PagerDuty Events API
curl -X POST https://events.pagerduty.com/v2/enqueue \\
  -H 'Content-Type: application/json' \\
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test Alert from Real Estate Platform",
      "severity": "critical",
      "source": "alertmanager",
      "custom_details": {
        "description": "This is a test alert"
      }
    }
  }'
```

You should receive a PagerDuty incident.

---

## Step 4: Configure Alertmanager Secrets

### 4.1 Create Secrets File

```bash
cd /home/ubuntu/realestate-platform/monitoring/alertmanager

# Copy template
cp secrets.yaml.template secrets.yaml

# Edit with your credentials
vim secrets.yaml
```

### 4.2 Fill in Credentials

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-secrets
  namespace: monitoring
type: Opaque
stringData:
  slack-webhook-url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  sendgrid-api-key: "SG.your-sendgrid-api-key-here"
  pagerduty-service-key: "your-pagerduty-integration-key-here"
```

### 4.3 Apply Secrets

```bash
kubectl apply -f secrets.yaml
```

### 4.4 Verify Secrets

```bash
kubectl get secret alertmanager-secrets -n monitoring
kubectl describe secret alertmanager-secrets -n monitoring
```

---

## Step 5: Deploy Alertmanager

### 5.1 Deploy

```bash
cd /home/ubuntu/realestate-platform/monitoring/alertmanager
kubectl apply -f k8s-deployment.yaml
```

### 5.2 Verify Deployment

```bash
# Check pods
kubectl get pods -n monitoring -l app=alertmanager

# Check logs
kubectl logs -f deployment/alertmanager -n monitoring

# Port forward to access UI
kubectl port-forward svc/alertmanager 9093:9093 -n monitoring
```

Visit http://localhost:9093 to see Alertmanager UI.

---

## Step 6: Test Alert Delivery

### 6.1 Send Test Alert to Alertmanager

```bash
# Send warning alert (goes to Slack + Email)
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestWarningAlert",
      "severity": "warning",
      "service": "test-service",
      "environment": "production"
    },
    "annotations": {
      "summary": "This is a test warning alert",
      "description": "Testing Slack and Email integration"
    }
  }
]'
```

**Expected**: Message in #alerts-warnings Slack channel + Email

### 6.2 Send Critical Alert

```bash
# Send critical alert (goes to Slack + Email + PagerDuty)
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestCriticalAlert",
      "severity": "critical",
      "service": "test-service",
      "environment": "production"
    },
    "annotations": {
      "summary": "This is a test critical alert",
      "description": "Testing all notification channels"
    }
  }
]'
```

**Expected**: 
- Message in #alerts-critical Slack channel
- Email notification
- PagerDuty incident created

### 6.3 Send Database Alert

```bash
# Send database-specific alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestDatabaseAlert",
      "severity": "warning",
      "category": "database",
      "database": "postgresql"
    },
    "annotations": {
      "summary": "Test database alert",
      "description": "Testing database team routing"
    }
  }
]'
```

**Expected**: Message in #database-alerts Slack channel

---

## Step 7: Verify Alert Routing

### 7.1 Check Alertmanager Status

Visit http://localhost:9093/#/status

Verify:
- Config is loaded correctly
- All receivers are configured
- No configuration errors

### 7.2 Check Alert Groups

Visit http://localhost:9093/#/alerts

You should see your test alerts grouped by:
- Alert name
- Cluster
- Service

### 7.3 Check Silences

Visit http://localhost:9093/#/silences

Practice creating a silence:
1. Click "New Silence"
2. Add matcher: `alertname=TestWarningAlert`
3. Duration: 1 hour
4. Comment: "Testing silence feature"
5. Create

Send the test alert again - it should be silenced.

---

## Step 8: Configure On-Call Schedule

### 8.1 PagerDuty Schedule

1. Go to https://your-account.pagerduty.com/schedules
2. Click "New Schedule"
3. Name: "Real Estate Platform - On-Call"
4. Time Zone: Select yours
5. Add team members and rotation
6. Save

### 8.2 Escalation Policy

1. Go to https://your-account.pagerduty.com/escalation_policies
2. Click "New Escalation Policy"
3. Name: "Real Estate Platform - Production"
4. Add escalation rules:
   - Level 1: On-call engineer (immediate)
   - Level 2: Engineering lead (after 15 min)
   - Level 3: CTO (after 30 min)
5. Save

### 8.3 Update Service

1. Go to your service settings
2. Update escalation policy to the one you just created
3. Save

---

## Step 9: Alert Customization

### 9.1 Customize Slack Messages

Edit `monitoring/alertmanager/templates/slack.tmpl`:

```go
{{ define "slack.critical.text" }}
🚨 *CRITICAL ALERT*

*Alert:* {{ .GroupLabels.alertname }}
*Service:* {{ .Labels.service }}
*Environment:* {{ .Labels.environment }}

{{ range .Alerts }}
*Summary:* {{ .Annotations.summary }}
*Description:* {{ .Annotations.description }}
*Started:* {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
{{ end }}

*Runbook:* https://runbooks.realestate.com/{{ .GroupLabels.alertname }}
*Grafana:* https://grafana.realestate.com
{{ end }}
```

### 9.2 Customize Email Templates

Edit `monitoring/alertmanager/templates/email.tmpl` to match your branding.

### 9.3 Reload Configuration

```bash
# Update ConfigMap
kubectl create configmap alertmanager-templates \\
  --from-file=monitoring/alertmanager/templates/ \\
  --dry-run=client -o yaml | kubectl apply -f -

# Reload Alertmanager
kubectl exec deployment/alertmanager -n monitoring -- \\
  kill -HUP 1
```

---

## Step 10: Production Checklist

Before going live:

- [ ] Slack webhooks configured for all 5 channels
- [ ] SendGrid API key created and verified
- [ ] PagerDuty service and integration created
- [ ] Secrets applied to Kubernetes
- [ ] Alertmanager deployed and running
- [ ] Test alerts sent to all channels
- [ ] Alert routing verified
- [ ] On-call schedule configured
- [ ] Escalation policy defined
- [ ] Team members added to PagerDuty
- [ ] Alert templates customized
- [ ] Silence feature tested
- [ ] Documentation updated with team contacts

---

## Troubleshooting

### Alerts Not Reaching Slack

1. Check webhook URL is correct
2. Verify Slack app has permissions
3. Check Alertmanager logs: `kubectl logs -f deployment/alertmanager -n monitoring`
4. Test webhook directly with curl
5. Verify routing rules in config

### Emails Not Sending

1. Check SendGrid API key is valid
2. Verify sender email is verified
3. Check spam folder
4. Review SendGrid activity log
5. Verify SMTP settings in Alertmanager config

### PagerDuty Incidents Not Creating

1. Check integration key is correct
2. Verify service is active
3. Test Events API directly with curl
4. Check PagerDuty service logs
5. Verify alert severity is "critical"

### Alerts Not Grouping

1. Review `group_by` configuration
2. Check alert labels match grouping rules
3. Adjust `group_wait` and `group_interval`
4. Review Alertmanager logs

---

## Monitoring Alertmanager

### Metrics

Alertmanager exposes metrics at http://localhost:9093/metrics

Key metrics:
- `alertmanager_alerts` - Current number of alerts
- `alertmanager_notifications_total` - Total notifications sent
- `alertmanager_notifications_failed_total` - Failed notifications

### Health Check

```bash
curl http://localhost:9093/-/healthy
```

Should return: `Healthy`

---

## Best Practices

1. **Test Regularly**: Send test alerts weekly
2. **Review Routing**: Ensure alerts go to right teams
3. **Update On-Call**: Keep schedules current
4. **Monitor Alertmanager**: Set up alerts for Alertmanager itself
5. **Document Runbooks**: Link to runbooks in alert annotations
6. **Use Silences**: Silence alerts during maintenance
7. **Review Alerts**: Weekly review of alert patterns
8. **Tune Thresholds**: Adjust based on actual behavior

---

## Summary

✅ **Alert Integration Complete**

You now have:
- Multi-channel notifications (Slack, Email, PagerDuty)
- Smart alert routing based on severity and category
- Alert grouping to prevent alert storms
- On-call escalation policies
- Custom alert templates
- Comprehensive testing procedures

**Status**: Alert system production-ready
