# 🚀 Social Alpha

**Social Alpha** is a lightweight social networking application built to help users build a circle, share thoughts, and keep conversations moving. 

This platform features a decoupled architecture combining a clean, interactive vanilla frontend with a secure cloud-connected Node.js/Express backend.

---

## ✨ Core Features

- **User Accounts & Profiles:** Secure registration/login flows with custom user profiles featuring bios, follower/following counts, and profile discovery.
- **Dynamic Posting Feed:** Create posts, write comments, like/unlike posts, and follow/unfollow other users in real time.
- **Smart Data Settings:** Interactive profile management including editable bios and account preferences.
- **Visual Adaptability:** Dual-mode layout supporting **Dark** and **Light** themes, which are automatically remembered by your browser.

---

## 🛠️ Project Stack & Layout

- **Frontend:** Vanilla HTML5, modern CSS3 layout styling, and structural JavaScript.
- **Backend:** Node.js with an Express.js API micro-routing engine.
- **Database:** Cloud-hosted MongoDB Atlas Cluster (via Mongoose ODM).

```text
social-alpha/
├── backend/
│   ├── models/        # Mongoose User, Post, and Ticket models
│   ├── middleware.js  # Secure JWT validation interceptor
│   └── server.js      # Main Express API and web server engine
└── frontend/
    ├── index.html     # Application UI structural layout
    ├── app.js         # Browser logic and API fetch engine
    └── style.css      # Custom responsive themes and components
```

---

## 🚀 How to Run the App Locally

Follow these sequential steps to boot your **Social Alpha** environment up on any machine:

### 1. Synchronize Dependencies
Open your project terminal window in VS Code and install the necessary system packages:
```bash
cd backend
npm install
```

### 2. Configure Your Environment Keys
Ensure your local `backend/.env` file contains your secure database cloud (like in this case Atlas) pathing routing string and verification signatures  or u can just copy paste the requested credentials inside your .env file.

### 3. Spin Up the Platform Engine
Launch your backend architecture directly using Node:
```bash
cd backend
node server.js
```
*Your terminal should output:* `Connected to Social Alpha Database Environment Successfully!`

### 4. Interact via Browser
Open your web browser and navigate directly to:
👉 **[http://localhost:5000](http://localhost:5000)**

> ⚠️ **Important Note:** Express handles serving both the static web frontend layout and the `/api` data routes from the exact same source origin. Do **NOT** open `frontend/index.html` directly as a local file; you must access the platform through the running local server link above for the network endpoints to bind properly.

---

## 🔒 Data Security & Operations

- **Password Protections:** User credentials are encrypted into unbreakable cryptographic hashes using `bcryptjs` before hitting the database.
- **Session Enforcement:** Interceptors parse JSON Web Tokens (JWT) to safely authorize sensitive user operations like posting, liking, and following.
- **Database Rules:** Configured to process cloud connection requests safely across multiple environments for hassle-free evaluation reviews.
