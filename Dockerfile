# Gridiron Intel Sentiment Service Dockerfile
# Optimized for Railway deployment

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download DistilBERT model on build (faster cold starts)
RUN python -c "from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast; \
    DistilBertTokenizerFast.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english'); \
    DistilBertForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')" || \
    echo "Model download deferred to runtime"

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose default port (Railway may override via $PORT)
EXPOSE ${PORT}

# Health check — uses $PORT so it always matches the running server.
# start-period gives DistilBERT time to load on first boot.
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Default CMD (Railway overrides via railway.toml startCommand)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
