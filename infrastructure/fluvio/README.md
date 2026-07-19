# Fluvio Streaming Platform

## Installation

```bash
# Install Fluvio CLI
curl -fsS https://hub.infinyon.cloud/install/install.sh | bash

# Start Fluvio cluster
fluvio cluster start

# Create topics
fluvio topic create property-events
fluvio topic create user-events
fluvio topic create transaction-events
fluvio topic create notification-events
```

## Topics

- `property-events`: Property listing changes, views, updates
- `user-events`: User activity, searches, favorites
- `transaction-events`: Payment and transaction events
- `notification-events`: Notification triggers and delivery status

## Producers

Services publish events to Fluvio topics using the Fluvio client library.

## Consumers

Analytics Service, Notification Service, and Search Service consume events.
