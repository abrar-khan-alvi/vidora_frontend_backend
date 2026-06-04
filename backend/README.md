# Vidora Backend

Django + DRF + JWT API for Vidora. Runs in Docker (Postgres + Django). This is **Phase 0**:
authentication only. Generation (Claude/Higgsfield), credits, and media come next.

## Run

```bash
cd backend
cp .env.example .env          # already provided with dev defaults
docker compose up -d --build  # builds image, runs migrations, starts API
```

- API: **http://localhost:8001** (host port 8001 → container 8000; 8000 was in use locally)
- Postgres: localhost:5432 (db `vidora` / user `vidora` / pass `vidora`)
- Dev email (OTP codes) prints to the container console: `docker compose logs web -f`

First-time only, the initial migration is already committed. To create an admin user:

```bash
docker compose exec web python manage.py createsuperuser
```

Stop / reset:

```bash
docker compose down            # stop
docker compose down -v         # stop + wipe the database volume
```

## Auth API

Base path: `/api/auth/`

| Method | Path | Auth | Body | Purpose |
|--------|------|------|------|---------|
| POST | `register/` | – | `email, password, display_name?` | Create account (inactive), email a 5-digit code |
| POST | `verify-email/` | – | `email, code` | Activate the account |
| POST | `login/` | – | `email, password` | → `{ access, refresh, user }` |
| POST | `token/refresh/` | – | `refresh` | → `{ access }` |
| GET | `me/` | Bearer | – | Current user |
| POST | `password/forgot/` | – | `email` | Email a reset code (always 200) |
| POST | `password/verify/` | – | `email, code` | → `{ reset_token }` (valid 10 min) |
| POST | `password/reset/` | – | `reset_token, new_password` | Set a new password |

Authenticated requests send `Authorization: Bearer <access>`.

### Notes / decisions
- **Custom email user** (`accounts.User`, UUID pk); no username. Inactive until email-verified.
- **One-time codes** (`OneTimeCode`) are 5 digits, single-use, expire in `OTP_TTL_MINUTES` (10).
  Issuing a new code invalidates outstanding ones for the same purpose.
- **Password reset** is two-step: verifying the code returns a short-lived signed
  `reset_token` (Django `TimestampSigner`), which the final step exchanges for the password
  change — so the code is never replayed.
- `password/forgot/` never reveals whether an email is registered.
- Dev uses the console email backend; swap `EMAIL_BACKEND` + SMTP env for real email later.

## Maps to the frontend auth screens
`LandingPage → /signup (register) → /verify-email-signup (verify-email) → /login (login) → dashboard`,
and `/forgot-password (forgot) → /verify-email (verify) → /set-password (reset)`.
Wiring the React SPA to these endpoints is the next step.
