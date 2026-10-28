-- ==============================================================================
-- Migration: 20261028000003_seed_data.sql
-- Description: Baseline institutions seed data for local testing and reference
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

INSERT INTO public.institutions (id, name, description, location, domain)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'TechCircuit Institute of Technology',
    'Flagship research university hosting central fabrication and computing clusters.',
    'Building 4, Science Park, Innovation Hub',
    'techcircuit.edu'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Metropolitan Bioengineering Laboratory',
    'Advanced biosafety level 2 wet labs, spectrometry, and imaging equipment.',
    'West Campus, Life Sciences Center',
    'metrobio.org'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Apex Community Makerspace & Prototyping Center',
    'Rapid fabrication facility with CNC mills, 5-axis routers, and electronics testbenches.',
    'Downtown Arts & Engineering District',
    'apexmakers.org'
  )
ON CONFLICT (id) DO NOTHING;
