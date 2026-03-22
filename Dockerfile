FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create DB directory
RUN mkdir -p /data

ENV DATABASE_PATH=/data/ultima.db
ENV PORT=8000
ENV JWT_SECRET=change-me-in-production

EXPOSE 8000

CMD ["python", "server.py", "--seed"]
