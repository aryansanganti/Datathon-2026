# Jira Data Fetch & MongoDB Integration

## Overview

This script (`fetch_jira_to_mongodb.js`) fetches ALL users and their tickets from your actual Jira instance and stores them in MongoDB collection `jira_all_data_Datathon`.

**NO MOCKS** - Uses actual Jira API with proper authentication and pagination.

## Prerequisites

1. **Jira Account** with API access
2. **MongoDB** running locally or remotely
3. **Node.js** installed
4. **Environment variables** configured

## Setup Instructions

### Step 1: Create `.env` File

Copy the example file and fill in your actual credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/mern-app

# Jira Credentials
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# Server
PORT=8000
NODE_ENV=development
```

### Step 2: Get Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Datathon MongoDB Sync")
4. Copy the token and paste it in your `.env` file as `JIRA_API_TOKEN`

### Step 3: Verify MongoDB is Running

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"
```

If not running, start MongoDB:
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --dbpath /path/to/your/data
```

## Running the Script

```bash
cd /Users/aryansanganti/Desktop/Datathon-2026/server
node fetch_jira_to_mongodb.js
```

## What the Script Does

### Phase 1: Environment Verification ✅
- Checks if `.env` file exists
- Validates all required environment variables
- Tests Jira authentication
- Tests MongoDB connection

### Phase 2: Data Fetching 📥
- Fetches all Jira projects
- Fetches all users from Jira
- Fetches all issues from all projects (with pagination)
- Handles large datasets automatically

### Phase 3: Data Storage 💾
- Creates MongoDB collection `jira_all_data_Datathon`
- Stores one document per user with schema:
  ```javascript
  {
    user_id: "712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04",
    name: "Aryan Sanganti",
    email: "aryan@example.com",
    timestamp: ISODate("2026-02-08T05:24:29.000Z"),
    tickets: [
      {
        ticket_id: "10001",
        key: "SCRUM-123",
        summary: "Implement user authentication",
        status: "In Progress",
        priority: "High",
        created: ISODate("2026-02-01T10:00:00.000Z"),
        updated: ISODate("2026-02-07T15:30:00.000Z")
      },
      // ... more tickets
    ]
  }
  ```

### Phase 4: Verification ✔️
- Counts total users stored
- Shows sample document
- Displays statistics (users with/without tickets, total tickets)

## Expected Output

```
═══════════════════════════════════════════════════════════
   JIRA TWO-WAY CONNECTION - FETCH & PUSH TO MONGODB
═══════════════════════════════════════════════════════════

[10:54:29] Using ACTUAL Jira API (NO MOCKS)
[10:54:29] Target Collection: jira_all_data_Datathon

═══════════════════════════════════════════════════════════
   PHASE 1: ENVIRONMENT VERIFICATION
═══════════════════════════════════════════════════════════

[10:54:29] ✅ .env file found
[10:54:29]   JIRA_EMAIL: your-email@example.com
[10:54:29]   JIRA_API_TOKEN: your-token-h...
[10:54:29]   JIRA_DOMAIN (derived): your-domain.atlassian.net
[10:54:29]   MONGODB_URI: mongodb://lo...

[10:54:29] ✅ All environment variables are set

[10:54:30] Testing Jira authentication...
[10:54:31] ✅ Authenticated as: Your Name
[10:54:31]    Email: your-email@example.com
[10:54:31]    Account ID: 712020:xxxxx

[10:54:31] Testing MongoDB connection...
[10:54:32] ✅ MongoDB connected successfully

═══════════════════════════════════════════════════════════
   PHASE 2: FETCHING DATA FROM JIRA
═══════════════════════════════════════════════════════════

[10:54:32] Fetching all Jira projects...
[10:54:33] ✅ Found 2 projects:
[10:54:33]    - [SCRUM] Scrum Project
[10:54:33]    - [KAN] Kanban Project

[10:54:33] Fetching all Jira users...
[10:54:34] ✅ Found 4 users

[10:54:34] Fetching issues from all projects...
[10:54:34]   Fetching issues for project SCRUM...
[10:54:35]     Page 1: Fetched 100 issues (Total: 100)
[10:54:36]     Page 2: Fetched 50 issues (Total: 150)
[10:54:36]   ✅ Total issues fetched for SCRUM: 150

[10:54:36] ✅ Total issues fetched across all projects: 200

═══════════════════════════════════════════════════════════
   PHASE 3: STORING DATA IN MONGODB
═══════════════════════════════════════════════════════════

[10:54:37] Processing users and their tickets...
[10:54:37]   ✅ Stored user: Aryan (25 tickets)
[10:54:37]   ✅ Stored user: Ritwik (30 tickets)
[10:54:37]   ✅ Stored user: Mohak (20 tickets)
[10:54:37]   ✅ Stored user: Manu (15 tickets)

[10:54:37] ✅ Successfully stored 4 users

═══════════════════════════════════════════════════════════
   PHASE 4: VERIFICATION
═══════════════════════════════════════════════════════════

[10:54:38] ✅ Total users in MongoDB: 4

[10:54:38] 📄 Sample document:
[10:54:38]    User: Aryan
[10:54:38]    Email: aryan@example.com
[10:54:38]    Tickets: 25
[10:54:38]    Sample ticket: SCRUM-123 - Implement user authentication...

[10:54:38] 📊 Statistics:
[10:54:38]    Users with tickets: 4
[10:54:38]    Users without tickets: 0
[10:54:38]    Total tickets: 90

═══════════════════════════════════════════════════════════
               EXECUTION SUMMARY
═══════════════════════════════════════════════════════════

[10:54:38] ✅ Script completed successfully in 9.23 seconds
[10:54:38]    Users processed: 4
[10:54:38]    Issues processed: 200
[10:54:38]    Collection: jira_all_data_Datathon
```

## Verifying Data in MongoDB

After running the script, you can verify the data:

```bash
mongosh mongodb://localhost:27017/mern-app
```

Then run these queries:

```javascript
// Count total users
db.jira_all_data_Datathon.countDocuments()

// View one sample document
db.jira_all_data_Datathon.findOne()

// Find all users with their ticket counts
db.jira_all_data_Datathon.find({}, { name: 1, email: 1, "tickets": { $size: "$tickets" } })

// Find a specific user by email
db.jira_all_data_Datathon.findOne({ email: "your-email@example.com" })

// Get all tickets for a specific user
db.jira_all_data_Datathon.findOne(
  { email: "your-email@example.com" },
  { tickets: 1 }
)

// Count users with tickets
db.jira_all_data_Datathon.countDocuments({ "tickets.0": { $exists: true } })

// Get statistics
db.jira_all_data_Datathon.aggregate([
  {
    $project: {
      name: 1,
      email: 1,
      ticketCount: { $size: "$tickets" }
    }
  },
  { $sort: { ticketCount: -1 } }
])
```

## Troubleshooting

### Error: ".env file NOT found"
**Solution:** Create a `.env` file by copying `.env.example` and filling in your credentials.

### Error: "Jira authentication failed"
**Solution:** 
- Verify your `JIRA_EMAIL` is correct
- Verify your `JIRA_API_TOKEN` is valid (regenerate if needed)
- Check that `JIRA_BASE_URL` or `JIRA_DOMAIN` is correct

### Error: "MongoDB connection failed"
**Solution:**
- Ensure MongoDB is running: `brew services start mongodb-community`
- Verify `MONGODB_URI` in `.env` is correct
- Check MongoDB logs for errors

### No issues found
**Solution:**
- Verify you have access to the Jira projects
- Check if there are actually issues in your Jira instance
- Try running the test script: `node test_jira_comprehensive.js`

## Testing with Existing Test Suite

You can also run the comprehensive test suite:

```bash
node test_jira_comprehensive.js
```

This will test:
- Environment variables
- Jira authentication
- Project fetching
- User fetching
- Issue creation
- Two-way sync

## Data Schema Reference

### Collection: `jira_all_data_Datathon`

Each document represents one user with all their assigned tickets:

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | String | Jira account ID (unique) |
| `name` | String | User's display name |
| `email` | String | User's email address |
| `timestamp` | Date | Last sync timestamp |
| `tickets` | Array | Array of ticket objects |

### Ticket Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `ticket_id` | String | Jira issue ID |
| `key` | String | Issue key (e.g., SCRUM-123) |
| `summary` | String | Issue title/summary |
| `status` | String | Current status |
| `priority` | String | Priority level |
| `created` | Date | Creation timestamp |
| `updated` | Date | Last update timestamp |

## Notes

- The script uses **pagination** to handle large datasets
- All timestamps are stored as proper Date objects
- Users without assigned tickets will have an empty `tickets` array
- The script uses **upsert** operations, so running it multiple times will update existing data
- Color-coded console output for easy debugging
