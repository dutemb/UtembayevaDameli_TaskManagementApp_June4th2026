FROM python:3.12-slim

WORKDIR /app

# Install dependencies (cached unless requirements change).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the single app file.
COPY main.py .

EXPOSE 3001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
