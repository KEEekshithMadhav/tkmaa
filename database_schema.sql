-- ==========================================
-- TKMAA COMPLETE DATABASE SCHEMA (MATCHED TO EXISTING)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'student', 'parent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. BRANCHES TABLE (MATCHED TO SCREENSHOT)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    address TEXT,
    phone TEXT,
    timings TEXT DEFAULT '6:00 AM – 8:00 PM',
    maps_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. BELT LEVELS TABLE (MATCHED TO SCREENSHOT)
CREATE TABLE IF NOT EXISTS public.belt_levels (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    hex TEXT NOT NULL,
    order_rank INTEGER NOT NULL UNIQUE,
    next_belt TEXT
);

-- 4. TRAINERS TABLE
CREATE TABLE IF NOT EXISTS public.trainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    experience_yrs INTEGER DEFAULT 0,
    specialization TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
    belt_level_id INTEGER REFERENCES public.belt_levels(id) ON DELETE RESTRICT,
    dob DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    parent_name TEXT,
    parent_phone TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(student_id, date)
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==========================================
-- SEED DATA (MATCHED EXACTLY TO SCREENSHOTS)
-- ==========================================

-- INSERT BELT LEVELS
INSERT INTO public.belt_levels (id, name, color, hex, order_rank, next_belt) VALUES
(1, 'White', 'white', '#FFFFFF', 1, 'Yellow'),
(2, 'Yellow', 'yellow', '#FFD700', 2, 'Orange'),
(3, 'Orange', 'orange', '#FF8C00', 3, 'Green'),
(4, 'Green', 'green', '#228B22', 4, 'Blue'),
(5, 'Blue', 'blue', '#4169E1', 5, 'Purple'),
(6, 'Purple', 'purple', '#8B008B', 6, 'Red'),
(7, 'Red', 'red', '#8B0000', 7, 'Brown'),
(8, 'Brown', 'brown', '#6B3A2A', 8, 'Black'),
(9, 'Black', 'black', '#1a1a1a', 9, NULL)
ON CONFLICT (name) DO UPDATE SET 
    color = EXCLUDED.color, 
    hex = EXCLUDED.hex, 
    order_rank = EXCLUDED.order_rank, 
    next_belt = EXCLUDED.next_belt;

-- INSERT BRANCHES
INSERT INTO public.branches (name, location, address, phone) VALUES
('Nizampet', 'Nizampet, Hyderabad', 'H.No 45, Nizampet Road, Hyderabad - 500090', '+91 98765 43211'),
('Kukatpally', 'Kukatpally, Hyderabad', 'KPHB Phase 3, Kukatpally, Hyderabad - 500072', '+91 98765 43212'),
('Pragati Nagar', 'Pragati Nagar, Hyderabad', 'Plot 12, Pragati Nagar, Hyderabad - 500090', '+91 98765 43210'),
('Bachupally', 'Bachupally, Hyderabad', 'Main Road, Bachupally, Hyderabad - 500090', '+91 98765 43214'),
('KPHB Colony', 'KPHB, Hyderabad', 'Road No 1, KPHB Colony, Hyderabad - 500072', '+91 98765 43213')
ON CONFLICT (name) DO NOTHING;
