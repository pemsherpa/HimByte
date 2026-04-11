# Himbyte OS

**The Operating System for Nepal's Restaurants & Hotels**

A multi-tenant SaaS platform that digitizes hospitality operations through QR-based ordering, staff-approved workflows, and real-time kitchen display systems.

## Architecture

```
himbyte/
├── client/           # React + Vite frontend
├── server/           # Express.js backend API
├── supabase/         # Database migrations & seed data
├── shared/           # Shared types and constants
└── .env.example      # Environment variable template
```

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Lucide React, Zustand
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Real-time:** Supabase Realtime for live order updates
- **Design:** "Himalayan Modernism" — Terracotta, Saffron, and Cream palette with Mandala/Dhaka patterns

## Features

### Customer Interface (Mobile Web)
- QR-based landing that detects table or room context
- Visual menu with categories, search, and dietary filters
- Smart cart with special instructions
- Live order tracking (Pending → Approved → Cooking → Served)
- Hotel services: Towels, Cleaning, DND

### Merchant Dashboard (Staff/Admin)
- Real-time Order Gate: split-screen approval flow
- Kitchen Display System (KDS) with timer urgency
- Inventory toggle (on/off availability)
- Dashboard analytics

### Super Admin (Himbyte HQ)
- Tenant onboarding and management
- Subscription tracking
- Global revenue analytics
- VAT/PAN compliance fields (IRD-ready for 2026)

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### Setup

1. **Clone and install:**
   ```bash
   cd himbyte
   npm install --prefix client
   npm install --prefix server
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase URL and keys
   ```

3. **Initialize database:**
   - Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
   - Run `supabase/seed.sql` for demo data

4. **Start development:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Demo Routes
- **Homepage:** `/`
- **QR Landing:** `/scan?r=himalayan-kitchen&table=1`
- **Menu:** `/menu?r=himalayan-kitchen&table=1`
- **Hotel Services:** `/services?r=himalayan-kitchen&room=101`
- **Merchant Dashboard:** `/merchant`
- **Order Gate:** `/merchant/orders`
- **Kitchen KDS:** `/merchant/kitchen`
- **Super Admin:** `/admin`

## Nepal Market Compliance

Every restaurant tenant includes:
- `vat_registered` boolean for VAT compliance
- `pan_number` field for PAN/IRD registration
- 13% VAT auto-calculation for registered businesses
- NPR currency formatting

## Design: Himalayan Modernism

| Token | Color | Usage |
|-------|-------|-------|
| Terracotta | `#BC4A3C` | Primary actions, branding |
| Saffron | `#F4C430` | Highlights, pending states |
| Slate | `#2F2F2F` | Text, dark surfaces |
| Cream | `#FFFDD0` | Backgrounds |

Visual elements include Mandala-inspired SVG patterns and Dhaka Topi geometric patterns in the admin sidebar.

## License

Proprietary — Himbyte Pvt. Ltd.
