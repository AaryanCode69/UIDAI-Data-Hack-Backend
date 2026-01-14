
-- This schema defines the core tables for storing geospatial analytics:
-- - migration_flows: Inter-region migration patterns
-- - growth_zones: Peri-urban growth classification
-- - digital_risk: Digital exclusion risk metrics
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- Table: migration_flows
-- Purpose: Stores inter-region migration flow data as LineString geometries
-- Each row represents movement from an origin region to a destination region
-- ============================================================================
CREATE TABLE IF NOT EXISTS migration_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Origin and destination regions
    origin_region TEXT NOT NULL,
    destination_region TEXT NOT NULL,
    
    -- ML-derived migration score (0.0 to 1.0)
    migration_score FLOAT NOT NULL CHECK (migration_score >= 0 AND migration_score <= 1),
    
    -- Year of the migration data
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    
    -- Spatial geometry: LineString from origin to destination (WGS 84)
    geom GEOMETRY(LINESTRING, 4326) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_migration_flows_geom 
    ON migration_flows USING GIST (geom);

-- Index for filtering by year
CREATE INDEX IF NOT EXISTS idx_migration_flows_year 
    ON migration_flows (year);

-- Composite index for origin-destination lookups
CREATE INDEX IF NOT EXISTS idx_migration_flows_regions 
    ON migration_flows (origin_region, destination_region);

COMMENT ON TABLE migration_flows IS 'Inter-region migration flow patterns with LineString geometries';
COMMENT ON COLUMN migration_flows.migration_score IS 'ML-derived score indicating migration intensity (0-1)';
COMMENT ON COLUMN migration_flows.geom IS 'LineString geometry from origin centroid to destination centroid';


-- ============================================================================
-- Table: growth_zones
-- Purpose: Stores region-level growth classification as Polygon geometries
-- Used to identify peri-urban expansion and urbanization patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS growth_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Region identifier
    region_name TEXT NOT NULL,
    
    -- ML-derived growth score (0.0 to 1.0)
    growth_score FLOAT NOT NULL CHECK (growth_score >= 0 AND growth_score <= 1),
    
    -- Classification category
    classification TEXT NOT NULL CHECK (classification IN ('rural', 'peri-urban', 'urban')),
    
    -- Spatial geometry: Polygon boundary of the zone (WGS 84)
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_growth_zones_geom 
    ON growth_zones USING GIST (geom);

-- Index for filtering by classification
CREATE INDEX IF NOT EXISTS idx_growth_zones_classification 
    ON growth_zones (classification);

-- Index for region lookups
CREATE INDEX IF NOT EXISTS idx_growth_zones_region_name 
    ON growth_zones (region_name);

COMMENT ON TABLE growth_zones IS 'Region-level growth classification with Polygon boundaries';
COMMENT ON COLUMN growth_zones.growth_score IS 'ML-derived score indicating growth intensity (0-1)';
COMMENT ON COLUMN growth_zones.classification IS 'Zone type: rural, peri-urban, or urban';


-- ============================================================================
-- Table: digital_risk
-- Purpose: Stores digital exclusion risk analytics as Polygon geometries
-- Identifies regions with limited digital access or connectivity
-- ============================================================================
CREATE TABLE IF NOT EXISTS digital_risk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Region identifier
    region_name TEXT NOT NULL,
    
    -- ML-derived risk score (0.0 to 1.0, higher = more at risk)
    risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    
    -- Risk classification level
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    
    -- Contributing factors (flexible JSON structure)
    -- Example: {"internet_coverage": 0.3, "device_ownership": 0.4, "literacy": 0.5}
    factors JSONB DEFAULT '{}'::jsonb,
    
    -- Spatial geometry: Polygon boundary of the region (WGS 84)
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_digital_risk_geom 
    ON digital_risk USING GIST (geom);

-- Index for filtering by risk level
CREATE INDEX IF NOT EXISTS idx_digital_risk_level 
    ON digital_risk (risk_level);

-- Index for region lookups
CREATE INDEX IF NOT EXISTS idx_digital_risk_region_name 
    ON digital_risk (region_name);

-- GIN index for JSONB factor queries
CREATE INDEX IF NOT EXISTS idx_digital_risk_factors 
    ON digital_risk USING GIN (factors);

COMMENT ON TABLE digital_risk IS 'Digital exclusion risk metrics with Polygon boundaries';
COMMENT ON COLUMN digital_risk.risk_score IS 'ML-derived score indicating exclusion risk (0-1, higher = more risk)';
COMMENT ON COLUMN digital_risk.risk_level IS 'Categorical risk level: low, medium, or high';
COMMENT ON COLUMN digital_risk.factors IS 'JSONB containing contributing risk factors and their weights';


-- ============================================================================
-- Verification Queries (can be removed after initial setup)
-- ============================================================================
-- Run these to verify schema was created correctly:
-- 
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'migration_flows';
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('migration_flows', 'growth_zones', 'digital_risk');
-- ============================================================================
