---
description: Deploy the Boiler API to AWS using Chalice
---

# Deploying the Boiler API

Follow these steps to deploy your Chalice API to AWS.

## Prerequisites

1.  **AWS Account**: You need an active AWS account.
2.  **AWS CLI**: Installed and configured with your credentials.
    ```powershell
    aws configure
    ```
    Enter your Access Key ID, Secret Access Key, Region (e.g., `us-east-1` or `eu-west-2`), and output format (`json`).

## Deployment Steps

1.  **Navigate to the Project Directory**:
    ```powershell
    cd "c:\Users\voxin\Documents\VS Workspaces\Antigravity Workspaces\Boiler scraper\boiler_api"
    ```

2.  **Activate Virtual Environment** (if not already active):
    ```powershell
    ..\.venv\Scripts\activate
    ```

3.  **Deploy**:
    Run the deploy command. This will create the Lambda function and API Gateway resources.
    ```powershell
    chalice deploy
    ```

4.  **Verify Deployment**:
    The `chalice deploy` command will output a `Rest API URL`. Use this URL to test your endpoints.
    
    Example:
    ```powershell
    curl https://your-api-id.execute-api.your-region.amazonaws.com/api/health
    ```

## Updating the API

You can update your running API at any time by redeploying. Chalice handles the updates for you.

### 1. Updating Code
If you modify `app.py` or any other Python files:
1.  Make your changes.
2.  Run `chalice deploy` again.
    ```powershell
    chalice deploy
    ```
    Chalice will detect the changes and update the Lambda function code.

### 2. Updating Data
If you update `enriched_boiler_data.json`:
1.  Ensure the updated file is in `boiler_api/chalicelib/`.
    - If you generated a new file in the parent directory, copy it over:
      ```powershell
      copy ..\enriched_boiler_data.json chalicelib\
      ```
2.  Run `chalice deploy`.
    ```powershell
    chalice deploy
    ```
    The new data file will be packaged with your Lambda function.

### 3. Updating Configuration
If you change `.chalice/config.json` (e.g., environment variables, memory size):
1.  Run `chalice deploy`.
    Chalice will update the function configuration.


## Clean Up

To remove the deployed resources:
```powershell
chalice delete
```
