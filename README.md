
<div align="center">
  <h1>🎓 WannaWork - Backend API</h1>

  <p>
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest" />
    <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=Swagger&logoColor=black" alt="Swagger" />
  </p>

  <p><em>RESTful API for the WannaWork platform - Software Engineering Course (UniTN A.Y. 2025/2026)</em></p>
</div>

---

This repository contains the backend service for the **WannaWork** platform. It provides a secure, decoupled, and stateless communication layer for the Vue.js Single Page Application, handling multi-tenant authentication (Students and Employers), job offers, availability profiles, and job applications.

## 🚀 Tech Stack

* **Core Framework:** Node.js, Express.js
* **Database:** MongoDB, Mongoose ODM
* **Security & Auth:** JSON Web Tokens (JWT), bcryptjs, CORS
* **Mailing:** Nodemailer (via Brevo SMTP)
* **Testing:** Jest, Supertest *(62+ automated tests, 100% pass rate)*
* **API Documentation:** Swagger UI, OpenAPI 3.0

---

## 🛠️ How to run locally

### 1. Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [MongoDB](https://www.mongodb.com/) (running locally, or use a MongoDB Atlas URI)

### 2. Clone and Install
Clone the repository and install the required dependencies:
```bash
git clone https://github.com/StefanoVidesott/WannaWork_App.git
cd WannaWork_App
npm install
```

### 3. Configure the `.env` File

Copy the example environment file to create your own configuration:

```bash
cp .env.example .env
```

> [!NOTE]
> The repository includes `.env.example` as a template. Your actual `.env` file is excluded from version control (via `.gitignore`) to prevent accidentally committing sensitive information.

Edit the `.env` file with the editor of your choice and fill in the required values:

```env
# Server
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/wannawork # Or your Atlas URI

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key
EMAIL_SECRET=your_super_secret_email_key

# Email SMTP (e.g., Brevo)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM=no-reply@wannawork.com
```

### 4. Start the Server

You can start the server in different modes:

* **Development mode** (with hot-reload via `nodemon`):
```bash
npm run dev
```


* **Production mode**:
```bash
npm start
```



The server will start at `http://localhost:8080` (or the port specified in your `.env`).

---

## 🧪 Testing

The project is covered by a comprehensive suite of automated unit and integration tests. The database and external services (like emails) are entirely mocked during tests to prevent data corruption and ensure deterministic results.

To run the test suite:

```bash
npm test
```

---

## 📚 API Documentation

The API endpoints are formally documented using the **OpenAPI 3.0 Specification (OAS3)**.
Once the server is running, you can interactively explore and test the endpoints via the built-in Swagger UI at:

👉 **`http://localhost:8080/api/v1/docs`**

---

## 📂 Project Structure

A brief overview of the core application structure:

```text
WannaWork_App/
├── app/
│   ├── config/       # Database connection setup
│   ├── middleware/   # JWT verification, Role checks, Input validation
│   ├── models/       # Mongoose Schemas (Student, Employer, Offer, etc.)
│   ├── routes/       # Express route controllers
│   ├── tests/        # Jest test suites (*.test.js)
│   ├── utils/        # Utility functions (e.g., emailService)
│   └── server.js     # Application entry point
├── docs/
│   └── oas3.yaml     # OpenAPI 3.0 specification file
├── .env.example      # Environment variables template
└── package.json
```

---

## 👥 Authors

* **Stefano Videsott**
* **Alessandro Como**
* **Thabo Biagetti**
