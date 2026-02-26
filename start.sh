#!/bin/sh
# Entrypoint script — guarantees $PORT is expanded by a real shell.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
