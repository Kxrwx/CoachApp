# Guide d'Initialisation PostgreSQL - CoachApp

## 1. Créer les Métriques de Base

Exécute ce script SQL après avoir créé les tables Prisma:

```sql
-- Seed des métriques de base pour CoachApp (Cyclisme)
-- À exécuter après: npx prisma migrate deploy

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
```

## 2. Architecture Refactorisée des Objectifs

### Deux Types d'Objectifs

#### A. **Template-Based** (métrique fixe par le template)
- Sélectionner un template pré-défini
- Backend défini automatiquement la métrique
- Valeur cible calculée par le template

**Workflows:**
- `/goals/templates` → Liste des templates disponibles
- `/goals/templates/evaluate` → Calcule la valeur cible
- `POST /goals` avec `templateId` → Crée l'objectif

#### B. **Free** (objectif personnalisé)
- Ajouter manuellement les indicateurs
- Choisir n'importe quelle métrique
- Spécifier la valeur cible librement
- N'utilise pas les PersonalRecords

**Workflows:**
- `POST /goals` avec `targets[]` → Crée l'objectif

### Templates Disponibles

Les templates sont associés à une métrique fixe et utilisent les PersonalRecords pour calculer la valeur:

| Template ID | Métrique | Type | Description |
|---|---|---|---|
| `dist_80_percent_pr` | distance_km | pr_percentage | 80% du record personnel |
| `dist_monthly_plus_10` | distance_km | monthly_growth | +10% vs mois dernier |
| `dist_monthly_plus_20` | distance_km | monthly_growth | +20% vs mois dernier |
| `dist_quarterly_avg_plus_5` | distance_km | quarterly_average_growth | Moyenne 3 mois + 5% |
| `power_80_percent_pr` | power_max | pr_percentage | 80% du record de puissance |
| `power_90_percent_pr` | power_max | pr_percentage | 90% du record de puissance |
| `ftp_85_percent` | ftp | pr_percentage | 85% FTP (zone SST) |
| `ftp_95_percent` | ftp | pr_percentage | 95% FTP (zone VO2) |
| `duration_plus_15` | duration_hours | duration_growth_absolute | +15 min vs mois dernier |
| `duration_plus_30` | duration_hours | duration_growth_absolute | +30 min vs mois dernier |

## 3. Flux de Création d'Objectif

### Mode Template-Based

```
1. GET /goals/templates
   → Affiche les templates avec descriptions

2. User clique sur un template
   → handlePickTemplate(templateId)

3. POST /goals/templates/evaluate
   {
     "templateId": "dist_80_percent_pr",
     "metricId": "uuid-distance-km"
   }
   → Backend évalue le template
   → Retourne: { suggestedValue: 120, metricId: "uuid", context: "..." }

4. POST /goals
   {
     "name": "Distance: 80% du PR",
     "startDate": "2025-01-01",
     "endDate": "2025-12-31",
     "templateId": "dist_80_percent_pr"
   }
   → Backend:
     - Récupère le template
     - Évalue la métrique et valeur
     - Crée Goal avec type="template"
     - Crée GoalTarget avec metricId + targetValue calculée
```

### Mode Free

```
1. User clique "Créer objectif personnalisé"
   → handleAddFreeTarget()

2. User remplit les champs:
   - Nom: "Puissance surpuissance"
   - Métriques: power_max: 350W
   - Dates: 01/01 - 31/01

3. POST /goals
   {
     "name": "Puissance surpuissance",
     "startDate": "2025-01-01",
     "endDate": "2025-01-31",
     "targets": [
       { "metricId": "uuid-power-max", "targetValue": 350 }
     ]
   }
   → Backend:
     - Crée Goal avec type="custom"
     - Crée GoalTarget sans calcul
```

## 4. Requêtes API Principales

### GET /goals/templates
```json
[
  {
    "id": "dist_80_percent_pr",
    "name": "80% du record perso",
    "description": "Fixe l'objectif à 80% de votre meilleur enregistrement",
    "templateType": "pr_percentage",
    "metricId": "uuid-distance-km",
    "metricName": "distance_km",
    "percentage": 80
  },
  ...
]
```

### POST /goals/templates/evaluate
**Request:**
```json
{
  "templateId": "dist_monthly_plus_10",
  "metricId": "uuid-distance-km"
}
```

**Response:**
```json
{
  "suggestedValue": 198,
  "metricId": "uuid-distance-km",
  "context": "Moyenne du mois dernier: 180 km. Avec +10% = 198 km."
}
```

### POST /goals (Template-Based)
**Request:**
```json
{
  "name": "Augmenter distance",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "templateId": "dist_monthly_plus_10"
}
```

**Response:**
```json
{
  "id": "goal-uuid",
  "userId": "user-uuid",
  "name": "Augmenter distance",
  "type": "template",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "isActive": true,
  "targets": [
    {
      "id": "target-uuid",
      "goalId": "goal-uuid",
      "metricId": "uuid-distance-km",
      "targetValue": 198,
      "metric": {
        "id": "uuid-distance-km",
        "key": "distance_km",
        "name": "Distance totale (km)",
        "unit": "km"
      }
    }
  ]
}
```

### POST /goals (Free)
**Request:**
```json
{
  "name": "Objectif personnalisé",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "targets": [
    {
      "metricId": "uuid-power-max",
      "targetValue": 350
    },
    {
      "metricId": "uuid-distance-km",
      "targetValue": 500
    }
  ]
}
```

## 5. Données Enrichies (GET /goals)

```json
{
  "id": "goal-uuid",
  "name": "Augmenter distance",
  "type": "template",
  "isActive": true,
  "targets": [
    {
      "id": "target-uuid",
      "metricId": "uuid-distance-km",
      "targetValue": 198,
      "metric": {
        "id": "uuid-distance-km",
        "key": "distance_km",
        "name": "Distance totale (km)",
        "unit": "km"
      },
      "currentValue": 150,
      "progressPercent": 76,
      "recordValue": 220
    }
  ]
}
```

Les `currentValue`, `progressPercent`, `recordValue` proviennent de:
- **PersonalRecords**: meilleur enregistrement pour la métrique
- **ComputedMetrics**: valeur agrégée pour la période courante

## 6. Déploiement

1. Migrer la DB: `npx prisma migrate deploy`
2. Exécuter le seed SQL ci-dessus
3. Démarrer l'application: `npm run start`

---

**Différence clé**: Avec la refonte, les templates **fixent la métrique**. L'utilisateur ne choisit plus où les templates s'appliquent — chaque template a sa propre métrique pré-assignée. Cela rend l'UX plus simple et plus prévisible.
