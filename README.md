# Social Alpha

Social Alpha is a small social networking app for building a circle, sharing updates, and keeping conversations moving. The frontend is plain HTML, CSS, and JavaScript; the backend is Express; MongoDB/Mongoose stores users and social activity.

## Features

- Account registration with username, email, and password; sign in with either username or email.
- User profiles with bio, posts, follower/following counts, and profile discovery.
- Edit bio, username, email, and password in Account settings. Sensitive changes require the current password. Username and email can each be changed once every 30 days.
- A public latest-post feed and an authenticated feed from followed people.
- Create posts, comment, like/unlike, and follow/unfollow.
- Debounced prefix search for people, plus suggested accounts.
- A randomized quote with a shuffle control.
- Dark and light themes, with the selected theme remembered in the browser.
- Support tickets stored in MongoDB and in-app Privacy, Terms, and Community information.
- Responsive sign-in and feed layouts, keyboard focus indicators, and reduced-motion support.

## Requirements

- Node.js 20.19 or later.
- npm.
- A MongoDB database that your local backend can reach. MongoDB Atlas works well.

## Run locally

1. Clone the repository and open a terminal in `backend`.

	```powershell
	cd backend
	npm ci
	Copy-Item .env.example .env
	```

	On macOS or Linux, use `cp .env.example .env` instead of `Copy-Item`.

2. Create a MongoDB database and a database user for this project. Give that database user only the permissions the app needs, such as read/write access to the `socialalpha` database. In Atlas Network Access, allow your development machine's current IP address.

3. Edit `backend/.env` and set:

	```dotenv
	PORT=5000
	MONGODB_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/socialalpha?retryWrites=true&w=majority
	MONGODB_DATABASE=socialalpha
	JWT_SECRET=<long-random-secret>
	```

	Replace every placeholder with values from your own Atlas project. URL-encode reserved characters in the database password. Generate a JWT secret locally with:

	```powershell
	node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	```

4. Start the app from `backend`:

	```powershell
	npm start
	```

5. Open [http://localhost:5000](http://localhost:5000). Express serves both the frontend and `/api` from the same origin. Do not open `frontend/index.html` directly as a file; the API needs the backend server.

### Atlas connection notes

Use the connection string shown by your own Atlas project. An Atlas `mongodb+srv://` URI is preferred when your network can resolve SRV DNS records. If SRV lookups are blocked by a local network, use the standard seed-list URI available from Atlas or resolve the network issue. Do not copy another developer's connection string.

## Using the app

1. Create an account with a 3-20 character username containing letters, numbers, or underscores, a valid email address, and a password of 8-72 characters.
2. Sign in with the username or email and password.
3. Use **For you** for the latest posts or **Following** for posts from accounts you follow.
4. Open a profile by selecting a username. Your own profile lets you edit your bio and open Account settings.
5. Search for people in the header. Use the post actions to like or reply, and use profile controls to follow or unfollow.

## Data and account behavior

- Passwords are stored as bcrypt hashes; the raw password is not stored.
- Email is used for login but is not displayed on public profiles.
- Username and email changes require the current password and have a server-enforced 30-day cooldown. Username changes also update the displayed handle on existing posts.
- Email verification, password-reset email, account deletion, and account export are not implemented yet.
- The theme preference is stored in that browser's local storage; it is not an account-wide setting.

## Support and policies

Support requests are stored as tickets in MongoDB. This project does not send support emails or provide an automated response, so configure a real support workflow before inviting public users. The in-app Privacy, Terms, and Community pages describe the current prototype, but are starter copy, not legal advice. Review them for your jurisdiction and actual deployment before launch.

The sign-in page loads its image, fonts, and icons from Unsplash, Google Fonts, and unpkg. Those services may receive normal connection information when the browser loads the assets.

## Deploying for shared access

For a public app, deploy the backend as a Node.js service and keep the `frontend` directory available beside `backend`, since Express serves it from that directory. Start the service with `npm start`. Set `MONGODB_URI`, `MONGODB_DATABASE`, and a strong `JWT_SECRET` as private environment variables in the hosting provider. Add the backend host's network access to Atlas, preferably using a narrow allowlist supported by that host.

Visitors use the deployed website and do not need MongoDB credentials. The backend connects to Atlas on their behalf. A person who clones this repository and runs it on their own localhost needs their own database connection in their own ignored `backend/.env`; this repository intentionally does not grant clones access to the maintainer's Atlas database.

## Keeping secrets out of GitHub

- Never put an Atlas username, password, full MongoDB URI, or JWT secret in this README, frontend code, or a committed file.
- `.gitignore` excludes `.env` files, while `backend/.env.example` contains only blank placeholders.
- Before committing, check that `backend/.env` is not tracked. If a secret was ever committed or shared, rotate it in Atlas and replace it in your local or hosted environment. Removing it from the latest file alone does not erase it from Git history.
- Do not configure Atlas with unrestricted network access just to avoid setting up the backend correctly.

## Project layout

```text
backend/
  models/       Mongoose user, post, and support-ticket models
  middleware.js JWT authentication middleware
  server.js     Express API and static frontend server
  .env.example  Local environment template
frontend/
  index.html    App structure and sign-in screen
  app.js        Browser interactions and API client
  style.css     Themes, layout, and responsive styling
```

## Tests

There is not yet an automated test suite; `npm test` is currently a placeholder. The backend can be checked with `node --check server.js`, and the app can be smoke-tested by starting it and opening `http://localhost:5000`.