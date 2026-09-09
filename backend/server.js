require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Supabase Client ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Input Validation ────────────────────────────────────────────────────────

/**
 * Validates student input fields.
 * Returns an array of error strings; empty array means valid.
 */
function validateStudent(data) {
  const errors = [];

  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const department = (data.department || '').trim();
  const year = data.year;
  const cgpa = data.cgpa;

  if (!name) {
    errors.push('Name is required and cannot be empty.');
  }

  if (!email) {
    errors.push('Email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address.');
    }
  }

  if (!department) {
    errors.push('Department is required and cannot be empty.');
  }

  if (year === undefined || year === null || year === '') {
    errors.push('Year is required.');
  } else {
    const yearInt = parseInt(year, 10);
    if (!Number.isInteger(yearInt) || yearInt < 1 || yearInt > 4) {
      errors.push('Year must be an integer between 1 and 4.');
    }
  }

  if (cgpa === undefined || cgpa === null || cgpa === '') {
    errors.push('CGPA is required.');
  } else {
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      errors.push('CGPA must be a number between 0 and 10.');
    }
  }

  return errors;
}

/**
 * Sanitises and normalises a student payload.
 */
function sanitiseStudent(data) {
  return {
    name: (data.name || '').trim(),
    email: (data.email || '').trim(),
    department: (data.department || '').trim(),
    year: parseInt(data.year, 10),
    cgpa: parseFloat(data.cgpa),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Student Management API is running.' });
});

// GET /students — return all students
app.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Supabase error (GET /students):', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch students.' });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Server error (GET /students):', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// GET /students/:id — return one student by ID
app.get('/students/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid student ID.' });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Student not found.' });
      }
      console.error('Supabase error (GET /students/:id):', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch student.' });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Server error (GET /students/:id):', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// POST /students — create a new student
app.post('/students', async (req, res) => {
  const errors = validateStudent(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const studentData = sanitiseStudent(req.body);

  try {
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error (POST /students):', error.message);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'A student with this email already exists.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create student.' });
    }

    res.status(201).json({ success: true, message: 'Student created successfully.', data });
  } catch (err) {
    console.error('Server error (POST /students):', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// PUT /students/:id — update an existing student
app.put('/students/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid student ID.' });
  }

  const errors = validateStudent(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const studentData = sanitiseStudent(req.body);

  try {
    // Check student exists first
    const { data: existing, error: fetchError } = await supabase
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const { data, error } = await supabase
      .from('students')
      .update(studentData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error (PUT /students/:id):', error.message);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'A student with this email already exists.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to update student.' });
    }

    res.status(200).json({ success: true, message: 'Student updated successfully.', data });
  } catch (err) {
    console.error('Server error (PUT /students/:id):', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// DELETE /students/:id — delete a student
app.delete('/students/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid student ID.' });
  }

  try {
    // Check student exists first
    const { data: existing, error: fetchError } = await supabase
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error (DELETE /students/:id):', error.message);
      return res.status(500).json({ success: false, error: 'Failed to delete student.' });
    }

    res.status(200).json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) {
    console.error('Server error (DELETE /students/:id):', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Student Management API running on http://localhost:${PORT}`);
});
