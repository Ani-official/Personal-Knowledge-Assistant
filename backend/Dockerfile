# Use a lightweight Python base image
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy backend files into the container
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port FastAPI will run on
EXPOSE 8000

# Start the FastAPI server (adjust if main.py has a different name)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
