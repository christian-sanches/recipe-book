#!/bin/sh
# Run migrations and start server.
# --accept-data-loss: adding columns to existing tables (e.g. OAuth
# rotation chain) triggers Prisma's data-loss warning on db push.
npx --yes prisma@6.6.0 db push --accept-data-loss
exec node server.js
