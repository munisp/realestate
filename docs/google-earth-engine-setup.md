# Google Earth Engine Configuration Guide

**Author:** Manus AI  
**Last Updated:** November 21, 2025

## Overview

Google Earth Engine (GEE) is a cloud-based platform for planetary-scale geospatial analysis that combines a multi-petabyte catalog of satellite imagery and geospatial datasets with computational capabilities. This guide provides comprehensive instructions for configuring Google Earth Engine integration for the Real Estate Platform's monitoring infrastructure.

The integration enables access to environmental data, land use analysis, and geospatial intelligence that enhances property valuations and risk assessments. GEE provides access to over 40 years of historical imagery and scientific datasets, updated daily with new acquisitions.

## Prerequisites

Before beginning the configuration process, ensure you have the following:

* **Google Cloud Platform Account**: An active GCP account with billing enabled
* **Project Administrator Access**: Permissions to create service accounts and enable APIs
* **Credit Card or Billing Account**: Required for GEE API usage (free tier available)
* **Technical Environment**: Node.js 18+ and access to the platform's server configuration

## Service Account Creation

Service accounts provide a secure method for server-to-server authentication without requiring user interaction. The following steps create a dedicated service account for Earth Engine access.

### Step 1: Create a Google Cloud Project

Navigate to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project specifically for Earth Engine integration. Using a dedicated project simplifies billing tracking and access management.

1. Click the project dropdown in the top navigation bar
2. Select "New Project" from the modal dialog
3. Enter a descriptive project name (e.g., "realestate-earth-engine")
4. Select your billing account from the dropdown
5. Click "Create" and wait for project provisioning to complete

Record the **Project ID** (not the project name) as it will be required for subsequent configuration steps. The Project ID appears in the format `project-name-123456` and cannot be changed after creation.

### Step 2: Enable Required APIs

The Earth Engine API must be explicitly enabled for your project before service accounts can access it.

1. Navigate to **APIs & Services > Library** in the Cloud Console
2. Search for "Earth Engine API" in the search bar
3. Select the Earth Engine API from the results
4. Click the "Enable" button on the API details page
5. Wait for the API to be enabled (typically 1-2 minutes)

Additionally, enable the **Cloud Resource Manager API** to support programmatic project management and the **Service Usage API** for quota monitoring.

### Step 3: Create the Service Account

Service accounts act as non-human identities that applications use to make authorized API calls.

1. Navigate to **IAM & Admin > Service Accounts**
2. Click "Create Service Account" at the top of the page
3. Enter the following details:
   * **Service account name**: `earth-engine-monitor`
   * **Service account ID**: Auto-generated based on name
   * **Description**: "Service account for Earth Engine monitoring integration"
4. Click "Create and Continue"
5. Grant the **Earth Engine Resource Viewer** role
6. Click "Continue" then "Done"

The Earth Engine Resource Viewer role provides read-only access to Earth Engine assets, which is sufficient for monitoring and analysis workloads. For applications requiring write access to Earth Engine assets, use the **Earth Engine Resource Writer** role instead.

### Step 4: Generate Service Account Key

Private keys enable applications to authenticate as the service account. These keys must be protected with the same security measures as passwords.

1. Locate the newly created service account in the service accounts list
2. Click the three-dot menu icon in the Actions column
3. Select "Manage keys" from the dropdown menu
4. Click "Add Key" then "Create new key"
5. Select **JSON** as the key type
6. Click "Create" to download the key file

The downloaded JSON file contains sensitive credentials and should never be committed to version control or shared publicly. Store it securely and restrict file system permissions to the application user only.

### Step 5: Register for Earth Engine Access

Google Earth Engine requires explicit registration before service accounts can access the API, even after enabling it in the Cloud Console.

1. Visit the [Earth Engine sign-up page](https://signup.earthengine.google.com/)
2. Sign in with the Google account that owns the Cloud project
3. Select "Register a noncommercial or commercial Cloud project"
4. Enter your Project ID from Step 1
5. Provide project details and intended use case
6. Accept the Terms of Service
7. Submit the registration form

Registration approval is typically instant for Cloud projects with billing enabled. Academic and non-profit projects may require manual review (1-2 business days). Check your email for confirmation once approved.

## Environment Configuration

The platform uses environment variables to securely inject credentials at runtime without hardcoding sensitive values in source code.

### Required Environment Variables

Add the following variables to your deployment environment:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON key file | `/secrets/earth-engine-key.json` |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | `realestate-earth-engine` |
| `EARTH_ENGINE_ENABLED` | Feature flag to enable/disable integration | `true` |

### Local Development Setup

For local development environments, create a `.env.local` file in the project root:

```bash
# Google Earth Engine Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/earth-engine-key.json
GOOGLE_CLOUD_PROJECT=realestate-earth-engine
EARTH_ENGINE_ENABLED=true
```

Ensure the `.env.local` file is listed in `.gitignore` to prevent accidental commits. The platform's environment loader automatically reads this file during development.

### Production Deployment

Production environments should use secret management systems rather than file-based credentials. The recommended approach varies by deployment platform:

**Kubernetes**: Use Kubernetes Secrets to mount the service account key as a file volume:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: earth-engine-credentials
type: Opaque
stringData:
  key.json: |
    {
      "type": "service_account",
      "project_id": "realestate-earth-engine",
      ...
    }
```

**Docker**: Pass credentials as environment variables or mount as a volume:

```bash
docker run -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/key.json \
  -v /host/path/to/key.json:/secrets/key.json:ro \
  realestate-platform
```

**Cloud Run / App Engine**: Use the built-in service account attachment feature to avoid managing keys manually. The platform automatically provides credentials through the metadata server.

## Integration Verification

After completing configuration, verify the integration is functioning correctly by running the diagnostic script.

### Verification Script

Create a test script to validate Earth Engine connectivity:

```javascript
const ee = require('@google/earthengine');
const privateKey = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

ee.data.authenticateViaPrivateKey(privateKey, () => {
  ee.initialize(null, null, () => {
    console.log('Earth Engine initialized successfully');
    
    // Test a simple query
    const image = ee.Image('USGS/SRTMGL1_003');
    image.getInfo((info) => {
      console.log('Sample image metadata:', info);
      console.log('Verification complete');
    });
  }, (error) => {
    console.error('Initialization error:', error);
  });
}, (error) => {
  console.error('Authentication error:', error);
});
```

Run the verification script:

```bash
node verify-earth-engine.js
```

Successful output indicates the service account has been properly configured and registered. If errors occur, consult the troubleshooting section below.

## Usage Patterns

The Earth Engine integration supports several common use cases for real estate analysis.

### Land Cover Analysis

Determine land use classifications for properties and surrounding areas:

```javascript
const landcover = ee.ImageCollection('COPERNICUS/Landcover/100m/Proba-V-C3/Global')
  .filterDate('2023-01-01', '2023-12-31')
  .first();

const point = ee.Geometry.Point([-122.4194, 37.7749]); // San Francisco
const value = landcover.sample(point, 100);
```

### Environmental Risk Assessment

Assess flood risk using elevation and precipitation data:

```javascript
const elevation = ee.Image('USGS/SRTMGL1_003');
const precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate('2023-01-01', '2023-12-31')
  .sum();

const floodRisk = elevation.lt(10).and(precipitation.gt(1000));
```

### Historical Change Detection

Analyze property development over time using Landsat imagery:

```javascript
const before = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2010-01-01', '2010-12-31')
  .median();

const after = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2023-01-01', '2023-12-31')
  .median();

const change = after.subtract(before);
```

## Cost Estimation and Optimization

Google Earth Engine operates on a consumption-based pricing model. Understanding cost drivers enables effective budget management.

### Pricing Structure

Earth Engine charges are based on three primary metrics:

| Resource | Price | Unit |
|----------|-------|------|
| Compute | $0.20 | Core-hour |
| Storage | $0.024 | GB-month |
| Egress | $0.12 | GB (to internet) |

**Compute costs** accrue when processing Earth Engine operations. Simple queries (single image samples) consume minimal compute, while complex analyses (large-scale classifications, time series) can be expensive.

**Storage costs** apply to user-uploaded assets stored in Earth Engine. The platform's integration primarily uses public datasets, incurring no storage charges.

**Egress costs** apply when exporting data from Earth Engine to external systems. Keeping data within Google Cloud (e.g., exporting to Cloud Storage) avoids egress charges.

### Free Tier

Google Earth Engine provides a generous free tier for non-commercial use:

* **Compute**: 5,000 core-hours per month
* **Storage**: 250 GB of asset storage
* **Egress**: 10 GB per month to internet

Commercial projects exceed the free tier and should budget accordingly. The monitoring integration typically consumes 100-500 core-hours monthly depending on query frequency and complexity.

### Optimization Strategies

Implement the following strategies to minimize costs while maintaining functionality:

**Cache Frequently Accessed Data**: Store Earth Engine query results in the application database rather than re-computing on each request. Environmental data changes slowly, making caching effective for days or weeks.

**Batch Operations**: Group multiple property analyses into single Earth Engine requests rather than making individual API calls. Batch processing reduces overhead and improves throughput.

**Reduce Spatial Resolution**: Use lower resolution datasets when high precision is unnecessary. For example, 1km resolution is sufficient for regional climate analysis, while property-level assessments may require 10-30m resolution.

**Limit Temporal Range**: Constrain date filters to the minimum necessary period. Analyzing 1 year of data is substantially cheaper than processing 10 years when recent data suffices.

**Use Precomputed Products**: Leverage Earth Engine's precomputed image collections (e.g., annual composites) rather than processing raw imagery. Precomputed products are optimized and often free to access.

**Monitor Usage**: Enable Cloud Billing export to BigQuery to track Earth Engine costs by operation type. Set up budget alerts to notify when spending approaches thresholds.

## Troubleshooting

Common issues and their resolutions are documented below.

### Authentication Errors

**Symptom**: `Error: Authentication failed` or `Invalid credentials`

**Cause**: The service account key file is missing, corrupted, or the path is incorrect.

**Resolution**:
1. Verify `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON file
2. Check file permissions ensure the application can read the key file
3. Confirm the key file contains valid JSON (open in a text editor)
4. Regenerate the service account key if the file is corrupted

### Registration Errors

**Symptom**: `Error: Earth Engine account not registered`

**Cause**: The Cloud project has not completed Earth Engine registration.

**Resolution**:
1. Visit [https://code.earthengine.google.com/](https://code.earthengine.google.com/)
2. Sign in with the project owner account
3. Complete the registration wizard if prompted
4. Wait 5-10 minutes for registration to propagate
5. Retry the operation

### Quota Exceeded Errors

**Symptom**: `Error: Quota exceeded` or `429 Too Many Requests`

**Cause**: The application has exceeded Earth Engine API rate limits or compute quotas.

**Resolution**:
1. Implement exponential backoff retry logic for API calls
2. Reduce query frequency by implementing caching
3. Request quota increase through the Cloud Console if sustained higher usage is required
4. Review the optimization strategies section to reduce compute consumption

### Permission Denied Errors

**Symptom**: `Error: Permission denied` or `403 Forbidden`

**Cause**: The service account lacks necessary IAM roles.

**Resolution**:
1. Navigate to IAM & Admin > IAM in the Cloud Console
2. Locate the service account in the principals list
3. Click the edit icon (pencil) next to the service account
4. Add the **Earth Engine Resource Viewer** role
5. Save changes and wait 1-2 minutes for propagation

### Network Connectivity Issues

**Symptom**: `Error: Connection timeout` or `ECONNREFUSED`

**Cause**: Network restrictions prevent access to Earth Engine API endpoints.

**Resolution**:
1. Verify the server has internet connectivity
2. Check firewall rules allow outbound HTTPS (port 443) to `earthengine.googleapis.com`
3. If using a proxy, configure `HTTPS_PROXY` environment variable
4. Test connectivity with `curl https://earthengine.googleapis.com/`

## Security Best Practices

Protecting Earth Engine credentials is critical to preventing unauthorized access and cost overruns.

### Key Management

* **Never commit service account keys to version control**: Use `.gitignore` to exclude key files and environment variable files
* **Rotate keys regularly**: Generate new service account keys every 90 days and delete old keys
* **Use secret management systems**: Store keys in HashiCorp Vault, AWS Secrets Manager, or Google Secret Manager rather than file systems
* **Restrict key permissions**: Use the principle of least privilege—grant only the minimum necessary IAM roles
* **Monitor key usage**: Enable Cloud Audit Logs to track service account activity and detect anomalies

### Access Control

* **Limit service account scope**: Create separate service accounts for different environments (development, staging, production)
* **Implement IP allowlisting**: Restrict service account access to known IP ranges using VPC Service Controls
* **Enable MFA for administrators**: Require multi-factor authentication for accounts that can create or manage service accounts
* **Review IAM policies regularly**: Audit service account permissions quarterly and remove unused accounts

### Monitoring and Alerting

* **Set up budget alerts**: Configure Cloud Billing alerts to notify when Earth Engine costs exceed thresholds
* **Monitor API usage**: Track Earth Engine API calls and compute consumption in Cloud Monitoring
* **Alert on authentication failures**: Create alerts for repeated authentication errors, which may indicate credential compromise
* **Log all operations**: Enable comprehensive logging for Earth Engine operations to support security investigations

## Additional Resources

* [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
* [Earth Engine API Reference](https://developers.google.com/earth-engine/apidocs)
* [Earth Engine Code Editor](https://code.earthengine.google.com/)
* [Earth Engine Data Catalog](https://developers.google.com/earth-engine/datasets)
* [Google Cloud IAM Documentation](https://cloud.google.com/iam/docs)
* [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)

## Support

For issues specific to the Real Estate Platform integration, consult the internal monitoring documentation or contact the platform engineering team. For Earth Engine-specific questions, refer to the [Earth Engine Help Forum](https://groups.google.com/g/google-earth-engine-developers) or Google Cloud Support.
