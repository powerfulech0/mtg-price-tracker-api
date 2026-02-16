-- Tasks API Database Initialization Script
-- PostgreSQL Schema, Indexes, Triggers, and Sample Data

-- Drop existing table if exists (for clean reinstall)
DROP TABLE IF EXISTS tasks CASCADE;

-- Create tasks table with constraints
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Database-level validation constraints (defense-in-depth)
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT description_length CHECK (char_length(description) <= 5000)
);

-- Create indexes for performance optimization
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Create composite index for common query patterns
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row modification
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO tasks (title, description, status, priority, due_date) VALUES
    ('Setup development environment', 'Install Node.js, PostgreSQL, and Docker', 'completed', 'high', '2026-02-10 10:00:00'),
    ('Implement authentication', 'Add JWT-based authentication to the API', 'in_progress', 'high', '2026-02-20 15:00:00'),
    ('Write API documentation', 'Create comprehensive API documentation using OpenAPI/Swagger', 'pending', 'medium', '2026-02-25 12:00:00'),
    ('Setup CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', 'pending', 'medium', '2026-03-01 09:00:00'),
    ('Code review meeting', 'Review pull requests with the team', 'pending', 'low', '2026-02-18 14:00:00'),
    ('Fix bug in user registration', 'Email validation not working correctly', 'in_progress', 'high', '2026-02-17 16:00:00'),
    ('Update dependencies', 'Update all npm packages to latest versions', 'pending', 'low', NULL),
    ('Database backup strategy', 'Implement automated database backup solution', 'pending', 'high', '2026-02-28 10:00:00'),
    ('Performance optimization', 'Analyze and optimize slow database queries', 'pending', 'medium', NULL),
    ('Security audit', 'Conduct security audit of the application', 'pending', 'high', '2026-03-05 11:00:00');

-- Verify data insertion
SELECT
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
FROM tasks;

-- Display all tasks
SELECT id, title, status, priority, due_date FROM tasks ORDER BY created_at DESC;
