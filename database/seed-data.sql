-- ============================================================================
-- REAL ESTATE PLATFORM - SEED DATA
-- Comprehensive sample data for development and testing
-- ============================================================================

-- ============================================================================
-- USERS (Buyers, Sellers, Agents, Builders)
-- ============================================================================

INSERT INTO users (open_id, email, name, phone_number, role, avatar_url, bio) VALUES
-- Admins
('admin_001', 'admin@realestate.ng', 'Admin User', '+234-800-000-0001', 'admin', NULL, 'Platform administrator'),

-- Agents
('agent_001', 'adebayo.ogun@realestate.ng', 'Adebayo Ogunleye', '+234-803-123-4567', 'agent', NULL, 'Experienced real estate agent specializing in Lagos luxury properties. 10+ years in the industry.'),
('agent_002', 'chioma.nwankwo@realestate.ng', 'Chioma Nwankwo', '+234-806-234-5678', 'agent', NULL, 'Top-rated agent in Abuja with expertise in commercial properties.'),
('agent_003', 'ibrahim.mohammed@realestate.ng', 'Ibrahim Mohammed', '+234-809-345-6789', 'agent', NULL, 'Specialist in residential properties across Northern Nigeria.'),

-- Builders
('builder_001', 'info@premiumhomes.ng', 'Premium Homes Ltd', '+234-801-111-2222', 'builder', NULL, 'Leading construction company with 15 years experience'),
('builder_002', 'contact@urbanspaces.ng', 'Urban Spaces Development', '+234-802-222-3333', 'builder', NULL, 'Modern residential and commercial developments'),

-- Regular Users (Buyers)
('user_001', 'john.doe@email.com', 'John Doe', '+234-803-555-1001', 'user', NULL, 'Looking for my first home in Lagos'),
('user_002', 'jane.smith@email.com', 'Jane Smith', '+234-806-555-1002', 'user', NULL, 'Interested in investment properties'),
('user_003', 'david.wilson@email.com', 'David Wilson', '+234-809-555-1003', 'user', NULL, 'Relocating to Nigeria from abroad'),
('user_004', 'sarah.johnson@email.com', 'Sarah Johnson', '+234-803-555-1004', 'user', NULL, 'First-time home buyer'),
('user_005', 'michael.brown@email.com', 'Michael Brown', '+234-806-555-1005', 'user', NULL, 'Looking for commercial property');

-- ============================================================================
-- PROPERTIES - LAGOS
-- ============================================================================

INSERT INTO properties (
    external_id, address_line1, city, state, country,
    latitude, longitude,
    property_type, listing_type, status,
    bedrooms, bathrooms, square_feet, lot_size, year_built,
    price, currency, title, description, features, amenities,
    primary_image, images,
    owner_id, agent_id,
    blockchain_verified
) VALUES
-- Luxury Properties in Ikoyi
('LAG-IKY-001', '15 Banana Island Road', 'Lagos', 'Lagos State', 'Nigeria',
 6.4474, 3.4286,
 'single_family', 'sale', 'active',
 5, 6, 6500, 8000, 2020,
 500000000.00, 'NGN',
 'Luxury 5-Bedroom Waterfront Villa - Banana Island',
 'Stunning waterfront villa with panoramic views of Lagos Lagoon. Features include infinity pool, private dock, smart home automation, and 24/7 security. Perfect for executives and diplomats.',
 '{"pool": true, "waterfront": true, "smart_home": true, "generator": true, "solar": true, "gym": true}',
 ARRAY['Swimming Pool', 'Private Dock', 'Smart Home', 'Backup Generator', 'Solar Panels', 'Gym', '24/7 Security', 'Elevator'],
 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
 ARRAY['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
 6, 2,
 true),

('LAG-IKY-002', '42 Alexander Road', 'Lagos', 'Lagos State', 'Nigeria',
 6.4541, 3.4280,
 'condo', 'sale', 'active',
 3, 3, 2800, NULL, 2021,
 85000000.00, 'NGN',
 'Modern 3-Bedroom Penthouse - Ikoyi',
 'Contemporary penthouse apartment in the heart of Ikoyi. Floor-to-ceiling windows, Italian marble finishes, and access to world-class amenities including rooftop pool and fitness center.',
 '{"pool": true, "gym": true, "parking": 2, "generator": true}',
 ARRAY['Rooftop Pool', 'Gym', 'Concierge', 'Parking (2 spaces)', 'Generator', 'Elevator'],
 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
 ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
 7, 2,
 true),

-- Victoria Island Properties
('LAG-VI-001', '23 Ahmadu Bello Way', 'Lagos', 'Lagos State', 'Nigeria',
 6.4281, 3.4219,
 'commercial', 'sale', 'active',
 NULL, 4, 12000, NULL, 2019,
 750000000.00, 'NGN',
 'Prime Commercial Building - Victoria Island',
 'Grade A commercial office space in the heart of Victoria Island business district. Fully fitted with modern amenities, backup power, and ample parking. Ideal for corporate headquarters.',
 '{"parking": 50, "generator": true, "elevator": 2, "conference_rooms": 5}',
 ARRAY['Central Location', 'Backup Generator', '2 Elevators', 'Parking (50 spaces)', 'Conference Rooms', 'Fiber Internet'],
 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
 ARRAY['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
 8, 3,
 false),

-- Lekki Properties
('LAG-LEK-001', '15 Admiralty Way', 'Lagos', 'Lagos State', 'Nigeria',
 6.4474, 3.5378,
 'townhouse', 'sale', 'active',
 4, 4, 3200, 2000, 2022,
 120000000.00, 'NGN',
 'Contemporary 4-Bedroom Townhouse - Lekki Phase 1',
 'Brand new townhouse in gated estate with modern finishes. Features open-plan living, fitted kitchen, ensuite bedrooms, and private garden. Close to schools and shopping.',
 '{"pool": false, "garden": true, "parking": 2, "generator": true, "estate": true}',
 ARRAY['Gated Estate', 'Garden', 'Parking (2 spaces)', 'Generator', 'Fitted Kitchen', 'Close to Schools'],
 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
 ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'],
 9, 2,
 true),

('LAG-LEK-002', '78 Admiralty Road', 'Lagos', 'Lagos State', 'Nigeria',
 6.4502, 3.5401,
 'single_family', 'rent', 'active',
 3, 3, 2200, 1500, 2020,
 4500000.00, 'NGN',
 '3-Bedroom Detached House for Rent - Lekki',
 'Well-maintained family home in secure estate. Spacious living areas, modern kitchen, and beautiful garden. Available for immediate occupancy.',
 '{"pool": false, "garden": true, "parking": 2, "generator": true}',
 ARRAY['Garden', 'Parking (2 spaces)', 'Generator', 'Security', 'Serviced Estate'],
 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
 ARRAY['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
 10, 2,
 false);

-- ============================================================================
-- PROPERTIES - ABUJA
-- ============================================================================

INSERT INTO properties (
    external_id, address_line1, city, state, country,
    latitude, longitude,
    property_type, listing_type, status,
    bedrooms, bathrooms, square_feet, lot_size, year_built,
    price, currency, title, description, features, amenities,
    primary_image, images,
    owner_id, agent_id,
    blockchain_verified
) VALUES
('ABJ-ASO-001', '12 Diplomatic Drive', 'Abuja', 'FCT', 'Nigeria',
 9.0579, 7.4951,
 'single_family', 'sale', 'active',
 6, 7, 7500, 10000, 2021,
 450000000.00, 'NGN',
 'Luxury 6-Bedroom Mansion - Asokoro',
 'Magnificent mansion in prestigious Asokoro district. Features include cinema room, wine cellar, infinity pool, and staff quarters. Perfect for diplomats and high-net-worth individuals.',
 '{"pool": true, "cinema": true, "wine_cellar": true, "staff_quarters": true, "generator": true, "solar": true}',
 ARRAY['Swimming Pool', 'Cinema Room', 'Wine Cellar', 'Staff Quarters', 'Generator', 'Solar Panels', '24/7 Security'],
 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
 ARRAY['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
 6, 3,
 true),

('ABJ-MAI-001', '45 Aguiyi Ironsi Street', 'Abuja', 'FCT', 'Nigeria',
 9.0643, 7.4892,
 'condo', 'sale', 'active',
 3, 3, 2500, NULL, 2022,
 65000000.00, 'NGN',
 'Modern 3-Bedroom Apartment - Maitama',
 'Stylish apartment in upscale Maitama neighborhood. Contemporary design with high-end finishes, balcony with city views, and access to premium amenities.',
 '{"pool": true, "gym": true, "parking": 2, "generator": true}',
 ARRAY['Pool', 'Gym', 'Parking (2 spaces)', 'Generator', 'Balcony', 'City Views'],
 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
 ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
 7, 3,
 true);

-- ============================================================================
-- PROPERTIES - PORT HARCOURT
-- ============================================================================

INSERT INTO properties (
    external_id, address_line1, city, state, country,
    latitude, longitude,
    property_type, listing_type, status,
    bedrooms, bathrooms, square_feet, lot_size, year_built,
    price, currency, title, description, features, amenities,
    primary_image, images,
    owner_id, agent_id,
    blockchain_verified
) VALUES
('PHC-GRA-001', '28 Forces Avenue', 'Port Harcourt', 'Rivers State', 'Nigeria',
 4.8156, 7.0498,
 'single_family', 'sale', 'active',
 5, 5, 4500, 6000, 2020,
 180000000.00, 'NGN',
 '5-Bedroom Detached Duplex - GRA Phase 2',
 'Spacious family home in the prestigious GRA area. Features include large compound, modern kitchen, and ample parking. Ideal for executives in the oil and gas sector.',
 '{"pool": false, "garden": true, "parking": 4, "generator": true, "borehole": true}',
 ARRAY['Large Compound', 'Garden', 'Parking (4 spaces)', 'Generator', 'Borehole', 'Security'],
 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
 ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
 8, 4,
 false);

-- ============================================================================
-- PROPERTY VALUATIONS (Zestimate-style)
-- ============================================================================

INSERT INTO property_valuations (
    property_id, estimated_value, confidence_score,
    value_range_low, value_range_high,
    model_version, model_type,
    comparable_sales_weight, location_weight, property_features_weight,
    market_trends_weight, visual_assessment_weight,
    data_sources
) VALUES
(1, 520000000.00, 0.8750, 480000000.00, 560000000.00, 'v2.1.0', 'ensemble',
 0.35, 0.25, 0.20, 0.15, 0.05,
 '{"comparable_sales": 12, "days_analyzed": 180, "neighborhood_properties": 45}'::jsonb),
 
(2, 88000000.00, 0.9100, 82000000.00, 94000000.00, 'v2.1.0', 'gnn',
 0.30, 0.30, 0.25, 0.10, 0.05,
 '{"comparable_sales": 18, "days_analyzed": 180, "neighborhood_properties": 67}'::jsonb),
 
(3, 780000000.00, 0.7800, 700000000.00, 860000000.00, 'v2.1.0', 'hybrid',
 0.40, 0.20, 0.25, 0.10, 0.05,
 '{"comparable_sales": 8, "days_analyzed": 180, "neighborhood_properties": 23}'::jsonb);

-- ============================================================================
-- GNN PROPERTY NODES (Graph Features)
-- ============================================================================

INSERT INTO gnn_property_nodes (
    property_id, feature_vector, embedding_vector,
    degree_centrality, betweenness_centrality, pagerank_score,
    avg_neighbor_price, neighbor_count
) VALUES
(1, ARRAY[0.95, 0.88, 0.92, 0.85, 0.90], ARRAY[0.23, 0.45, 0.67, 0.12, 0.89],
 0.0234, 0.0156, 0.0289, 420000000.00, 12),
 
(2, ARRAY[0.82, 0.79, 0.85, 0.78, 0.81], ARRAY[0.34, 0.56, 0.23, 0.78, 0.45],
 0.0189, 0.0123, 0.0234, 75000000.00, 18),
 
(3, ARRAY[0.91, 0.87, 0.89, 0.84, 0.88], ARRAY[0.45, 0.67, 0.89, 0.23, 0.56],
 0.0267, 0.0178, 0.0312, 680000000.00, 8);

-- ============================================================================
-- GNN PROPERTY EDGES (Spatial Relationships)
-- ============================================================================

INSERT INTO gnn_property_edges (
    source_property_id, target_property_id,
    distance_meters, similarity_score, edge_weight, edge_type
) VALUES
(1, 2, 1250.50, 0.7823, 0.6234, 'spatial'),
(1, 3, 3450.75, 0.5612, 0.4123, 'spatial'),
(2, 3, 4200.25, 0.4567, 0.3456, 'spatial'),
(1, 4, 2100.00, 0.8234, 0.7123, 'feature_similar'),
(2, 4, 1800.50, 0.7456, 0.6345, 'feature_similar');

-- ============================================================================
-- SAVED SEARCHES
-- ============================================================================

INSERT INTO saved_searches (user_id, name, search_criteria, alerts_enabled, alert_frequency) VALUES
(6, 'Lagos 3-Bedroom Houses', 
 '{"city": "Lagos", "bedrooms": 3, "property_type": "single_family", "max_price": 150000000}'::jsonb,
 true, 'daily'),
 
(7, 'Abuja Luxury Condos',
 '{"city": "Abuja", "property_type": "condo", "min_price": 50000000, "max_price": 100000000}'::jsonb,
 true, 'instant'),
 
(8, 'Commercial Properties Nigeria',
 '{"property_type": "commercial", "min_sqft": 5000}'::jsonb,
 true, 'weekly');

-- ============================================================================
-- FAVORITES
-- ============================================================================

INSERT INTO favorites (user_id, property_id, notes) VALUES
(6, 1, 'Dream home! Need to schedule a viewing.'),
(6, 2, 'Good backup option if #1 doesn''t work out.'),
(7, 3, 'Perfect for my business headquarters.'),
(8, 4, 'Great location for family.'),
(9, 2, 'Love the modern design.');

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================

INSERT INTO appointments (
    property_id, user_id, agent_id,
    appointment_date, duration_minutes, tour_type, status,
    notes
) VALUES
(1, 6, 2, NOW() + INTERVAL '3 days', 60, 'in_person', 'confirmed',
 'Client very interested. Bring property documents.'),
 
(2, 7, 2, NOW() + INTERVAL '5 days', 45, 'virtual', 'pending',
 'Virtual tour via Zoom. Client is overseas.'),
 
(4, 8, 2, NOW() + INTERVAL '2 days', 60, 'in_person', 'confirmed',
 'Family viewing. Show school proximity.');

-- ============================================================================
-- OFFERS
-- ============================================================================

INSERT INTO offers (
    property_id, buyer_id,
    offer_amount, down_payment_percent, closing_date,
    contingencies, additional_terms, status
) VALUES
(1, 6, 480000000.00, 20.00, CURRENT_DATE + INTERVAL '60 days',
 ARRAY['Home Inspection', 'Financing Approval', 'Title Search'],
 'Buyer requests 60-day closing period for mortgage approval.',
 'pending'),
 
(2, 7, 82000000.00, 25.00, CURRENT_DATE + INTERVAL '45 days',
 ARRAY['Home Inspection'],
 'Cash buyer. Can close quickly if inspection passes.',
 'pending');

-- ============================================================================
-- PROPERTY REVIEWS
-- ============================================================================

INSERT INTO property_reviews (
    property_id, user_id, rating, title, review_text,
    pros, cons, is_verified_buyer
) VALUES
(5, 9, 5, 'Excellent Property and Location',
 'We''ve been renting this property for 6 months and absolutely love it. The neighborhood is safe, quiet, and has great amenities nearby.',
 'Great location, responsive landlord, well-maintained',
 'Parking can be tight during peak hours',
 true),
 
(4, 10, 4, 'Good Value for Money',
 'Nice townhouse in a secure estate. Good for families with children. The estate has a playground and is close to good schools.',
 'Family-friendly, secure, good schools nearby',
 'Generator noise can be loud',
 false);

-- ============================================================================
-- BUILDERS
-- ============================================================================

INSERT INTO builders (user_id, company_name, company_logo, description, years_in_business, license_number, verification_status, website, phone, email) VALUES
(5, 'Premium Homes Ltd', NULL,
 'Premium Homes Ltd is a leading construction and real estate development company in Nigeria with over 15 years of experience. We specialize in luxury residential and commercial properties.',
 15, 'BLD-LAG-2008-1234', 'verified',
 'https://premiumhomes.ng', '+234-801-111-2222', 'info@premiumhomes.ng'),
 
(6, 'Urban Spaces Development', NULL,
 'Urban Spaces Development focuses on creating modern, sustainable living spaces in major Nigerian cities. Our projects combine contemporary design with functionality.',
 8, 'BLD-ABJ-2015-5678', 'verified',
 'https://urbanspaces.ng', '+234-802-222-3333', 'contact@urbanspaces.ng');

-- ============================================================================
-- BUILDER PROJECTS
-- ============================================================================

INSERT INTO builder_projects (
    builder_id, project_name, description, location,
    property_type, construction_status,
    total_units, available_units, starting_price, completion_date,
    images
) VALUES
(1, 'Marina Heights', 
 'Luxury high-rise development in the heart of Lagos Marina. 20-story building with panoramic ocean views, rooftop pool, and world-class amenities.',
 'Lagos Marina, Lagos State',
 'condo', 'under_construction',
 120, 45, 95000000.00, '2025-12-31',
 ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800']),
 
(1, 'Lekki Gardens Phase 5',
 'Gated estate with 50 modern townhouses. Each unit features 4 bedrooms, solar panels, and smart home technology.',
 'Lekki Phase 1, Lagos State',
 'townhouse', 'pre_construction',
 50, 50, 85000000.00, '2026-06-30',
 ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800']),
 
(2, 'Abuja Central Plaza',
 'Mixed-use development featuring retail spaces on ground floor and luxury apartments on upper floors. Prime location in Wuse 2.',
 'Wuse 2, Abuja FCT',
 'commercial', 'under_construction',
 80, 32, 120000000.00, '2025-09-30',
 ARRAY['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800']);

-- ============================================================================
-- PROJECT MILESTONES
-- ============================================================================

INSERT INTO project_milestones (
    project_id, milestone_name, description,
    target_date, percentage_complete, amount, status
) VALUES
(1, 'Foundation Complete', 'Foundation and basement construction', '2024-03-31', 100, 50000000.00, 'completed'),
(1, 'Structural Framework', 'Main building structure to 20th floor', '2024-09-30', 75, 150000000.00, 'in_progress'),
(1, 'Interior Finishing', 'All interior work and fixtures', '2025-06-30', 0, 100000000.00, 'pending'),
(1, 'Final Inspection', 'Government approvals and handover', '2025-12-31', 0, 20000000.00, 'pending');

-- ============================================================================
-- SHORTLET PROPERTIES
-- ============================================================================

INSERT INTO shortlet_properties (
    property_id, host_id,
    nightly_rate, weekly_discount_percent, monthly_discount_percent,
    min_nights, max_nights,
    check_in_time, check_out_time,
    house_rules, cancellation_policy, instant_booking
) VALUES
(5, 10, 45000.00, 10.00, 20.00,
 2, 30,
 '14:00', '11:00',
 'No smoking indoors. No parties. Maximum 6 guests. Respect neighbors.',
 'Free cancellation up to 48 hours before check-in. 50% refund for cancellations within 48 hours.',
 true);

-- ============================================================================
-- SHORTLET BOOKINGS
-- ============================================================================

INSERT INTO shortlet_bookings (
    shortlet_property_id, guest_id,
    check_in_date, check_out_date, num_guests,
    total_amount, payment_status, status
) VALUES
(1, 6, CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '17 days', 4,
 283500.00, 'completed', 'confirmed');

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

INSERT INTO notifications (user_id, notification_type, title, message, link, is_read) VALUES
(6, 'property_alert', 'New Property Match!',
 'A new 3-bedroom house in Lagos matches your saved search criteria.',
 '/property/4', false),
 
(6, 'showing_reminder', 'Showing Tomorrow',
 'You have a property showing scheduled for tomorrow at 2:00 PM.',
 '/appointments', false),
 
(7, 'offer_update', 'Offer Status Update',
 'The seller has responded to your offer on the Ikoyi Penthouse.',
 '/offers', false);

-- ============================================================================
-- PROPERTY VIEWS (Analytics)
-- ============================================================================

INSERT INTO property_views (property_id, user_id, view_duration_seconds) VALUES
(1, 6, 245),
(1, 7, 180),
(1, 8, 320),
(2, 6, 156),
(2, 7, 420),
(3, 8, 290),
(4, 9, 210);

-- ============================================================================
-- USER ACTIVITY (Tracking)
-- ============================================================================

INSERT INTO user_activity (user_id, activity_type, activity_data) VALUES
(6, 'search', '{"query": "3 bedroom Lagos", "results": 45}'::jsonb),
(6, 'favorite', '{"property_id": 1, "action": "added"}'::jsonb),
(7, 'inquiry', '{"property_id": 2, "message": "Is this still available?"}'::jsonb),
(8, 'comparison', '{"property_ids": [1, 2, 3]}'::jsonb);

-- ============================================================================
-- SERVICE HEALTH (Monitoring)
-- ============================================================================

INSERT INTO service_health_checks (service_name, status, response_time_ms) VALUES
('gnn-valuation-service', 'healthy', 145),
('computer-vision-service', 'healthy', 230),
('alternative-data-service', 'healthy', 180),
('ensemble-models-service', 'healthy', 195),
('bias-correction-service', 'healthy', 120);

-- ============================================================================
-- UPDATE SEQUENCES
-- ============================================================================

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('properties_id_seq', (SELECT MAX(id) FROM properties));
SELECT setval('property_valuations_id_seq', (SELECT MAX(id) FROM property_valuations));
SELECT setval('saved_searches_id_seq', (SELECT MAX(id) FROM saved_searches));
SELECT setval('favorites_id_seq', (SELECT MAX(id) FROM favorites));
SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM appointments));
SELECT setval('offers_id_seq', (SELECT MAX(id) FROM offers));
SELECT setval('property_reviews_id_seq', (SELECT MAX(id) FROM property_reviews));
SELECT setval('builders_id_seq', (SELECT MAX(id) FROM builders));
SELECT setval('builder_projects_id_seq', (SELECT MAX(id) FROM builder_projects));
SELECT setval('project_milestones_id_seq', (SELECT MAX(id) FROM project_milestones));
SELECT setval('shortlet_properties_id_seq', (SELECT MAX(id) FROM shortlet_properties));
SELECT setval('shortlet_bookings_id_seq', (SELECT MAX(id) FROM shortlet_bookings));
SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify data insertion
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Properties', COUNT(*) FROM properties
UNION ALL
SELECT 'Property Valuations', COUNT(*) FROM property_valuations
UNION ALL
SELECT 'GNN Nodes', COUNT(*) FROM gnn_property_nodes
UNION ALL
SELECT 'GNN Edges', COUNT(*) FROM gnn_property_edges
UNION ALL
SELECT 'Saved Searches', COUNT(*) FROM saved_searches
UNION ALL
SELECT 'Favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Offers', COUNT(*) FROM offers
UNION ALL
SELECT 'Reviews', COUNT(*) FROM property_reviews
UNION ALL
SELECT 'Builders', COUNT(*) FROM builders
UNION ALL
SELECT 'Builder Projects', COUNT(*) FROM builder_projects
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
