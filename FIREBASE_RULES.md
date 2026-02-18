# 🔥 Firebase RTDB Rules — Setup Guide

This document contains the **Firebase Realtime Database rules** required for the OmniAdmin Agent + Dashboard to function correctly.

---

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **`windows-agent-10`**
3. Navigate to **Realtime Database → Rules**
4. **Replace** the existing rules with the JSON below
5. Click **Publish**

---

## Rules JSON

```json
{
  "rules": {
    "devices": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "files": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid || auth.token.email.matches(/admin@.*/)"
      }
    },
    "requests": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "responses": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "file_stream": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## Database Structure

| Path | Description | Read | Write |
|------|-------------|------|-------|
| `/devices/{deviceId}` | Device info, heartbeat, system stats | Authenticated | Authenticated |
| `/files/{deviceId}` | Indexed file list from agent | Authenticated | Owner or Admin |
| `/requests/{deviceId}` | Download commands from dashboard → agent | Authenticated | Authenticated |
| `/responses/{deviceId}` | File ready notifications from agent → dashboard | Authenticated | Authenticated |
| `/file_stream/{fileId}` | Chunked file data for downloads | Authenticated | Authenticated |

---

## Firebase Authentication Setup

The agent uses **Email/Password** authentication. Make sure it is enabled:

1. Go to **Firebase Console → Authentication → Sign-in Method**
2. Enable **Email/Password**
3. The agent auto-creates accounts with pattern: `agent-{deviceId}@omniadmin.local`

### Dashboard Admin Login

Create a user manually in **Firebase Console → Authentication → Users → Add User**:

| Field | Value |
|-------|-------|
| Email | `admin@omniadmin.local` (or your choice) |
| Password | Your chosen password |

Use these credentials to log into the dashboard.

---

## Important Notes

> ⚠️ **These rules allow any authenticated user to read/write.** For production, tighten the rules so only the device's own agent can write to its own path.

> ⚠️ **10MB limit**: Firebase RTDB has a 10MB per-node limit. File downloads use chunked streaming to stay under this limit.
