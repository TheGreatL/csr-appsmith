-- =============================================================================
-- SERVICE REQUEST MANAGEMENT SYSTEM
-- Target: Aiven MySQL 8.x / MariaDB
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores clients, CSRs/admins, and technicians.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_role VARCHAR(30) NOT NULL DEFAULT 'client',
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (user_role IN ('client', 'admin', 'technician'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. SKILLS TABLE
-- Categorized skills required for service requests and possessed by technicians.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    skill_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TECH_SKILLS TABLE (Junction: Technicians <-> Skills)
-- Maps technicians to their certified skillsets.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tech_skills (
    tech_skill_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    certified_date DATE DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE,
    CONSTRAINT uq_tech_skill UNIQUE (user_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. SERVICE_REQUEST TABLE
-- Service tickets created by clients.
-- Includes skill_id so CSR can match and assign the applicable technician.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_request (
    service_request_id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    skill_id INT DEFAULT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    location VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE SET NULL,
    CONSTRAINT chk_request_type CHECK (type IN ('repair', 'diagnose')),
    CONSTRAINT chk_request_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT chk_request_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_service_request_client ON service_request(client_id);
CREATE INDEX idx_service_request_skill ON service_request(skill_id);
CREATE INDEX idx_service_request_status ON service_request(status);
CREATE INDEX idx_service_request_type ON service_request(type);

-- -----------------------------------------------------------------------------
-- 5. SERVICE_REQUEST_TECHNICIANS TABLE (Junction: Requests <-> Technicians)
-- Maps the assigned applicable technician to the service request.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_request_technicians (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    service_request_id INT NOT NULL,
    tech_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (service_request_id) REFERENCES service_request(service_request_id) ON DELETE CASCADE,
    FOREIGN KEY (tech_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_request_technician UNIQUE (service_request_id, tech_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_assignment_tech ON service_request_technicians(tech_id);
CREATE INDEX idx_assignment_request ON service_request_technicians(service_request_id);

SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- SEED DATA
-- =============================================================================

DELETE FROM service_request_technicians;
DELETE FROM service_request;
DELETE FROM tech_skills;
DELETE FROM skills;
DELETE FROM users;

-- 1. Insert Users
INSERT INTO users (user_id, name, email, password, user_role, phone) VALUES
(1, 'Admin / CSR Specialist', 'admin@service.com', 'admin123', 'admin', '+1-555-0100'),
(2, 'Alex Turner', 'alex.tech@service.com', 'tech123', 'technician', '+1-555-0101'),
(3, 'Sarah Connor', 'sarah.diag@service.com', 'tech123', 'technician', '+1-555-0102'),
(4, 'Mike Ross', 'mike.ross@service.com', 'tech123', 'technician', '+1-555-0103'),
(5, 'John Doe', 'john.doe@company.com', 'client123', 'client', '+1-555-0104'),
(6, 'Alice Smith', 'alice.smith@startup.io', 'client123', 'client', '+1-555-0105');

-- 2. Insert Skills
INSERT INTO skills (skill_id, name, description) VALUES
(1, 'Hardware Repair', 'Component-level motherboard, screen, and peripheral hardware repair'),
(2, 'System Diagnostics', 'OS level, memory failure, crash dump, and system error code diagnostics'),
(3, 'Electrical Maintenance', 'Power supply, surge damage, and voltage line repair'),
(4, 'Network Diagnostics', 'LAN/WAN, firewall, packet loss, and cable drop troubleshooting');

-- 3. Assign Certified Skills to Technicians
-- Alex Turner: Hardware Repair (1), Electrical Maintenance (3)
INSERT INTO tech_skills (user_id, skill_id, certified_date) VALUES
(2, 1, '2023-01-15'),
(2, 3, '2023-04-10');

-- Sarah Connor: System Diagnostics (2), Network Diagnostics (4)
INSERT INTO tech_skills (user_id, skill_id, certified_date) VALUES
(3, 2, '2022-11-01'),
(3, 4, '2023-06-20');

-- Mike Ross: Hardware Repair (1), System Diagnostics (2)
INSERT INTO tech_skills (user_id, skill_id, certified_date) VALUES
(4, 1, '2023-08-12'),
(4, 2, '2024-01-05');

-- 4. Insert Sample Service Requests (Linking Client and Required Skill)
INSERT INTO service_request (service_request_id, client_id, skill_id, subject, description, type, status, priority, location) VALUES
(1, 5, 2, 'Main Server Rack Unresponsive', 'Server rack B4 fails to boot after power outage. Needs diagnostics.', 'diagnose', 'pending', 'high', 'Building 2, Server Room B'),
(2, 5, 1, 'Broken Touchscreen Terminal', 'Screen cracked and touch sensor not responding on POS #3.', 'repair', 'assigned', 'medium', 'Retail Store Front'),
(3, 6, 4, 'Intermittent Network Drops', 'Workstations losing connection every 30 minutes during peak load.', 'diagnose', 'in_progress', 'urgent', 'East Wing Suite 400'),
(4, 6, 3, 'Faulty PSU Replacement', 'Power supply unit smelling burnt and failing to power workstation.', 'repair', 'completed', 'low', 'Office 12');

-- 5. Insert Technician Assignments
INSERT INTO service_request_technicians (service_request_id, tech_id, notes) VALUES
(2, 2, 'Assigned Alex Turner for POS screen replacement (matches Hardware Repair).'),
(3, 3, 'Assigned Sarah Connor for network packet capture triage (matches Network Diagnostics).'),
(4, 2, 'Assigned Alex Turner for electrical PSU replacement (matches Electrical Maintenance).');
