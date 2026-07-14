FROM python:3.11-slim

WORKDIR /app
RUN addgroup --system pitstop && adduser --system --ingroup pitstop pitstop
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
RUN mkdir -p /app/cache && chown -R pitstop:pitstop /app
USER pitstop
ENV PYTHONPATH=/app/src PYTHONUNBUFFERED=1
EXPOSE 8010
CMD ["uvicorn", "liveservice.main:app", "--host", "0.0.0.0", "--port", "8010"]
