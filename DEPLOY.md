# Backend Deployment Instructions (Google Cloud Shell)

Since you cannot run `firebase init` or deployment commands from the web preview, follow these steps to deploy your backend using **Google Cloud Shell**.

## 1. Prepare Environment
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Select your Firebase Project.
3. Click the **Activate Cloud Shell** icon (top right terminal icon).
4. Run the following commands to set up your folder:

```bash
# Create a folder for your backend
mkdir quantai-backend
cd quantai-backend

# Create the functions directory
mkdir functions
```

## 2. Create Configuration Files
Click **"Open Editor"** in Cloud Shell and create the following files inside `quantai-backend` with the content provided in your project code:

1. `firebase.json` (In root `quantai-backend/`)
2. `firestore.rules` (In root `quantai-backend/`)
3. `functions/package.json` (Inside `functions/` folder)
4. `functions/index.js` (Inside `functions/` folder)

## 3. Connect & Deploy
Return to the **Terminal** tab in Cloud Shell and run:

```bash
# 1. Install Firebase Tools (if not installed)
npm install -g firebase-tools

# 2. Login (Select 'N' if asked to collect usage data)
# Note: Cloud Shell is usually auto-authenticated, but this ensures permissions.
firebase login --no-localhost

# 3. Connect to your specific project
# Replace <YOUR_PROJECT_ID> with your actual Project ID (found in Project Settings)
firebase use --add <YOUR_PROJECT_ID> --alias default

# 4. Install Backend Dependencies
cd functions
npm install
cd ..

# 5. Deploy to Firebase
firebase deploy --only functions,firestore
```

## 4. Finalize
1. After deployment succeeds, the terminal will output a **Function URL**.
   * Example: `https://us-central1-your-project-id.cloudfunctions.net/api`
2. Copy this URL.
3. Open `services/config.ts` in your web app code.
4. Update `API_BASE_URL` with your new URL.
