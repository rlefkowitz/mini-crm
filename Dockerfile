# Stage 1: Build Frontend
FROM node:21.6.0-bullseye-slim AS frontend-build

# Set working directory for frontend
WORKDIR /mini-crm/frontend

# Copy frontend package files first for caching
COPY ./frontend/package.json ./frontend/yarn.lock ./

# Install frontend dependencies
RUN yarn install

# Copy the rest of the frontend source code and build
COPY ./frontend ./
RUN yarn build

# Stage 2: Build backend
FROM python:3.12.7-bookworm AS build

# Install py reqs
RUN pip3 install --upgrade pip
RUN mkdir -p /mini-crm
WORKDIR /mini-crm
COPY ./requirements.txt /mini-crm/requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# Initialize the app in dev mode
COPY . /mini-crm/

# Create static directory
RUN mkdir -p /mini-crm/static

# Copy built frontend assets from frontend-build stage to static directory
COPY --from=frontend-build /mini-crm/frontend/dist /mini-crm/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
