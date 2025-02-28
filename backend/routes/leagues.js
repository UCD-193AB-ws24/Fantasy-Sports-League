import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Create a League
router.post("/", async (req, res) => {
  try {
    const { name, commissioner_id } = req.body;

    const newLeague = await pool.query(
      "INSERT INTO leagues (name, commissioner_id) VALUES ($1, $2) RETURNING *",
      [name, commissioner_id]
    );

    res.json(newLeague.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get All Leagues
router.get("/", async (req, res) => {
  try {
    const leagues = await pool.query("SELECT * FROM leagues");
    res.json(leagues.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

export default router;
