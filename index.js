require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const roleRoutes = require('./routes/role.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const {
  doctorRouter, patientRouter, apptRouter, recordRouter,
  rxRouter, medRouter, billRouter, admitRouter, miscRouter,
} = require('./routes/index.routes');

const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app  = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── API Routes ───────────────────────────────────────────────────────────────
const api = '/api';
app.use(`${api}/auth`,            authRoutes);
app.use(`${api}/roles`,           roleRoutes);
app.use(`${api}/users`,           userRoutes);
app.use(`${api}/doctors`,         doctorRouter);
app.use(`${api}/patients`,        patientRouter);
app.use(`${api}/appointments`,    apptRouter);
app.use(`${api}/medical-records`, recordRouter);
app.use(`${api}/prescriptions`,   rxRouter);
app.use(`${api}/medicines`,       medRouter);
app.use(`${api}/billings`,        billRouter);
app.use(`${api}/admissions`,      admitRouter);
app.use(`${api}`,                 miscRouter);   // /api/departments, /api/rooms, /api/staff, /api/dashboard

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Hospital API running on http://localhost:${PORT}`);
  console.log(` ENV: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
