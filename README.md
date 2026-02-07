# LocalNode Mesh

A multi-device Windows agent and web dashboard for IT management.

## Project Structure
- `agent/`: Python source code for the Windows client.
- `dashboard/`: Web interface to view devices and data.

## Firebase Setup (CRITICAL)

Before running the application, you must configure your Firebase project `windows-agent-10`.

### 1. Database Rules (Realtime Database)
Go to **Firebase Console -> Realtime Database -> Rules** and set the following rules to allow authenticated users (dashboard) to read/write, and the agent (via Service Account) to bypass these (Service Accounts have admin privileges by default, but these rules ensure the dashboard works).

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "devices": {
      ".indexOn": ["last_seen"]
    }
  }
}
```

### 2. Authentication
Go to **Firebase Console -> Authentication -> Sign-in method**.
- Enable **Email/Password** provider.
- Create a user account for yourself to log in to the Dashboard.

### 3. Service Account (For the Agent)
The Windows Agent needs a Service Account to write data securely.
1. Go to **Project Settings -> Service Accounts**.
2. Click **Generate new private key**.
3. Save the file as `serviceAccountKey.json`.
4. **Move this file** into the `agent/` directory: `LocalNodeMesh/agent/serviceAccountKey.json`.

## Build & Run

### 1. Windows Agent

**Requirements:**
- Python 3.9+
- Install dependencies:
  ```bash
  cd agent
  pip install -r requirements.txt
  ```

**Build Executable:**
To create a standalone `.exe` file:
```bash
python build_agent.py
```
The output file will be in `agent/dist/LocalNodeAgent.exe`.

**Run from Source:**
```bash
python main.py
# OR if python is not found:
py main.py
```

### 2. Web Dashboard

The dashboard is a static web app using Firebase SDK.

1. Navigate to the `dashboard/` folder.
2. You can open `index.html` directly in some browsers, but it's better to use a local server due to module CORS policies.
   ```bash
   # If you have Python
   python -m http.server 8000
   # OR if you have Node/NPM
   npx serve .
   ```
3. Open `http://localhost:8000`.
4. Login with the email/password you created in step 2.

## Troubleshooting

- **Agent not connecting?** Check `serviceAccountKey.json` is present and correct. Check internet connection.
- **Dashboard Validation Error?** Check your Firebase Security Rules.
- **WebRTC Fails?** P2P requires UDP ports to be open. If testing on different networks (e.g. Mobile Data vs WiFi), you might need a TURN server (not included in free plan default configs easily).
