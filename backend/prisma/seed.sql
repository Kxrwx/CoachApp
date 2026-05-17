-- Seed des métriques de base pour CoachApp (Cyclisme)
-- À exécuter après avoir créé les tables Prisma

INSERT INTO "Metric" (id, key, name, unit, "aggregationType", scope) VALUES
  -- Distance et durée
  (gen_random_uuid(), 'distance_km', 'Distance totale (km)', 'km', 'SUM', 'monthly'),
  (gen_random_uuid(), 'duration_hours', 'Durée totale (heures)', 'h', 'SUM', 'monthly'),
  (gen_random_uuid(), 'ride_count', 'Nombre de sorties', 'sorties', 'COUNT', 'monthly'),
  
  -- Puissance
  (gen_random_uuid(), 'power_avg', 'Puissance moyenne', 'W', 'AVG', 'ride'),
  (gen_random_uuid(), 'power_max', 'Puissance maximale', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'ftp', 'FTP (Functional Threshold Power)', 'W', 'MAX', 'static'),
  
  -- Cadence
  (gen_random_uuid(), 'cadence_avg', 'Cadence moyenne', 'rpm', 'AVG', 'ride'),
  (gen_random_uuid(), 'cadence_max', 'Cadence maximale', 'rpm', 'MAX', 'ride'),
  
  -- Fréquence cardiaque
  (gen_random_uuid(), 'hr_avg', 'Fréquence cardiaque moyenne', 'bpm', 'AVG', 'ride'),
  (gen_random_uuid(), 'hr_max', 'Fréquence cardiaque maximale', 'bpm', 'MAX', 'ride'),
  
  -- Vitesse
  (gen_random_uuid(), 'speed_avg', 'Vitesse moyenne', 'km/h', 'AVG', 'ride'),
  (gen_random_uuid(), 'speed_max', 'Vitesse maximale', 'km/h', 'MAX', 'ride'),
  
  -- Altitude et terrain
  (gen_random_uuid(), 'elevation_gain', 'Dénivelé positif', 'm', 'SUM', 'ride'),
  (gen_random_uuid(), 'elevation_loss', 'Dénivelé négatif', 'm', 'SUM', 'ride'),
  
  -- Effort
  (gen_random_uuid(), 'kj_total', 'Kilojoules totaux', 'kJ', 'SUM', 'ride'),
  (gen_random_uuid(), 'tss', 'Training Stress Score', 'TSS', 'SUM', 'ride'),
  (gen_random_uuid(), 'if', 'Intensity Factor', 'IF', 'AVG', 'ride')
ON CONFLICT (key) DO NOTHING;
