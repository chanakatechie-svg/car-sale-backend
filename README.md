# Car Sale — Backend API

The REST API behind the **car-sale** Next.js site (`../car-sale`). It covers the public site (stock listing, vehicle detail, enquiry forms) and the admin panel (dashboard, vehicles, users, settings, enquiries).

**Stack:** NestJS 11 · TypeORM · PostgreSQL · JWT (passport-jwt) · class-validator · Swagger

---

## Quick start

```bash
cp .env.example .env          # then set JWT_SECRET
docker compose up -d          # Postgres on localhost:56432
npm install
npm run seed                  # settings lists, admin user, sample stock
npm run start:dev             # http://localhost:4000/api/v1
```

- Swagger docs: http://localhost:4000/api/docs (only available when not in production)
- Health check: http://localhost:4000/api/v1/health
- Seed admin: `admin@apexselect.co.uk` / `admin123`. Change it with `SEED_ADMIN_*` in `.env`.

> Postgres uses host port **56432** so it doesn't clash with the other local databases on 5432–5434.

---

## Project structure

```
src/
├── main.ts                    # bootstrap: prefix, CORS, helmet, validation, swagger, static /uploads
├── app.module.ts              # wires modules + global guards (throttle → JWT → roles)
├── config/
│   ├── configuration.ts       # typed config tree read from env
│   └── env.validation.ts      # fails fast on missing/invalid env vars
├── common/                    # cross-cutting, no business logic
│   ├── decorators/            # @Public(), @Roles(), @CurrentUser()
│   ├── guards/                # JwtAuthGuard (global), RolesGuard (global)
│   ├── filters/               # AllExceptionsFilter → consistent error JSON
│   ├── dto/                   # PaginationQueryDto
│   ├── entities/              # BaseEntity (uuid id, createdAt, updatedAt)
│   ├── enums/                 # UserRole, UserStatus
│   └── interfaces/            # JwtPayload, AuthUser, PaginatedResult
├── database/
│   ├── data-source.ts         # TypeORM CLI data source (migrations)
│   ├── migrations/
│   └── seeds/                 # seed.ts + data/ (copied from the frontend mock data)
└── modules/
    ├── auth/                  # login, me, change password
    ├── users/                 # admin user management
    ├── vehicles/              # public listing + admin CRUD
    ├── settings/              # admin-managed dropdown lists
    ├── enquiries/             # test drive / part-ex / finance / general leads
    ├── dashboard/             # admin stats
    ├── uploads/               # vehicle image uploads
    └── health/
```

**Conventions**

- Each feature module has a **public controller** (`vehicles.controller.ts` → `/vehicles`) and an **admin controller** (`admin-vehicles.controller.ts` → `/admin/vehicles`). The admin controllers map one-to-one onto the frontend's `app/admin/*` pages and `components/admin/*` modals.
- Every route needs a JWT by default. Public routes opt out with `@Public()`, and admin routes restrict access with `@Roles(...)`.
- Response shapes match the frontend types in `car-sale/src/redux/**/*Types.ts`, so the Redux slices can switch from mock data to `fetch` with little change.

---

## API reference

All routes are prefixed with `/api/v1`.

### Public (website)

| Method | Route | Used by |
|---|---|---|
| GET | `/vehicles` | `/vehicles` page. Query: `search, make, minPrice, maxPrice, yearFrom, yearTo, fuelTypes, transmissions, bodyTypes, featured, vehicleStatus, sortBy (newest\|price-low\|price-high\|mileage), page, limit (default 9)` |
| GET | `/vehicles/featured?limit=6` | Home page featured vehicles |
| GET | `/vehicles/:id` | Vehicle detail page |
| GET | `/vehicles/:id/similar` | Related cars on the detail page |
| GET | `/settings` | `{ makes, bodyTypes, fuelTypes, transmissions }` for search and filters |
| POST | `/enquiries` | Contact (test drive), Part Exchange and Finance forms. `type`: `test_drive\|vehicle\|finance\|part_exchange\|general` |
| POST | `/auth/login` | `/admin/login` page. Returns `{ accessToken, user }` |

### Admin (`Authorization: Bearer <token>`)

| Method | Route | Roles | Frontend |
|---|---|---|---|
| GET | `/auth/me` · PATCH `/auth/password` | any | session |
| GET | `/admin/dashboard` | any | `app/admin/page.tsx` stat cards, top makes, fuel types |
| GET/POST | `/admin/vehicles` | any | `app/admin/vehicles` + `vehicle-form-modal` |
| GET/PATCH | `/admin/vehicles/:id` | any | edit modal |
| PATCH | `/admin/vehicles/:id/featured/:bool` · `/status/:sold\|unsold` | any | quick toggles |
| DELETE | `/admin/vehicles/:id` | admin, manager | `delete-confirm-modal` |
| POST | `/admin/uploads/images` (multipart `files[]`) | any | image uploader. Returns `{ urls }` |
| GET/POST | `/admin/users` · PATCH/DELETE `/admin/users/:id` | admin | `app/admin/users` + `user-form-modal` |
| POST | `/admin/settings/:list` `{ value }` | admin, manager | `app/admin/settings`: `addOption` |
| DELETE | `/admin/settings/:list/:value` | admin, manager | `removeOption` |
| PATCH | `/admin/settings/:list/reorder` `{ from, to }` | admin, manager | `reorderOption` |
| GET | `/admin/enquiries` · GET/PATCH/DELETE `/admin/enquiries/:id` | any (delete: admin, manager) | leads inbox (no frontend page yet) |

Paginated responses look like `{ data: T[], meta: { page, limit, total, totalPages } }`.
Errors look like `{ statusCode, message, error, path, timestamp }`.

### Business rules

- A vehicle's `make`, `fuelType`, `transmission` and `bodyType` must exist in the Settings lists. Add a new make in Settings before using it.
- `image` is always kept equal to `images[0]`.
- Users can't delete, deactivate or change the role of their own account, and the last admin can't be removed.
- Creating a user without a `password` generates a `temporaryPassword` and returns it **once** in the response.
- Deactivated users are rejected on their next request, not only when their token expires.
- Login and enquiry submission are limited to 5 requests per minute per IP. Everything else is limited to 100 per minute.

---

## Database

In development, `DB_SYNCHRONIZE=true` updates the schema automatically from the entities. For production, set it to `false` and use migrations:

```bash
npm run migration:generate -- src/database/migrations/Init
npm run migration:run
```

## Scripts

| Script | |
|---|---|
| `start:dev` | watch mode |
| `build` / `start:prod` | compile to `dist/` and run |
| `typecheck` | `tsc --noEmit` |
| `seed` | idempotent seed |
| `test` | jest |
