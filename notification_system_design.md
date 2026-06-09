# Campus Notification System — Design Document

**AffordMed Campus Hiring Evaluation**

---

## Stage 1: REST API Design & Real-Time Mechanism

### Core Actions the Notification Platform Should Support

1. **Fetch notifications** — paginated list of all notifications
2. **Filter notifications** — by type (Placement, Result, Event)
3. **Get priority feed** — top N most important notifications
4. **Mark as read/unread** — track read state per user
5. **Get unread count** — badge count for UI
6. **Real-time delivery** — push new notifications instantly

### REST API Endpoints

#### 1. GET /api/notifications
Fetch paginated notifications list.

**Request:**
```
GET /api/notifications?page=1&limit=10&type=placement
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "placement",
        "message": "Google on-campus hiring drive",
        "timestamp": "2026-04-22 17:51:30",
        "isRead": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

#### 2. GET /api/notifications/priority
Get top N notifications ranked by priority.

**Request:**
```
GET /api/notifications/priority?top=10
Headers:
  Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "placement",
        "message": "Amazon walk-in interview",
        "timestamp": "2026-04-22 17:51:30",
        "score": 0.9214
      }
    ],
    "total_processed": 20,
    "top_k": 10
  }
}
```

#### 3. PATCH /api/notifications/:id/read
Mark a notification as read.

**Request:**
```
PATCH /api/notifications/d146095a-0d86-4a34-9e69-3900a14576bc/read
Headers:
  Authorization: Bearer <token>
Body: { "isRead": true }
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "id": "d146095a...", "isRead": true, "readAt": "2026-06-09T10:30:00Z" }
}
```

#### 4. GET /api/notifications/stats
Get unread counts.

**Request:**
```
GET /api/notifications/stats
Headers:
  Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 20,
    "by_type": { "placement": 7, "result": 5, "event": 8 }
  }
}
```

#### 5. Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found",
    "statusCode": 404
  }
}
```

### Real-Time Notification Mechanism

**Approach: Server-Sent Events (SSE)**

SSE is chosen over WebSockets because:
- Notifications are **one-directional** (server → client)
- SSE is simpler to implement, uses standard HTTP
- Auto-reconnects on connection drop
- Works through firewalls and proxies

**Implementation:**

```
Client                          Server
  |                               |
  |--- GET /api/notifications/stream -->
  |                               |
  |<-- event: notification -------|  (new placement notification)
  |<-- event: notification -------|  (new result published)
  |<-- event: heartbeat ---------|  (keep-alive every 30s)
  |                               |
```

**Server endpoint:**
```
GET /api/notifications/stream
Headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
```

**Event format:**
```
event: notification
data: {"id":"uuid","type":"placement","message":"New hiring drive"}

event: heartbeat
data: {"timestamp":"2026-06-09T10:30:00Z"}
```

---

## Stage 2: Database Schema & Storage

### Choice of Database: PostgreSQL

**Why PostgreSQL:**
- ACID compliance for reliable read/unread tracking
- ENUM types for notification_type validation
- JSONB for flexible metadata storage
- GIN indexes for full-text search
- Mature, battle-tested at scale

### Schema

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type notification_type NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    UNIQUE (user_id, notification_id)
);
```

### Problems as Data Volume Increases

1. **Slow queries** — Sequential scans on millions of rows
2. **Table bloat** — Frequent UPDATE on is_read causes dead tuples
3. **Join overhead** — user_notifications × notifications join gets expensive
4. **Connection exhaustion** — 50K concurrent students

### Solutions

**Indexes** (see Stage 3 for detailed analysis):
```sql
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_user_notif_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
```

**Partitioning** — partition notifications table by month:
```sql
CREATE TABLE notifications (
    ...
) PARTITION BY RANGE (timestamp);

CREATE TABLE notifications_2026_06 PARTITION OF notifications
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

**Connection pooling** — use PgBouncer to handle 50K students with ~100 DB connections.

### SQL Queries Based on APIs

```sql
-- GET /api/notifications (paginated, filtered)
SELECT id, notification_type, message, timestamp
FROM notifications
WHERE notification_type = 'Placement'
ORDER BY timestamp DESC
LIMIT 10 OFFSET 0;

-- GET /api/notifications/:id/read (mark as read)
INSERT INTO user_notifications (user_id, notification_id, is_read, read_at)
VALUES ($1, $2, TRUE, NOW())
ON CONFLICT (user_id, notification_id)
DO UPDATE SET is_read = TRUE, read_at = NOW();

-- GET /api/notifications/stats (unread count)
SELECT COUNT(*) AS unread_count
FROM notifications n
LEFT JOIN user_notifications un ON un.notification_id = n.id AND un.user_id = $1
WHERE un.is_read IS NULL OR un.is_read = FALSE;
```

---

## Stage 3: Query Analysis & Optimization

### Given Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Is this query accurate?
The query is **functionally correct** but has problems:

1. `SELECT *` fetches all columns — wasteful if only some are needed
2. `ORDER BY createdAt ASC` shows oldest first — users usually want newest first
3. No `LIMIT` — if a student has 10,000 unread notifications, all are returned at once

### Why is it slow?
With 50,000 students and 5,000,000 notifications:
- **No composite index** on (studentID, isRead) → full table scan
- **Sort operation** on createdAt without index → filesort on disk
- **No LIMIT** → returns all matching rows

**Likely computation cost:** O(N) scan on 5M rows + O(M log M) sort where M is the matching rows. This could take 5-10+ seconds.

### What I would change
```sql
SELECT id, notification_type, message, timestamp
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20;
```

Changes:
- Select only needed columns (not `*`)
- `DESC` order (newest first — what users expect)
- `LIMIT 20` for pagination

### Should we add indexes on every column?
**No. This is bad advice.**

Adding indexes on every column:
- Slows down INSERT/UPDATE (each index must be maintained)
- Wastes disk space (each index stores a copy of the data)
- Confuses the query planner (too many choices)

**Better approach:** Add indexes only for columns that appear in WHERE, ORDER BY, and JOIN conditions in actual queries.

### Recommended indexes
```sql
-- Composite index for the unread query (covers WHERE + ORDER BY)
CREATE INDEX idx_notif_student_unread 
    ON notifications(studentID, isRead, createdAt DESC)
    WHERE isRead = FALSE;

-- This is a partial index — only indexes unread notifications
-- Much smaller than a full index, much faster
```

### Query: All students with placement notification in last 7 days
```sql
SELECT DISTINCT u.id, u.name, u.email
FROM users u
JOIN user_notifications un ON un.user_id = u.id
JOIN notifications n ON n.id = un.notification_id
WHERE n.notification_type = 'Placement'
  AND n.timestamp >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Performance Optimization

### Problem
Notifications are fetched on every page load for every student. The DB is overwhelmed.

### Solution 1: Caching with Redis

**How it works:** Cache the notification feed in Redis. Serve from cache instead of hitting the DB every time.

```
Student Request → Check Redis Cache → Cache Hit? → Return cached data
                                    → Cache Miss? → Query DB → Store in Redis → Return
```

**Implementation:**
```
Key:    notifications:feed:{type}:{page}
Value:  JSON array of notifications
TTL:    60 seconds
```

**Tradeoffs:**
- ✅ Reduces DB load by ~95% (most requests served from cache)
- ✅ Sub-millisecond response times
- ❌ Data can be up to 60 seconds stale
- ❌ Adds infrastructure complexity (Redis server)
- ❌ Cache invalidation can be tricky

### Solution 2: Database Read Replicas

**How it works:** Route all read queries to replica databases, keep writes on the primary.

```
Write (mark read) → Primary DB
Read (fetch feed) → Replica 1, Replica 2, Replica 3
```

**Tradeoffs:**
- ✅ Scales read throughput linearly
- ✅ No staleness issues for reads
- ❌ Replication lag (100-500ms) can cause "just marked as read" to still appear unread
- ❌ More expensive (multiple DB instances)

### Solution 3: Pagination + Lazy Loading

**How it works:** Never fetch all notifications. Load 20 at a time, fetch more on scroll.

```sql
SELECT * FROM notifications 
WHERE studentID = $1 
ORDER BY createdAt DESC 
LIMIT 20 OFFSET 0;   -- first page only
```

**Tradeoffs:**
- ✅ Constant query time regardless of total notifications
- ✅ No additional infrastructure
- ❌ Users can't see total count without a separate COUNT query
- ❌ Deep pagination (OFFSET 10000) is still slow

### Solution 4: Materialized Views

**How it works:** Pre-compute the notification feed and refresh periodically.

```sql
CREATE MATERIALIZED VIEW student_feed AS
SELECT n.*, un.is_read
FROM notifications n
LEFT JOIN user_notifications un ON un.notification_id = n.id
ORDER BY n.timestamp DESC;

REFRESH MATERIALIZED VIEW CONCURRENTLY student_feed;
```

**Tradeoffs:**
- ✅ Very fast reads (pre-computed)
- ❌ Stale data between refreshes
- ❌ Expensive refresh operation

### Recommended Combination
Use **Redis caching + Pagination + Proper indexes** — this covers 90% of the performance issue with minimal infrastructure change.

---

## Stage 5: Notify All — 50,000 Students Simultaneously

### Given Pseudocode
```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)    # calls Email API
        save_to_db(student_id, message)    # DB insert
        push_to_app(student_id, message)   # real-time push
```

### Problems with This Implementation

1. **Sequential processing** — 50K iterations one after another. If each takes 200ms, total = 50,000 × 0.2s = **~2.8 hours**.

2. **No error handling** — If `send_email` fails for student #200, the loop stops. Students 201–50,000 get nothing.

3. **Partial failure** — "Logs indicate that send_email failed for 200 students midway." The students who failed have their DB entry saved but no email. Inconsistent state.

4. **DB overwhelmed** — 50,000 individual INSERT statements. Each one opens a connection, runs a query, closes.

5. **No retry** — Failed emails are permanently lost.

### Should DB Save and Email Happen Together?

**No.** They should be decoupled because:
- Email delivery is **unreliable** (SMTP servers fail, rate limits, network issues)
- DB write is **reliable** (local, fast, ACID)
- If we couple them, a failed email prevents the DB write (or vice versa)
- Different failure modes require different retry strategies

### Redesigned Solution

```
function notify_all(student_ids: array, message: string):
    // Step 1: Batch insert into DB (fast, reliable)
    notification_id = bulk_save_to_db(student_ids, message)
    
    // Step 2: Push to message queue for async processing
    for batch in chunk(student_ids, 500):
        queue.publish("notifications", {
            batch: batch,
            message: message,
            notification_id: notification_id,
            retry_count: 0
        })

// Queue consumer (runs on separate workers)
function process_notification_batch(job):
    for student_id in job.batch:
        try:
            send_email(student_id, job.message)
            push_to_app(student_id, job.message)
        catch error:
            if job.retry_count < 3:
                queue.publish("notifications_retry", {
                    student_id: student_id,
                    message: job.message,
                    retry_count: job.retry_count + 1,
                    delay: exponential_backoff(job.retry_count)
                })
            else:
                save_to_dead_letter_queue(student_id, job.message, error)
                alert_ops_team(student_id, error)

function bulk_save_to_db(student_ids, message):
    // Single INSERT with 50K rows — takes ~2 seconds instead of 50K individual inserts
    INSERT INTO user_notifications (user_id, notification_id)
    SELECT unnest($1::uuid[]), $2;
```

### Key Improvements

| Problem | Before | After |
|---------|--------|-------|
| Speed | Sequential (2.8 hours) | Parallel workers (~30 seconds) |
| Email failure | Stops everything | Retries with backoff, dead letter queue |
| DB writes | 50K individual INSERTs | 1 bulk INSERT |
| Coupling | Email + DB + Push tightly coupled | DB first, then async queue |
| Monitoring | None | Failed jobs tracked in dead letter queue |

---

## Stage 6: Priority Inbox Implementation

### Approach

The Priority Inbox ranks notifications using a **composite scoring formula** and extracts the top N using a **Min Heap** data structure.

### Priority Formula
```
score = (typeWeight × 0.6) + (recency × 0.3) + (engagement × 0.1)
```

**Type Weights:** Placement (1.0) > Result (0.7) > Event (0.4)

**Recency:** Exponential decay with 24-hour half-life:
```javascript
recencyScore = Math.exp(-0.693 × ageInHours / 24)
```

### Why Min Heap for Top-K?

A Min Heap of size K efficiently maintains the top K items:
- The root always holds the **smallest** item in our top-K set
- When a new item arrives with score > root, we replace root and re-heapify
- After processing all N items, the heap contains exactly the top K

**Complexity:**
- Time: O(N log K) — much better than O(N log N) full sort
- Space: O(K) — only stores K items, not all N

### Code
- `backend/src/utils/MinHeap.js` — Min Heap implementation
- `backend/src/services/priorityEngine.js` — Scoring + top-K extraction
- `backend/src/services/fetchNotifications.js` — API fetcher with normalization

### Screenshots
See `screenshots/` folder for:
- `notifications-page.png` — All notifications with filters
- `priority-page.png` — Top 10 priority ranked feed
- `mobile-view.png` — Responsive mobile layout
