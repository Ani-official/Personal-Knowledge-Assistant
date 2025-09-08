# -------------------------------
# Stage 1: Build dependencies
# -------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies needed for building packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy requirements and install into /install directory
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# -------------------------------
# Stage 2: Final image
# -------------------------------
FROM python:3.11-slim

WORKDIR /app

# Create a non-root user
RUN useradd -m appuser

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy backend code
COPY . .

# Switch to non-root user
USER appuser

# Expose FastAPI port
EXPOSE 8000

# Optional: healthcheck for Render
HEALTHCHECK CMD curl --fail http://localhost:8000/health || exit 1

# Run Gunicorn with Uvicorn workers
CMD ["gunicorn", "main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000"]
