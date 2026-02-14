1. Install dependencies: `npm install`

2. Create a `.env` file with:
   - `MONGODB_URI` – your MongoDB connection string
   - `SESSION_SECRET` – a random secret for session cookies (required in production)
   - `OPENCAGE_API_KEY` – (optional) for login location geocoding

3. If MongoDB is not running: run `mongod` in a separate terminal.

4. In MongoDB Compass, create database `CRMDb` and collection `users`.

5. Run the app: `npm run dev`

6. Visit http://localhost:3000
