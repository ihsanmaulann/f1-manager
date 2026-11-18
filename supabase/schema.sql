-- ============================================================================
-- F1 MOTORSPORT MANAGER — SUPABASE POSTGRESQL SCHEMA
-- Menyimpan profil karir pemain, level upgrade R&D tim, klasemen kejuaraan
-- pembalap & konstruktor, serta riwayat hasil balapan.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL PROFIL KARIR PEMAIN (career_profiles)
CREATE TABLE IF NOT EXISTS public.career_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    manager_name TEXT NOT NULL DEFAULT 'Team Principal',
    team_id TEXT NOT NULL DEFAULT 'ferrari',
    team_name TEXT NOT NULL DEFAULT 'Scuderia Ferrari HP',
    budget BIGINT NOT NULL DEFAULT 28500000 CHECK (budget >= 0),
    season_number INTEGER NOT NULL DEFAULT 2026,
    current_round_index INTEGER NOT NULL DEFAULT 0 CHECK (current_round_index BETWEEN 0 AND 9),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL LEVEL UPGRADE R&D MOBIL TIM (team_upgrades)
CREATE TABLE IF NOT EXISTS public.team_upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
    aerodynamics_level INTEGER NOT NULL DEFAULT 1 CHECK (aerodynamics_level BETWEEN 1 AND 10),
    chassis_level INTEGER NOT NULL DEFAULT 1 CHECK (chassis_level BETWEEN 1 AND 10),
    powertrain_level INTEGER NOT NULL DEFAULT 1 CHECK (powertrain_level BETWEEN 1 AND 10),
    durability_level INTEGER NOT NULL DEFAULT 1 CHECK (durability_level BETWEEN 1 AND 10),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_career_upgrades UNIQUE (career_id)
);

-- 3. TABEL KLASEMEN KEJUARAAN PEMBALAP (driver_standings)
CREATE TABLE IF NOT EXISTS public.driver_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
    driver_id TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_code CHAR(3) NOT NULL,
    driver_number INTEGER NOT NULL,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_color_hex VARCHAR(7) NOT NULL,
    base_pace NUMERIC(4,1) NOT NULL DEFAULT 90.0 CHECK (base_pace BETWEEN 80.0 AND 99.0),
    tyre_management NUMERIC(4,1) NOT NULL DEFAULT 90.0 CHECK (tyre_management BETWEEN 80.0 AND 99.0),
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
    podiums INTEGER NOT NULL DEFAULT 0 CHECK (podiums >= 0),
    is_player_controlled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_career_driver UNIQUE (career_id, driver_id)
);

-- 4. TABEL KLASEMEN KEJUARAAN KONSTRUKTOR (constructor_standings)
CREATE TABLE IF NOT EXISTS public.constructor_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
    podiums INTEGER NOT NULL DEFAULT 0 CHECK (podiums >= 0),
    is_player_team BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_career_constructor UNIQUE (career_id, team_id)
);

-- 5. TABEL RIWAYAT HASIL BALAPAN (race_results_history)
CREATE TABLE IF NOT EXISTS public.race_results_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL DEFAULT 2026,
    round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 10),
    circuit_id TEXT NOT NULL,
    circuit_name TEXT NOT NULL,
    country TEXT NOT NULL,
    winner_driver_id TEXT NOT NULL,
    winner_code CHAR(3) NOT NULL,
    winner_team_name TEXT NOT NULL,
    fastest_lap_driver_code CHAR(3),
    fastest_lap_time_seconds NUMERIC(6,3),
    player_driver_1_code CHAR(3) NOT NULL,
    player_driver_1_position INTEGER NOT NULL CHECK (player_driver_1_position BETWEEN 1 AND 20),
    player_driver_1_points INTEGER NOT NULL DEFAULT 0,
    player_driver_2_code CHAR(3) NOT NULL,
    player_driver_2_position INTEGER NOT NULL CHECK (player_driver_2_position BETWEEN 1 AND 20),
    player_driver_2_points INTEGER NOT NULL DEFAULT 0,
    prize_money_earned BIGINT NOT NULL DEFAULT 0,
    full_classification JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES UNTUK PERFORMA QUERY KLASEMEN & RIWAYAT
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON public.career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_standings_career_points ON public.driver_standings(career_id, points DESC, wins DESC);
CREATE INDEX IF NOT EXISTS idx_constructor_standings_career_points ON public.constructor_standings(career_id, points DESC, wins DESC);
CREATE INDEX IF NOT EXISTS idx_race_results_career_round ON public.race_results_history(career_id, season_number, round_number);

-- ============================================================================
-- TRIGGER OTOMATIS UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_career_profiles_updated_at ON public.career_profiles;
CREATE TRIGGER set_career_profiles_updated_at
    BEFORE UPDATE ON public.career_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_team_upgrades_updated_at ON public.team_upgrades;
CREATE TRIGGER set_team_upgrades_updated_at
    BEFORE UPDATE ON public.team_upgrades
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_driver_standings_updated_at ON public.driver_standings;
CREATE TRIGGER set_driver_standings_updated_at
    BEFORE UPDATE ON public.driver_standings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_constructor_standings_updated_at ON public.constructor_standings;
CREATE TRIGGER set_constructor_standings_updated_at
    BEFORE UPDATE ON public.constructor_standings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES UNTUK SUPABASE AUTH
-- ============================================================================
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constructor_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own career profiles"
    ON public.career_profiles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own team upgrades"
    ON public.team_upgrades
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.career_profiles cp
            WHERE cp.id = team_upgrades.career_id AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own driver standings"
    ON public.driver_standings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.career_profiles cp
            WHERE cp.id = driver_standings.career_id AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own constructor standings"
    ON public.constructor_standings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.career_profiles cp
            WHERE cp.id = constructor_standings.career_id AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own race results history"
    ON public.race_results_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.career_profiles cp
            WHERE cp.id = race_results_history.career_id AND cp.user_id = auth.uid()
        )
    );

