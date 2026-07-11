FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system pitstop && adduser --system --ingroup pitstop pitstop

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p models mlruns && chown -R pitstop:pitstop /app

USER pitstop

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "mlservice.api.main:app", "--host", "0.0.0.0", "--port", "8000"]