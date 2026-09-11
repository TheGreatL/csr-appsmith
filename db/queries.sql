-- =============================================================================
-- APPSMITH SQL QUERIES FOR AIVEN MYSQL DATASOURCE
-- Service Request Lifecycle: Client Creation -> CSR Applicable Tech Assignment
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AUTHENTICATION & LOGIN (Page: login)
-- Query Name: Login_Query
-- -----------------------------------------------------------------------------
SELECT 
    user_id,
    name,
    email,
    user_role,
    phone
FROM users 
WHERE email = {{ email.text.trim() }} 
  AND password = {{ password.text.trim() }}
LIMIT 1;


-- -----------------------------------------------------------------------------
-- 2. FETCH SKILLS LIST (Pages: client, csr)
-- Query Name: Get_Skills_List
-- Used in Client form dropdown to choose required skill, and in CSR filters.
-- -----------------------------------------------------------------------------
SELECT 
    skill_id,
    name,
    description
FROM skills 
ORDER BY name ASC;


-- -----------------------------------------------------------------------------
-- 3. CLIENT: CREATE SERVICE REQUEST (Page: client)
-- Query Name: Create_Service_Request
-- Submits a new ticket with Subject, Type, Required Skill, and Description.
-- -----------------------------------------------------------------------------
INSERT INTO service_request (
    client_id,
    skill_id,
    subject,
    type,
    priority,
    description,
    location,
    status
) VALUES (
    {{ appsmith.store.currentUser ? appsmith.store.currentUser.user_id : 5 }},
    {{ select_skill.selectedOptionValue || null }},
    {{ input_subject.text.trim() }},
    {{ select_type.selectedOptionValue }},
    {{ select_priority.selectedOptionValue || 'medium' }},
    {{ input_description.text.trim() }},
    {{ input_location.text.trim() || 'N/A' }},
    'pending'
);


-- -----------------------------------------------------------------------------
-- 4. CLIENT: VIEW MY SERVICE REQUESTS (Page: client)
-- Query Name: Get_Client_Requests
-- Displays client's own tickets with live status and assigned technician.
-- -----------------------------------------------------------------------------
SELECT 
    sr.service_request_id,
    sr.subject,
    sr.type,
    COALESCE(s.name, 'General') AS required_skill,
    sr.priority,
    sr.status,
    sr.location,
    sr.description,
    sr.created_at,
    COALESCE(tech.name, 'Pending Assignment') AS assigned_technician
FROM service_request sr
LEFT JOIN skills s ON sr.skill_id = s.skill_id
LEFT JOIN service_request_technicians srt ON sr.service_request_id = srt.service_request_id
LEFT JOIN users tech ON srt.tech_id = tech.user_id
WHERE sr.client_id = {{ appsmith.store.currentUser ? appsmith.store.currentUser.user_id : 5 }}
ORDER BY sr.created_at DESC;


-- -----------------------------------------------------------------------------
-- 5. CSR / ADMIN: FETCH ALL REQUESTS (Page: csr)
-- Query Name: Get_All_Service_Requests
-- Includes client details, required skill, and assigned technician.
-- -----------------------------------------------------------------------------
SELECT 
    sr.service_request_id,
    sr.subject,
    sr.type,
    sr.skill_id,
    COALESCE(s.name, 'General') AS required_skill,
    sr.status,
    sr.priority,
    sr.location,
    sr.description,
    sr.created_at,
    sr.updated_at,
    client.name AS client_name,
    client.email AS client_email,
    client.phone AS client_phone,
    COALESCE(tech.user_id, NULL) AS tech_id,
    COALESCE(tech.name, 'Unassigned') AS assigned_tech_name,
    COALESCE(srt.notes, '') AS assignment_notes
FROM service_request sr
INNER JOIN users client ON sr.client_id = client.user_id
LEFT JOIN skills s ON sr.skill_id = s.skill_id
LEFT JOIN service_request_technicians srt ON sr.service_request_id = srt.service_request_id
LEFT JOIN users tech ON srt.tech_id = tech.user_id
WHERE (
    {{ !select_filter_status.selectedOptionValue || select_filter_status.selectedOptionValue === 'all' }} 
    OR sr.status = {{ select_filter_status.selectedOptionValue }}
)
AND (
    {{ !input_search.text }} 
    OR sr.subject LIKE {{ '%' + input_search.text + '%' }}
    OR client.name LIKE {{ '%' + input_search.text + '%' }}
)
ORDER BY 
    CASE sr.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
    END,
    sr.created_at DESC;


-- -----------------------------------------------------------------------------
-- 6. CSR: GET TECHNICIANS & THEIR CERTIFIED SKILLS (Page: csr)
-- Query Name: Get_Technicians_List
-- Returns technicians with comma-separated skills and list of skill IDs.
-- -----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.phone,
    COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '), 'No skills listed') AS skills_list,
    COALESCE(GROUP_CONCAT(s.skill_id SEPARATOR ','), '') AS skill_ids
FROM users u
LEFT JOIN tech_skills ts ON u.user_id = ts.user_id
LEFT JOIN skills s ON ts.skill_id = s.skill_id
WHERE u.user_role = 'technician'
GROUP BY u.user_id, u.name, u.email, u.phone
ORDER BY u.name ASC;


-- -----------------------------------------------------------------------------
-- 7. CSR: ASSIGN APPLICABLE TECHNICIAN (Page: csr)
-- Query Name: Assign_Technician_To_Request
-- Links chosen technician to the ticket and updates status to 'assigned'.
-- -----------------------------------------------------------------------------
INSERT INTO service_request_technicians (
    service_request_id,
    tech_id,
    notes
) VALUES (
    {{ Table_Requests.selectedRow.service_request_id }},
    {{ select_technician.selectedOptionValue }},
    {{ input_assign_notes.text || 'Assigned via CSR Dispatch' }}
)
ON DUPLICATE KEY UPDATE 
    tech_id = VALUES(tech_id),
    notes = VALUES(notes),
    assigned_at = CURRENT_TIMESTAMP;

UPDATE service_request 
SET status = 'assigned',
    updated_at = CURRENT_TIMESTAMP
WHERE service_request_id = {{ Table_Requests.selectedRow.service_request_id }};


-- -----------------------------------------------------------------------------
-- 8. CSR / TECH: UPDATE STATUS (Page: csr)
-- Query Name: Update_Request_Status
-- -----------------------------------------------------------------------------
UPDATE service_request 
SET 
    status = {{ select_update_status.selectedOptionValue }},
    updated_at = CURRENT_TIMESTAMP
WHERE service_request_id = {{ Table_Requests.selectedRow.service_request_id }};


-- -----------------------------------------------------------------------------
-- 9. CSR KPI METRICS (Page: csr)
-- Query Name: Get_Request_Metrics
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned_count,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count
FROM service_request;
