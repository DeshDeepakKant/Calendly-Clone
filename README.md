# Calendly Clone

A full-stack scheduling and booking platform that enables users to create event types, manage availability, and share booking links for seamless appointment scheduling.

## Overview

This application replicates core Calendly functionality, allowing users to set up customizable event types, define their availability windows, and share public booking links. Visitors can select available time slots based on the user's schedule, with automatic conflict detection and email notifications.

## Features

- **Event Type Management** - Create custom event types with configurable durations (15-120 minutes) and color coding
- **Availability Scheduling** - Define weekly availability with timezone support (Asia/Kolkata)
- **Public Booking Links** - Share personalized URLs for each event type
- **Time Slot Selection** - Calendar-based interface with real-time availability checking
- **Conflict Detection** - Prevents double-booking across all event types
- **Meeting Dashboard** - View and manage all scheduled meetings
- **Email Notifications** - Automated booking confirmations via Gmail SMTP
- **Responsive Design** - Mobile-first UI built with Tailwind CSS

## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- React Calendar

**Backend**
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL

**Email**
- Nodemailer with Gmail SMTP

## Setup & Installation

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or hosted)
- Gmail account with App Password (for email notifications)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/DeshDeepakKant/Calendly-Clone.git
   cd Calendly-Clone
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables**

   Create `.env` files with the following configuration:

   **server/.env**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/calendly"
   HOST_EMAIL="your-email@gmail.com"
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="your-16-char-app-password"
   ```

   **client/.env.local**
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   ```

   > **Note:** `.env` files are required for local development but are **NOT** committed to the repository.

4. **Set up the database**
   ```bash
   cd server
   npx prisma db push
   npm run seed
   ```

5. **Run the development servers**

   Open two terminal windows:

   **Terminal 1 - Backend**
   ```bash
   cd server
   npm start
   ```

   **Terminal 2 - Frontend**
   ```bash
   cd client
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin
   - API Health Check: http://localhost:4000/health

## Environment Variables

### Server (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `HOST_EMAIL` | Email address shown in notifications | Yes |
| `GMAIL_USER` | Gmail account for sending emails | Yes |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not regular password) | Yes |

### Client (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

> **Important:** Environment files (`.env`, `.env.local`) contain sensitive credentials and are **never** committed to version control.

## Project Structure

```
Calendly-Clone/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/      # Admin dashboard for event/availability management
│   │   │   ├── [user]/[slug]/  # Public booking pages
│   │   │   ├── page.tsx    # Home page
│   │   └── components/     # Reusable React components
│   └── package.json
│
├── server/                 # Express backend API
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── src/
│   │   ├── index.js        # Server entry point
│   │   ├── routes.js       # API route definitions
│   │   ├── seed.js         # Database seeding script
│   │   └── services/       # Business logic (email, etc.)
│   └── package.json
│
├── API_DOCUMENTATION.md    # API endpoint documentation
└── README.md
```

## Default Configuration

- **Admin User ID:** 1 (no authentication implemented)
- **Default Timezone:** Asia/Kolkata
- **Default Availability:** Monday-Friday, 9:00 AM - 5:00 PM

## Deployment

The application is configured for Railway deployment with `railway.json` files in both client and server directories.

### Railway Deployment Steps

1. Push code to GitHub
2. Create a new Railway project from your GitHub repository
3. Add a PostgreSQL database service
4. Deploy the `server` folder with all environment variables configured
5. Deploy the `client` folder with `NEXT_PUBLIC_API_URL` pointing to your backend URL

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API endpoint information.

## License

MIT
