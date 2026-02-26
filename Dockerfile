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

# Make entrypoint executable
RUN chmod +x start.sh

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose default port
EXPOSE 8000

# Health check — shell form so $PORT expands at runtime
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start via shell script to guarantee $PORT expansion
CMD ["./start.sh"]
