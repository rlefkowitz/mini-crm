
# 📘 Mini CRM

Welcome to **Mini CRM**! This project serves as a straightforward customer relationship management tool with robust features like user authentication, dynamic database schema, and user-friendly object management. With an emphasis on an aesthetically pleasing interface that includes dark mode, Mini CRM delivers a sleek, modern user experience.

---

## ✨ Features

- **🔐 User Login and Authentication**: Secure authentication to ensure that only authorized users can access and interact with the CRM data.
- **🔧 Dynamic Database Schema**: Flexible database structure to support evolving customer data needs.
- **📊 Intuitive UI with Dark Mode**: Enjoy a visually pleasing interface, adaptable to your aesthetic preferences.
- **🖥️ Dockerized Backend and Yarn-Based Frontend**: Simplified deployment with containerization and a frontend that runs efficiently with Yarn.

---

## 🧑‍💻 Development Installation

### Backend Setup

For local development on a Unix system:

1. Clone the repository and set up the environment:

   ```bash
   make setup-environment
   source venv/bin/activate
   ```

   Ensure VSCode's Python interpreter points to `venv/`.

2. For non-Unix systems, clone and install dependencies manually:

   ```bash
   git clone https://github.com/your-username/mini-crm.git
   cd mini-crm
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### 🔗 Enable Git Hooks
Install necessary Python packages and activate Git hooks:

```bash
pip install -r requirements.txt
pre-commit install
```

---

## 🐳 Docker: Build and Run

To build and launch the Docker container:

```bash
make up
```

The service should now be live at: [http://localhost:<backend-port>](http://localhost:<backend-port>)

### API Documentation

Access API documentation at:
- Swagger: [http://localhost:<backend-port>/docs](http://localhost:<backend-port>/docs)
- ReDoc: [http://localhost:<backend-port>/redoc](http://localhost:<backend-port>/redoc)

The API Docker container mounts a volume from the current directory and runs `uvicorn` with the `--reload` flag. This enables live reloading, so any code changes on the host will immediately reflect in the running service.

---

## 🚀 Frontend Setup

1. **Navigate to the Frontend Directory**:

   ```bash
   cd frontend
   ```

2. **Install Dependencies and Start the Application**:

   ```bash
   yarn install
   yarn start
   ```

   This will launch the frontend, making it accessible at `http://localhost:3000` by default.

---

## ⚙️ Other Useful Commands

- **Tear Down Containers**:
  - `make down`: Destroy containers and volumes.
  - `make clean`: Destroy all containers, images, networks, and volumes! ⚠️
- **Build & Run**:
  - `make build`: Build the Docker image for the API.
- **Database & Requirements**:
  - `make regen-requirements`: Update and install requirements in `requirements.txt`.

📘 Refer to the [Makefile](Makefile) for detailed command explanations. You can also chain commands, e.g., `make clean build`, `make down up`, etc.

---
