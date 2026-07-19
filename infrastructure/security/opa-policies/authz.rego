# Real Estate Platform Authorization Policies

package realestate.authz

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Allow admin users to perform any action
allow if {
    input.user.role == "admin"
}

# Property Management Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/properties")
    # Anyone can view properties
}

allow if {
    input.method in ["POST", "PUT", "DELETE"]
    startswith(input.path, "/api/v1/properties")
    input.user.role in ["admin", "agent"]
    # Only admins and agents can modify properties
}

# User Management Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/users")
    input.user.id == input.resource.user_id
    # Users can view their own profile
}

allow if {
    input.method in ["PUT", "PATCH"]
    startswith(input.path, "/api/v1/users")
    input.user.id == input.resource.user_id
    # Users can update their own profile
}

allow if {
    input.method in ["GET", "POST", "PUT", "DELETE"]
    startswith(input.path, "/api/v1/users")
    input.user.role == "admin"
    # Admins can manage all users
}

# Transaction Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/transactions")
    input.user.id in input.resource.participant_ids
    # Users can view transactions they're part of
}

allow if {
    input.method == "POST"
    startswith(input.path, "/api/v1/transactions")
    input.user.authenticated == true
    # Authenticated users can create transactions
}

allow if {
    input.method in ["PUT", "PATCH"]
    startswith(input.path, "/api/v1/transactions")
    input.user.role in ["admin", "agent"]
    # Only admins and agents can update transactions
}

# Valuation Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/valuations")
    input.user.authenticated == true
    # Authenticated users can view valuations
}

allow if {
    input.method == "POST"
    startswith(input.path, "/api/v1/valuations")
    input.user.role in ["admin", "agent", "user"]
    # Authenticated users can request valuations
}

# Geospatial Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/geospatial")
    # Anyone can use geospatial queries
}

# Document Policies
allow if {
    input.method == "GET"
    startswith(input.path, "/api/v1/documents")
    input.user.id in input.resource.authorized_users
    # Users can only view documents they're authorized for
}

allow if {
    input.method == "POST"
    startswith(input.path, "/api/v1/documents")
    input.user.role in ["admin", "agent"]
    # Only admins and agents can upload documents
}

# Rate Limiting Policy
rate_limit_exceeded if {
    input.user.request_count > 1000
    input.time_window == "1h"
}

# Audit logging
audit_log := {
    "timestamp": time.now_ns(),
    "user": input.user.id,
    "action": input.method,
    "resource": input.path,
    "allowed": allow,
    "ip_address": input.ip_address,
    "user_agent": input.user_agent
}

# Data masking for sensitive fields
mask_sensitive_data(data) := masked if {
    sensitive_fields := ["ssn", "tax_id", "bank_account"]
    masked := {k: v |
        some k, v in data
        not k in sensitive_fields
    }
}

# PII detection
contains_pii(data) if {
    pii_patterns := [
        "\\d{3}-\\d{2}-\\d{4}",  # SSN
        "\\d{16}",               # Credit card
        "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"  # Email
    ]
    some pattern in pii_patterns
    regex.match(pattern, data)
}

# Compliance checks
soc2_compliant if {
    input.encryption_enabled == true
    input.audit_logging_enabled == true
    input.access_control_enabled == true
    input.data_retention_policy_defined == true
}

iso27001_compliant if {
    input.risk_assessment_completed == true
    input.security_policies_defined == true
    input.incident_response_plan_exists == true
    input.business_continuity_plan_exists == true
}
