FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system pitstop && adduser --system --ingroup pitstop pitstop

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN chown -R pitstop:pitstop /app

USER pitstop

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "pitstop.pipeline"]