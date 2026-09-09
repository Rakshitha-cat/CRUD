/* ═══════════════════════════════════════════════════════════════════════════
   Student Management System — Frontend Script
   Communicates with Express backend at http://localhost:3000
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:3000';

// ─── DOM References ───────────────────────────────────────────────────────────

const studentForm      = document.getElementById('studentForm');
const studentIdInput   = document.getElementById('studentId');
const nameInput        = document.getElementById('name');
const emailInput       = document.getElementById('email');
const departmentInput  = document.getElementById('department');
const yearInput        = document.getElementById('year');
const cgpaInput        = document.getElementById('cgpa');

const submitBtn        = document.getElementById('submitBtn');
const submitBtnText    = document.getElementById('submitBtnText');
const cancelBtn        = document.getElementById('cancelBtn');
const formHeading      = document.getElementById('form-heading');

const notification     = document.getElementById('notification');
const studentCount     = document.getElementById('studentCount');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');
const tableWrapper     = document.getElementById('tableWrapper');
const studentsTableBody= document.getElementById('studentsTableBody');

// ─── Notification Helpers ─────────────────────────────────────────────────────

let notificationTimer = null;

/**
 * Show a success or error notification banner.
 * @param {string} message
 * @param {'success'|'error'} type
 */
function showNotification(message, type = 'success') {
  clearTimeout(notificationTimer);
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  notificationTimer = setTimeout(() => {
    notification.className = 'notification hidden';
  }, 4000);
}

// ─── Field-level Validation ───────────────────────────────────────────────────

function clearFieldErrors() {
  ['name', 'email', 'department', 'year', 'cgpa'].forEach(field => {
    const input = document.getElementById(field);
    const errorEl = document.getElementById(`${field}Error`);
    input.classList.remove('invalid');
    errorEl.textContent = '';
  });
}

function setFieldError(field, message) {
  const input = document.getElementById(field);
  const errorEl = document.getElementById(`${field}Error`);
  input.classList.add('invalid');
  errorEl.textContent = message;
}

/**
 * Client-side validation — mirrors server validation.
 * Returns true if valid, false otherwise.
 */
function validateForm() {
  clearFieldErrors();
  let valid = true;

  const name       = nameInput.value.trim();
  const email      = emailInput.value.trim();
  const department = departmentInput.value.trim();
  const year       = yearInput.value;
  const cgpa       = cgpaInput.value;

  if (!name) {
    setFieldError('name', 'Name is required.');
    valid = false;
  }

  if (!email) {
    setFieldError('email', 'Email is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('email', 'Enter a valid email address.');
    valid = false;
  }

  if (!department) {
    setFieldError('department', 'Department is required.');
    valid = false;
  }

  if (year === '' || year === null) {
    setFieldError('year', 'Year is required.');
    valid = false;
  } else {
    const yearInt = parseInt(year, 10);
    if (isNaN(yearInt) || yearInt < 1 || yearInt > 4) {
      setFieldError('year', 'Year must be between 1 and 4.');
      valid = false;
    }
  }

  if (cgpa === '' || cgpa === null) {
    setFieldError('cgpa', 'CGPA is required.');
    valid = false;
  } else {
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      setFieldError('cgpa', 'CGPA must be between 0 and 10.');
      valid = false;
    }
  }

  return valid;
}

// ─── Table Helpers ────────────────────────────────────────────────────────────

function showLoading() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  tableWrapper.classList.add('hidden');
}

function showEmpty() {
  loadingState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  tableWrapper.classList.add('hidden');
}

function showTable() {
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  tableWrapper.classList.remove('hidden');
}

/** Returns a colour class based on CGPA value. */
function cgpaClass(cgpa) {
  if (cgpa >= 8)  return 'cgpa-high';
  if (cgpa >= 6)  return 'cgpa-mid';
  return 'cgpa-low';
}

// ─── CRUD Functions ───────────────────────────────────────────────────────────

/**
 * Load and render all students.
 */
async function loadStudents() {
  showLoading();
  try {
    const res = await fetch(`${API_BASE}/students`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      showNotification(json.error || 'Failed to load students.', 'error');
      showEmpty();
      return;
    }

    const students = json.data || [];

    // Update badge
    studentCount.textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

    if (students.length === 0) {
      showEmpty();
      return;
    }

    // Build table rows
    studentsTableBody.innerHTML = students.map(s => `
      <tr data-id="${s.id}">
        <td>${s.id}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.department)}</td>
        <td><span class="year-pill">Year ${s.year}</span></td>
        <td><span class="${cgpaClass(parseFloat(s.cgpa))}">${parseFloat(s.cgpa).toFixed(2)}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-edit" onclick="editStudent(${s.id})" aria-label="Edit ${escapeHtml(s.name)}">Edit</button>
            <button class="btn btn-delete" onclick="deleteStudent(${s.id}, '${escapeHtml(s.name)}')" aria-label="Delete ${escapeHtml(s.name)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    showTable();

  } catch (err) {
    console.error('Network error loading students:', err);
    showNotification('Could not reach the server. Make sure the backend is running on http://localhost:3000.', 'error');
    showEmpty();
  }
}

/**
 * Submit form — handles both add and update.
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const id = studentIdInput.value;
  const isUpdate = Boolean(id);

  const payload = {
    name:       nameInput.value.trim(),
    email:      emailInput.value.trim(),
    department: departmentInput.value.trim(),
    year:       parseInt(yearInput.value, 10),
    cgpa:       parseFloat(cgpaInput.value),
  };

  submitBtn.disabled = true;
  submitBtnText.textContent = isUpdate ? 'Updating…' : 'Adding…';

  try {
    const url    = isUpdate ? `${API_BASE}/students/${id}` : `${API_BASE}/students`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      // Surface server-side validation errors
      if (json.errors && json.errors.length) {
        showNotification(json.errors.join(' '), 'error');
      } else {
        showNotification(json.error || 'Operation failed.', 'error');
      }
      return;
    }

    showNotification(json.message || (isUpdate ? 'Student updated!' : 'Student added!'), 'success');
    resetForm();
    loadStudents();

  } catch (err) {
    console.error('Network error submitting form:', err);
    showNotification('Could not reach the server. Make sure the backend is running.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = studentIdInput.value ? 'Update Student' : 'Add Student';
  }
}

/**
 * Fetch a student by ID and populate the form for editing.
 */
async function editStudent(id) {
  try {
    const res  = await fetch(`${API_BASE}/students/${id}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      showNotification(json.error || 'Could not fetch student details.', 'error');
      return;
    }

    const s = json.data;

    studentIdInput.value  = s.id;
    nameInput.value       = s.name;
    emailInput.value      = s.email;
    departmentInput.value = s.department;
    yearInput.value       = s.year;
    cgpaInput.value       = s.cgpa;

    // Switch form to update mode
    formHeading.textContent    = 'Edit Student';
    submitBtnText.textContent  = 'Update Student';
    cancelBtn.classList.remove('hidden');

    clearFieldErrors();

    // Scroll form into view
    studentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();

  } catch (err) {
    console.error('Network error fetching student:', err);
    showNotification('Could not reach the server.', 'error');
  }
}

/**
 * Delete a student after confirmation.
 */
async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?\nThis action cannot be undone.`)) {
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
    const json = await res.json();

    if (!res.ok || !json.success) {
      showNotification(json.error || 'Failed to delete student.', 'error');
      return;
    }

    showNotification(`"${name}" has been deleted.`, 'success');

    // If the deleted student was being edited, reset the form
    if (studentIdInput.value == id) resetForm();

    loadStudents();

  } catch (err) {
    console.error('Network error deleting student:', err);
    showNotification('Could not reach the server.', 'error');
  }
}

/**
 * Reset the form to its initial "add" state.
 */
function resetForm() {
  studentForm.reset();
  studentIdInput.value = '';
  formHeading.textContent   = 'Add New Student';
  submitBtnText.textContent = 'Add Student';
  cancelBtn.classList.add('hidden');
  clearFieldErrors();
}

// ─── XSS Prevention ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

studentForm.addEventListener('submit', handleFormSubmit);

// ─── Initial Load ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadStudents);
