FROM python:3.13-slim-bookworm AS base

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libpng-dev gcc build-essential python3-dev \
    libjpeg-dev zlib1g-dev libfreetype6-dev liblcms2-dev libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt


# Development stage
FROM base AS development

COPY . .

EXPOSE 8080
CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]


# Production stage
FROM base AS production

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "project.wsgi:application"]
