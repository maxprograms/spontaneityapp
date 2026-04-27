# Spontaneity

Spontaneity is a web application designed to help college students coordinate spontaneous meetups based on shared availability and location. The goal of the app is to make it easier for students to see when friends are free, compare schedules, and plan casual meetups without needing long group chats or back-and-forth messages.

## Live Demo

The deployed application is available here:

[Spontaneity Web App](https://spontaneityapp.vercel.app/)

> **Note:** Google sign-in is currently limited to approved test users because the application is still using a development/testing Google OAuth configuration. To request access, please contact the project team with the Google account email you would like to use.

## Features

- Google authentication for secure sign-in
- User profiles with name, email, role, bio, and profile image
- Availability and schedule management
- Google Calendar-based schedule integration
- Location/building-based availability information
- Role-based access control for regular users and admins
- Backend database management using Prisma and PostgreSQL
- Deployment through Vercel

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Next.js server functions / server-side queries
- **Authentication:** NextAuth with Google OAuth
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation/Configuration:** Zod and environment variables
- **Deployment:** Vercel

## Project Purpose

Many students have unpredictable schedules and often miss opportunities to meet with friends because it is difficult to know who is available at a given time. Spontaneity solves this by allowing users to manage their availability and quickly identify opportunities for casual meetups.

## Development Setup

Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root and add the required environment variables:

```env
DATABASE_URL="your-database-url"
AUTH_SECRET="your-auth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Generate the Prisma client:

```bash
npx prisma generate
```

Apply the Prisma schema to the database:

```bash
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Then open the application at:

```text
http://localhost:3000
```

## Project Structure

```text
src/
├── app/              # Application pages and routes
├── server/           # Server-side logic, auth, database, and queries
├── styles/           # Global styles

prisma/
├── schema.prisma     # Prisma database schema
```

## Notes

This project was developed as part of a software engineering course team project. The application uses the T3 stack with Next.js, NextAuth, Prisma, PostgreSQL, and Tailwind CSS.
