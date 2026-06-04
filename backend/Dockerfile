FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Default command is provided by docker-compose (runserver for dev).
CMD ["gunicorn", "vidora.wsgi:application", "--bind", "0.0.0.0:8000"]
