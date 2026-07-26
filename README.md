# DocTrack Pinas (MedFolio)

> A modern electronic medical record (EMR) and clinic management platform built for Filipino healthcare providers.

DocTrack Pinas streamlines the entire patient journey—from registration and appointment scheduling to consultations, prescriptions, laboratory records, billing, and audit trails—all within a secure, cloud-based platform.

Designed for private clinics, family physicians, specialists, and small healthcare facilities, MedFolio replaces paper records and disconnected spreadsheets with a fast, intuitive, and secure digital workflow.

---

## ✨ Why MedFolio?

Many small and medium-sized clinics in the Philippines still rely on paper charts or fragmented systems. MedFolio was built to provide an affordable, modern alternative that helps healthcare providers:

- Reduce paperwork
- Improve patient record management
- Speed up consultations
- Organize appointments
- Maintain complete medical histories
- Secure patient information through role-based access and Row Level Security
- Access records anywhere through a responsive web application

---

# Features

## 🏥 Patient Management

- Comprehensive patient profiles
- Medical history
- Allergies
- Family history
- Contact information
- Emergency contacts
- Patient search with instant filtering

---

## 🩺 Consultations

A dedicated consultation workspace built around real clinical workflows.

Features include:

- SOAP Notes
- Chief Complaint
- History of Present Illness
- Physical Examination
- Diagnosis
- Treatment Plan
- Vitals recording
- Follow-up recommendations

---

## 💊 Digital Prescriptions

Generate prescriptions directly during consultations.

Supports:

- Multiple medications
- Dosage instructions
- Frequency
- Duration
- Printable prescription output

---

## 🧪 Laboratory Records

Store and manage:

- Laboratory requests
- Laboratory results
- Attached documents
- Historical records

---

## 📅 Appointment Management

- Calendar scheduling
- Patient check-in
- Consultation workflow
- Appointment completion tracking
- Status management

---

## 📊 Dashboard & Analytics

Real-time clinic insights including:

- Appointment trends
- Consultation statistics
- Daily activity
- Patient volume
- Operational metrics

---

## 🔍 Global Search

Quickly search across:

- Patients
- Consultations
- Appointments
- Clinics

Available anywhere using:

```
Ctrl + K
```

or

```
⌘ + K
```

---

## 🔒 Security

Built with security as a first-class feature.

- Supabase Authentication
- PostgreSQL
- Row Level Security (RLS)
- Protected server operations
- Secure API architecture

---

# Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React 19 |
| Framework | TanStack Start |
| Routing | TanStack Router |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Security | Row Level Security |
| Deployment | Vercel |

---

# Screenshots

> Add screenshots here.

Recommended images:

- Dashboard
- Patient List
- Patient Profile
- Consultation Screen
- Appointment Calendar
- Prescription
- Analytics Dashboard

Example:

```
docs/
    dashboard.png
    consultation.png
    patients.png
    appointments.png
```

Then embed them:

```md
## Dashboard

![Dashboard](docs/dashboard.png)
```

---

# Local Development

Requires **Node.js 20+**

```bash
npm install

cp .env.example .env

npm run dev
```

Application runs at:

```
http://localhost:3000
```

---

# Demo Data

A demo dataset is included to quickly explore the application.

It creates:

- Sample clinic
- Filipino patient records
- Consultations
- Prescriptions
- Vitals
- Appointments

Steps:

1. Create a Supabase account
2. Sign in once through the application
3. Replace the placeholder UUID inside:

```
supabase/seed-demo.sql
```

4. Execute the SQL script
5. Refresh the application

---

# Database

Database schema is managed through SQL migrations located in:

```
supabase/migrations/
```

Apply migrations using the Supabase CLI:

```bash
supabase db push
```

---

# Environment Variables

| Variable | Description |
|-----------|-------------|
| VITE_SUPABASE_URL | Public Supabase URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public API Key |
| SUPABASE_SERVICE_ROLE_KEY | Server-only service key |

---

# Deployment

Deploy directly to Vercel.

```bash
npm run build

npm run start
```

Every push automatically redeploys when connected to GitHub.

---

# Project Structure

```
src/
    routes/
    components/
    integrations/
    lib/

supabase/
    migrations/
    seed-demo.sql
```

---

# Roadmap

- Multi-clinic support
- Inventory & pharmacy module
- Billing & insurance integration
- Laboratory portal
- Dental records
- Mobile-responsive PWA
- SMS appointment reminders
- Patient portal
- Electronic signatures
- AI-assisted clinical documentation

---

# License

This project is intended for educational, demonstration, and portfolio purposes.