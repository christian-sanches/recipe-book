#!/bin/sh
# Run migrations and start server
npx --yes prisma@6.6.0 db push
exec node server.js
