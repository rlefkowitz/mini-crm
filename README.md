
# 📘 Mini CRM

Welcome to **Mini CRM**! This project serves as a straightforward customer relationship management tool with robust features like user authentication, dynamic database schema, and user-friendly object management. With an emphasis on an aesthetically pleasing interface that includes dark mode, Mini CRM delivers a sleek, modern user experience.

---

## ✨ Features

- **🔐 User Login and Authentication**: Secure authentication to ensure that only authorized users can access and interact with the CRM data.
- **🔧 Dynamic Database Schema**: Flexible database structure to support evolving customer data needs.
- **📊 Intuitive UI with Dark Mode**: Enjoy a visually pleasing interface, adaptable to your aesthetic preferences.
- **🖥️ Dockerized Backend and Yarn-Based Frontend**: Simplified deployment with containerization and a frontend that runs efficiently with Yarn.

---

## 🚀 Getting Started

### Prerequisites
Ensure you have Docker installed for the backend and Yarn for the frontend. Check the [attached README](README.md) for additional requirements if necessary.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/mini-crm.git
   cd mini-crm
   ```

2. **Backend Setup**:
   - Use Docker to set up the backend environment. Refer to the backend instructions in the [README](README.md) for detailed steps.

3. **Frontend Setup**:
   - Navigate to the frontend directory and install dependencies:
     ```bash
     cd frontend
     yarn install
     yarn start
     ```

   This will launch the frontend, making it accessible at `http://localhost:3000` by default.

---

## 🐳 Running with Docker

To bring up the complete application:

```bash
docker-compose up --build
```

Once the containers are built, the service will be accessible at `http://localhost:<backend-port>`.

---

## 📜 Additional Documentation

- For further instructions and specific commands, please refer to the original [README](README.md).
- Any setup beyond basic installation can be found within the [Dockerfile](Dockerfile) and [Makefile](Makefile).

### ✨ Happy CRM Building!
