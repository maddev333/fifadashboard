# FIFA World Cup Operations Website Specification

## 1. Recommended solution

Build a **static operations website** hosted on **Azure Static Web Apps**, with:
- **Azure Maps Web SDK** for the live map
- **Azure Functions** for secure API access and feed aggregation
- **JSON data files** or **Cosmos DB / Table Storage** for operational data
- optional **Power BI embed** for advanced analytics

This gives you:
- fast front end
- mobile access
- interactive mapping
- controlled API key exposure
- room to grow into a real ops platform

---

## 2. High-level architecture

### Front end
Use one of these:
- **Best simple option:** React + Vite
- **Best enterprise option:** Next.js static export where possible
- **Lightest option:** plain HTML/CSS/JS

Recommended:
- **React + Vite**
- Tailwind or simple CSS modules
- Chart.js or ECharts for KPI visuals

### Hosting
- **Azure Static Web Apps**

### Backend/API layer
- **Azure Functions**
  - weather proxy
  - traffic/incidents proxy
  - news/social aggregation
  - alert ingestion
  - admin save/update endpoints

### Data sources
Possible inputs:
- venue list
- match schedule
- staffing assignments
- incident feed
- weather feed
- traffic feed
- public advisories/news
- optional social monitoring feed

### Storage
Start simple:
- `/data/*.json` for static demo data

Scale later:
- **Azure Blob Storage** for JSON files
- **Azure Table Storage** for lightweight records
- **Cosmos DB** for richer event/alert objects

---

## 3. Core site pages

## A. Operations Dashboard
Purpose:
- command-center summary page

Components:
- top alert banner
- KPI cards:
  - matches today
  - active venues
  - open incidents
  - weather warnings
  - staffing gaps
- mini map preview
- latest alerts list
- today’s schedule summary
- venue status table
- staffing coverage summary

Suggested layout:
- header
- alert strip
- KPI row
- left: map
- right: alerts/feed
- bottom: venue ops + staffing tables

---

## B. Live Map
Purpose:
- primary situational awareness screen

Layers:
- stadiums/venues
- match locations
- hotel/basecamp/operations centers
- staff deployment zones
- incidents
- traffic
- weather radar or warnings
- road closures
- emergency services/public advisories

Map interactions:
- filter by date
- filter by venue
- filter by incident severity
- toggle layers on/off
- click marker for details
- show travel routes and ETAs
- clustering for dense points

Azure Maps features to use:
- bubbles/symbol layers
- popups
- data-driven styling
- route visualization
- heatmaps if needed

---

## C. Match Operations
Purpose:
- operational detail for each game day

Sections:
- match list by date
- venue readiness status
- transport plan
- broadcaster/coverage details
- local risk conditions
- staffing assignments
- escalation contact list

Useful filters:
- day
- city
- venue
- stage/group
- risk level

---

## D. Intelligence Feed
Purpose:
- consolidated monitoring stream

Cards/panels:
- public advisories
- weather alerts
- transport updates
- news headlines
- social mentions
- incident reports
- venue-specific updates

Recommended feed behavior:
- newest first
- severity color coding
- source badge
- venue/city tags
- filter by source/type

---

## E. Staffing / Workforce Dashboard
Purpose:
- replace Excel staffing summary with a usable web dashboard

Components:
- staffing coverage by day
- open shifts / unfilled assignments
- employee utilization
- lead assignments
- weekend load
- backup coverage suggestions

Views:
- summary
- by employee
- by venue
- by date

---

## F. Admin / Edit Mode
Purpose:
- controlled updates without touching code

Functions:
- manage venues
- update schedules
- post alerts
- update staffing assignments
- enable/disable feed sources
- edit contact/escalation list

Security:
- Azure AD / Entra ID login
- role-based access:
  - viewer
  - operator
  - admin

---

## 4. Recommended navigation

Top nav:
- Dashboard
- Live Map
- Match Ops
- Intelligence Feed
- Staffing
- Admin

Secondary controls:
- date selector
- venue selector
- country/city filter
- severity filter
- refresh button

---

## 5. Data model

## A. Venue
```json
{
  "id": "mexico-city-stadium",
  "name": "Mexico City Stadium",
  "city": "Mexico City",
  "country": "Mexico",
  "lat": 19.4326,
  "lng": -99.1332,
  "capacity": 80000,
  "status": "ready",
  "riskLevel": "medium"
}
```

## B. Match
```json
{
  "id": "match-001",
  "date": "2026-06-11",
  "stage": "Group Stage",
  "group": "A",
  "homeTeam": "Mexico",
  "awayTeam": "South Africa",
  "venueId": "mexico-city-stadium",
  "timeLocal": "15:00",
  "timeET": "16:00",
  "broadcaster": "FOX"
}
```

## C. Incident
```json
{
  "id": "inc-1001",
  "timestamp": "2026-06-11T14:05:00Z",
  "type": "traffic",
  "severity": "high",
  "title": "Major congestion near venue perimeter",
  "description": "Heavy inbound traffic causing delays.",
  "venueId": "mexico-city-stadium",
  "lat": 19.43,
  "lng": -99.14,
  "status": "open",
  "source": "Traffic API"
}
```

## D. Staffing assignment
```json
{
  "id": "asg-2001",
  "employeeName": "Jordan Lee",
  "role": "Field Operations",
  "date": "2026-06-11",
  "venueId": "mexico-city-stadium",
  "shift": "AM",
  "assignmentType": "Game Coverage",
  "lead": false,
  "status": "assigned"
}
```

## E. Alert
```json
{
  "id": "alt-3001",
  "timestamp": "2026-06-11T13:30:00Z",
  "severity": "critical",
  "title": "Weather advisory issued",
  "message": "Thunderstorm watch for venue district.",
  "scope": "venue",
  "venueId": "mexico-city-stadium",
  "recommendedAction": "Monitor lightning protocol."
}
```

---

## 6. Suggested folder structure

```text
world-cup-ops-site/
  public/
    data/
      venues.json
      matches.json
      staffing.json
      incidents.json
      alerts.json
    icons/
    images/
  src/
    components/
      Header.jsx
      KpiCard.jsx
      AlertBanner.jsx
      MapPanel.jsx
      FeedList.jsx
      VenueStatusTable.jsx
      StaffingTable.jsx
      FiltersBar.jsx
    pages/
      Dashboard.jsx
      LiveMap.jsx
      MatchOps.jsx
      IntelligenceFeed.jsx
      Staffing.jsx
      Admin.jsx
    services/
      azureMaps.js
      api.js
      transforms.js
    hooks/
      useAlerts.js
      useMatches.js
      useMapLayers.js
    styles/
    App.jsx
    main.jsx
  api/
    weather.js
    traffic.js
    incidents.js
    alerts.js
    admin-save.js
  package.json
```

---

## 7. Azure Maps integration design

Use Azure Maps for:
- venue markers
- incident markers
- routing overlays
- travel-time visualization
- geofenced zones
- weather/traffic overlays where supported by your data flow

Map layer ideas:
- **Venue layer**: stadium markers
- **Incident layer**: color by severity
- **Traffic layer**: congestion/closures
- **Weather layer**: warnings/conditions
- **Staffing layer**: assigned resources by venue
- **Route layer**: airport/hotel/venue movement paths

Popup example:
- venue name
- match start time
- staffing status
- incident count
- weather status
- latest alert

---

## 8. Security model

For production:
- do **not** expose sensitive keys in front-end code
- keep Azure Maps subscription and third-party secrets behind Functions where needed
- use:
  - **Microsoft Entra ID**
  - Static Web Apps auth
  - role-based access control

Roles:
- **Viewer**: read-only
- **Operator**: update incidents/alerts
- **Admin**: manage master data and feeds

---

## 9. Phased build plan

## Phase 1: MVP
- static site shell
- dashboard page
- live map page
- schedule and venue data from JSON
- staffing summary from your Excel-derived data
- manual alerts panel

## Phase 2: Operational feeds
- Azure Functions
- weather integration
- traffic/incidents integration
- unified feed panel
- filterable alerts

## Phase 3: Admin workflows
- login/auth
- admin edit forms
- save updates to storage
- audit history

## Phase 4: Advanced ops
- routing/ETA
- mobile optimization
- push alerts
- Power BI embeds
- richer analytics and trend views

---

## 10. How the current workbook maps into the website

From the workbook:
- **Schedule** -> Match Ops page
- **Game Map / 3D Map Data** -> Live Map source data
- **Assignment Matrix** -> Staffing page
- **Coverage Summary** -> Dashboard KPIs + staffing risk widgets
- **Inputs** -> Admin/config page
- **Dashboard** -> web homepage layout inspiration

---

## 11. Recommended MVP screens

If building version 1, start with these 4 screens:

1. **Dashboard**
   - KPIs
   - today’s matches
   - open alerts
   - venue readiness

2. **Live Map**
   - venues
   - incidents
   - filters
   - popups

3. **Staffing**
   - assignment coverage
   - gaps
   - employee load summary

4. **Match Ops**
   - schedule table
   - venue-by-venue operational view

---

## 12. Best technical recommendation

For a modern, fast, extensible implementation, use:

- **React + Vite**
- **Azure Static Web Apps**
- **Azure Maps Web SDK**
- **Azure Functions**
- **JSON now, Cosmos DB later**
