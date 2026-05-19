const pool = require('../models/db');
const GOALS = [5000, 10000, 20000];

async function getRanking(req, res) {
  const result = await pool.query('SELECT * FROM seller_totals');
  res.json(result.rows.map((r, i) => ({ ...r, rank: i + 1 })));
}

async function addSale(req, res) {
  const { amount, description } = req.body;
  const userId = req.user.id;
  const prev = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE user_id = $1', [userId]);
  const prevTotal = parseFloat(prev.rows[0].total);
  await pool.query('INSERT INTO sales (user_id, amount, description) VALUES ($1, $2, $3)', [userId, amount, description]);
  const newTotal = prevTotal + parseFloat(amount);
  const goalsHit = GOALS.filter(g => prevTotal < g && newTotal >= g);
  
  const ranking = (await pool.query('SELECT * FROM seller_totals')).rows.map((r, i) => ({ ...r, rank: i + 1 }));
  req.io.emit('ranking_updated', ranking);
  if (goalsHit.length > 0) req.io.emit('goal_achieved', { name: req.user.name, goals: goalsHit });
  res.status(201).json({ goalsHit });
}

async function getMySales(req, res) {
  const sales = await pool.query('SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  const total = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE user_id = $1', [req.user.id]);
  res.json({ sales: sales.rows, total: parseFloat(total.rows[0].total) });
}

async function getAllSales(req, res) {
  const result = await pool.query('SELECT s.*, u.name as seller_name FROM sales s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 50');
  res.json(result.rows);
}
module.exports = { getRanking, addSale, getMySales, getAllSales };
