-- Himbyte: Seed data for development/demo
-- Run this after migrations

-- Demo Restaurant
INSERT INTO restaurants (id, name, slug, description, address, city, phone, email, vat_registered, pan_number, is_hotel, subscription_status, subscription_plan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Himalayan Kitchen & Lodge',
  'himalayan-kitchen',
  'Authentic Nepali cuisine with a modern twist, nestled in the heart of Thamel.',
  'Thamel Marg, Kathmandu',
  'Kathmandu',
  '+977-1-4567890',
  'info@himalayankitchen.np',
  TRUE,
  '123456789',
  TRUE,
  'active',
  'pro'
);

-- Demo Tables
INSERT INTO tables (restaurant_id, table_number, capacity) VALUES
  ('a0000000-0000-0000-0000-000000000001', '1', 4),
  ('a0000000-0000-0000-0000-000000000001', '2', 2),
  ('a0000000-0000-0000-0000-000000000001', '3', 6),
  ('a0000000-0000-0000-0000-000000000001', '4', 4),
  ('a0000000-0000-0000-0000-000000000001', '5', 8);

-- Demo Rooms
INSERT INTO rooms (restaurant_id, room_number, floor, room_type) VALUES
  ('a0000000-0000-0000-0000-000000000001', '101', 1, 'standard'),
  ('a0000000-0000-0000-0000-000000000001', '102', 1, 'deluxe'),
  ('a0000000-0000-0000-0000-000000000001', '201', 2, 'suite');

-- Categories: Dining
INSERT INTO categories (id, restaurant_id, name, name_ne, icon, sort_order, context) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Starters', 'सुरुवाती', '🥟', 1, 'table'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mains', 'मुख्य', '🍛', 2, 'table'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Drinks', 'पेय', '🍵', 3, 'table'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Desserts', 'मिठाई', '🍮', 4, 'table'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Room Service', 'कोठा सेवा', '🛎️', 1, 'room');

-- Menu Items
INSERT INTO menu_items (restaurant_id, category_id, name, name_ne, description, price, is_vegetarian, is_spicy, spice_level, preparation_time) VALUES
  -- Starters
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Steam Momo', 'भाप मो:मो', 'Classic Nepali steamed dumplings filled with seasoned chicken', 250, FALSE, TRUE, 2, 15),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Fried Momo', 'तलेको मो:मो', 'Crispy fried dumplings with spicy achar', 280, FALSE, TRUE, 3, 18),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Chatamari', 'चतामारी', 'Newari rice crepe with minced meat topping', 320, FALSE, FALSE, 1, 20),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Aloo Achar', 'आलु अचार', 'Spiced potato salad with sesame and lemon', 150, TRUE, TRUE, 2, 5),

  -- Mains
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Dal Bhat Tarkari Set', 'दाल भात तरकारी', 'Complete Nepali meal with lentils, rice, vegetables, pickle, and papad', 450, TRUE, FALSE, 1, 20),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Thakali Khana Set', 'थकाली खाना', 'Premium Thakali-style set with gundruk, dhido, and mutton curry', 650, FALSE, TRUE, 2, 25),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Newari Khaja Set', 'नेवारी खजा', 'Traditional Newari feast — choila, baji, achar, bara, and more', 550, FALSE, TRUE, 3, 25),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Chicken Sekuwa', 'चिकन सेकुवा', 'Grilled marinated chicken skewers with Nepali spices', 480, FALSE, TRUE, 3, 20),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Thukpa', 'थुक्पा', 'Hearty Tibetan noodle soup with vegetables and chicken', 350, FALSE, FALSE, 1, 15),

  -- Drinks
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Masala Chiya', 'मसला चिया', 'Traditional Nepali spiced milk tea', 80, TRUE, FALSE, 0, 5),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Lassi', 'लस्सी', 'Thick yogurt-based drink — sweet or salty', 120, TRUE, FALSE, 0, 5),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Fresh Lime Soda', 'लाइम सोडा', 'Refreshing lime soda with mint', 100, TRUE, FALSE, 0, 3),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Tongba', 'तोङ्बा', 'Fermented millet drink served in traditional bamboo vessel', 350, TRUE, FALSE, 0, 5),

  -- Desserts
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Juju Dhau', 'जुजु धौ', 'King of yogurt — creamy Bhaktapur-style sweetened yogurt', 180, TRUE, FALSE, 0, 0),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Sel Roti', 'सेल रोटी', 'Traditional Nepali ring-shaped sweet rice bread', 120, TRUE, FALSE, 0, 10),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Kheer', 'खिर', 'Rich Nepali rice pudding with cardamom and nuts', 150, TRUE, FALSE, 0, 15),

  -- Room Service
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Room Service Dal Bhat', 'कोठा दाल भात', 'Complete meal delivered to your room', 500, TRUE, FALSE, 1, 25),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Room Service Momo', 'कोठा मो:मो', 'Fresh momos delivered hot to your door', 300, FALSE, TRUE, 2, 20);
