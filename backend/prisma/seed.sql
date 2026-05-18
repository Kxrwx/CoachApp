-- Seed mis à jour et harmonisé avec l'application
INSERT INTO "Metric" (id, key, name, unit, "aggregationType", scope) VALUES
  
  -- Records de volumes uniques (Maxis)
  (gen_random_uuid(), 'ride_max_distance_km', 'Distance max sur une sortie', 'km', 'MAX', 'ride'),
  (gen_random_uuid(), 'ride_max_elevation_gain', 'Dénivelé max sur une sortie', 'm', 'MAX', 'ride'),
  (gen_random_uuid(), 'ride_max_duration_hours', 'Durée max sur une sortie', 'h', 'MAX', 'ride'),

  -- Puissances moyennes et maxis de base
  (gen_random_uuid(), 'power_avg', 'Puissance moyenne', 'W', 'AVG', 'ride'),
  (gen_random_uuid(), 'power_max', 'Puissance maximale', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'ftp', 'FTP (Functional Threshold Power)', 'W', 'MAX', 'static'),
  (gen_random_uuid(), 'ride_max_avg_watts', 'Puissance moyenne max sur une sortie', 'W', 'MAX', 'ride'),
  
  -- Courbe de puissance (Profil de Puissance Phénotypique)
  (gen_random_uuid(), 'power_3s', 'Puissance max 3 sec', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_30s', 'Puissance max 30 sec', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_1min', 'Puissance max 1 min', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_2min', 'Puissance max 2 min', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_5min', 'Puissance max 5 min', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_10min', 'Puissance max 10 min', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_20min', 'Puissance max 20 min', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_1h', 'Puissance max 1 heure', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_2h', 'Puissance max 2 heures', 'W', 'MAX', 'ride'),
  (gen_random_uuid(), 'power_4h', 'Puissance max 4 heures', 'W', 'MAX', 'ride'),

  -- Cadence, Cardiaque, Calories
  (gen_random_uuid(), 'cadence_avg', 'Cadence moyenne', 'rpm', 'AVG', 'ride'),
  (gen_random_uuid(), 'cadence_max', 'Cadence maximale', 'rpm', 'MAX', 'ride'),
  (gen_random_uuid(), 'hr_avg', 'Fréquence cardiaque moyenne', 'bpm', 'AVG', 'ride'),
  (gen_random_uuid(), 'hr_max', 'Fréquence cardiaque maximale', 'bpm', 'MAX', 'ride'),
  
  -- Vitesse et Altitude additionnelles
  (gen_random_uuid(), 'speed_avg', 'Vitesse moyenne', 'km/h', 'AVG', 'ride'),
  (gen_random_uuid(), 'speed_max', 'Vitesse maximale', 'km/h', 'MAX', 'ride'),
  
  -- Métriques avancées
  (gen_random_uuid(), 'kj_total', 'Kilojoules totaux', 'kJ', 'SUM', 'ride'),
  (gen_random_uuid(), 'tss', 'Training Stress Score', 'TSS', 'SUM', 'ride'),
  (gen_random_uuid(), 'if', 'Intensity Factor', 'IF', 'AVG', 'ride')
ON CONFLICT (key) DO NOTHING;