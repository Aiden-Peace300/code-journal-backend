/* eslint-disable no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

// middleware to parse JSON request bodies
app.use(express.json());

// Defining a route to handle GET requests to retrieve all grades
app.get('/api/entries', async (req, res) => {
  console.log('hit me');
  try {
    const sql = `
      SELECT * FROM "entries"
    `;
    const result = await db.query(sql);
    console.log(result);

    // Checking if any rows were returned from the query
    const entries = result.rows;
    console.log(entries);

    // If there are rows, return them as an array of objects
    res.status(200).json(entries);
  } catch (err) {
    // Handling errors by sending a 500 status code and an error message
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching grades.' });
  }
});

// Defining a route to handle POST requests to insert a new entry
app.post('/api/entries', async (req, res) => {
  try {
    // Extracting data from the request body
    const { title, notes, photoUrl } = req.body;

    // Validating the incoming data
    if (!title || !notes || !photoUrl) {
      // Handling client validation errors with a 400 status code
      res.status(400).json({ error: 'Invalid entry data.' });
    } else {
      // Inserting the new grade into the database
      const sql = `
        INSERT INTO "entries" ("title", "notes", "photoUrl")
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const params = [title, notes, photoUrl];
      const result = await db.query(sql, params);

      // Retrieving the created entry
      const createdEntry = result.rows[0];

      // Responding with a 201 status code and the created grade
      res.status(201).json(createdEntry);
    }
  } catch (err) {
    // Handling server errors with a 500 status code
    console.error('Error:', err); // Log the error for debugging
    res
      .status(500)
      .json({ error: 'An error occurred while creating the grade.' });
  }
});

app.put('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { title, notes, photoUrl } = req.body;
    const { entryId } = req.params;
    if (!title || !notes || !photoUrl) {
      // Handling client validation errors with a 400 status code
      res.status(400).json({ error: 'Invalid entry data.' });
    } else {
      const updateSql = `update "entries"
                        set "title" = $1, "notes" = $2, "photoUrl" = $3
                        where "entryId" = $4
                        returning *`;
      const updateParams = [title, notes, photoUrl, entryId];
      const result = await db.query(updateSql, updateParams);
      const entry = result.rows[0];
      res.status(200).json(entry);
    }
  } catch (error) {
    next(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/entries/:entryId', async (req, res, next) => {
  try {
    const entryId = Number(req.params.entryId);
    const deleteSql = `delete from "entries"
                        where "entryId" = $1
                        returning *`;
    const deleteParams = [entryId];
    const result = await db.query(deleteSql, deleteParams);
    const entry = result.rows[0];
    if (entry) {
      res.sendStatus(204);
    } else {
      res
        .status(404)
        .json({ error: `Cannot find grade with "gradeId" ${entryId}` });
    }
  } catch (error) {
    next(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
