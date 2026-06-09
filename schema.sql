-- Campus Notification System — PostgreSQL Schema
-- AffordMed Campus Hiring Evaluation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE notification_type AS ENUM ('placement', 'result', 'event');

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(255),
    priority_score FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100),
    year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Notification junction (read/unread tracking)
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, notification_id)
);

-- =============================================
-- INDEXES
-- =============================================

-- filter by type
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- sort by priority (descending)
CREATE INDEX idx_notifications_priority ON notifications(priority_score DESC);

-- combined filter + sort
CREATE INDEX idx_notifications_type_priority
    ON notifications(notification_type, priority_score DESC, created_at DESC);

-- newest-first listing
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- fast unread count per user
CREATE INDEX idx_user_notif_unread
    ON user_notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- search inside metadata
CREATE INDEX idx_notifications_metadata ON notifications USING GIN(metadata);
