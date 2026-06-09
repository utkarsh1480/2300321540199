# Campus Notification System - Design Document

This document answers the stages 1 to 6 of the evaluation.

---

## Stage 1: API Design & Real-Time Setup

### Endpoints
1. `GET /api/notifications`
   - Returns paginated notifications.
   - Query: `?page=1&limit=10&type=placement`
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "notifications": [{"id": "1", "type": "placement", "message": "Google drive", "timestamp": "2026-04-22 17:51:30"}],
         "pagination": { "page": 1, "limit": 10, "total": 15, "totalPages": 2 }
       }
     }
     ```

2. `GET /api/notifications/priority`
   - Returns top N priority notifications.
   - Query: `?top=10`
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "notifications": [{"id": "1", "type": "placement", "message": "Google drive", "timestamp": "2026-04-22 17:51:30", "score": 0.88}],
         "total_processed": 20
       }
     }
     ```

3. `GET /api/notifications/stats`
   - Returns counts for dashboard unread badge.
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "total": 20,
         "by_type": { "placement": 7, "result": 5, "event": 8 }
       }
     }
     ```

### Real-Time Delivery Option
I chose **Server-Sent Events (SSE)**.
- **Why:** The campus notification system only needs one-way traffic (from server to student). SSE runs over standard HTTP, supports auto-reconnection out of the box, and is much easier to set up than WebSockets.

---

## Stage 2: Database Schema & Scaling

### Database Choice: PostgreSQL
We need relations between students and notifications, and ACID transactions to ensure a notification isn't marked read twice or lost. PostgreSQL handles relation joins and indexes very well.

### Tables
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL, -- 'placement', 'result', 'event'
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE user_notifications (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, notification_id)
);
```

### Issues at Scale (50,000 students, millions of notifications)
1. **Slow reads:** Scanning millions of rows to find unread items will take seconds.
2. **Table locks:** Thousands of students marking items read at the same time will lock the tables.
3. **Connections:** PostgreSQL will run out of connection limits quickly.

**Fixes:** 
- Use composite indexes (on `user_id` and `is_read`).
- Add a connection pooler like PgBouncer.
- Partition notifications by month.

---

## Stage 3: Query Analysis & Optimization

### Given Query
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;
```

### Problems & Improvements
- **Why it is slow:** There is no index on `studentID` and `isRead`. The DB does a full table scan. Also, sorting by `createdAt` forces it to sort in memory.
- **Changes:** Only select columns we need (no `*`), order by `createdAt DESC` (students want new notifications first), and add a `LIMIT` (like 10 or 20) for pages.

```sql
SELECT id, notification_type, message, timestamp 
FROM user_notifications 
WHERE student_id = 1042 AND is_read = false 
ORDER BY created_at DESC 
LIMIT 10;
```

- **Should we index all columns?** No. Indexes make INSERTs and UPDATEs slow because the database has to update the indexes every time. They also use a lot of disk space.
- **Recommended Index:**
  ```sql
  CREATE INDEX idx_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
  ```

### Query: Students with placement notification in last 7 days
```sql
SELECT DISTINCT u.id, u.name, u.email 
FROM users u
JOIN user_notifications un ON un.user_id = u.id
JOIN notifications n ON n.id = un.notification_id
WHERE n.notification_type = 'placement' 
  AND n.timestamp >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Performance Tuning

When fetching notifications on every page load, the DB will crash.

### Solutions & Tradeoffs

1. **Redis Caching**
   - *How:* Cache the notifications list in memory.
   - *Pros:* Very fast reads, saves DB load.
   - *Cons:* Data might be stale for a minute, adds infrastructure cost.

2. **Read Replicas**
   - *How:* Write to master DB, read from replica DBs.
   - *Pros:* Distributes read queries across multiple servers.
   - *Cons:* Replication lag (marked read might take half a second to reflect on replica).

3. **Pagination & Lazy Loading**
   - *How:* Limit API requests to 10 items using `LIMIT` and `OFFSET`.
   - *Pros:* DB queries stay fast because we only fetch a few rows.
   - *Cons:* Harder to display a total count badge.

**Best Option:** Use pagination + a partial index on unread notifications.

---

## Stage 5: Notify All (50,000 Students)

### Problems with the original loops:
1. **Takes too long:** Doing 50,000 external API calls and DB queries one-by-one sequentially will take hours.
2. **Crash risk:** If connection drops at student #100, the script stops and 49,900 students never get the notification.
3. **Coupling:** If the email server is down, the DB write also fails.

### DB Write and Email Coupling
No, they should not be in the same transaction. Email APIs are slow and can fail. If they are in the same transaction, a slow email will hold the database connection open, crashing the site.

### Better Design (Queue-based)
```javascript
// Step 1: Bulk insert the notifications in one query (takes 1-2 seconds)
await db.query("INSERT INTO user_notifications (user_id, notification_id) SELECT id, $1 FROM users", [notificationId]);

// Step 2: Push batch jobs to a queue (like BullMQ or RabbitMQ)
for (const batch of chunk(studentIds, 1000)) {
  await queue.add("send-notifications", { batch, message });
}

// Step 3: Queue workers process the batches asynchronously in background
async function processBatch(job) {
  for (const studentId of job.batch) {
    try {
      await sendEmail(studentId, job.message);
    } catch (err) {
      // Retry failed ones later
      await retryQueue.add({ studentId, message, attempts: 1 });
    }
  }
}
```

---

## Stage 6: Priority Feed Logic

- **Weights:** Placement (1.0), Result (0.7), Event (0.4).
- **Recency Decay:** Score halves every 24 hours:
  `recency = exp(-0.693 * ageInHours / 24)`
- **Formula:**
  `score = (typeWeight * 0.6) + (recency * 0.3) + (engagementBonus * 0.1)`
- **Data Structure:** Built a **Min Heap** of size 10 to keep track of top-10 items dynamically. Running time is `O(N log K)`, which is much faster than sorting all notifications.
