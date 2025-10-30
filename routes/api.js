'use strict';

module.exports = function (app) {

  // In-memory store keyed by project -> array of issues
  const projectToIssues = new Map();

  // Generate a simple 24-char hex id similar to Mongo ObjectId
  function generateId() {
    const bytes = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16));
    return bytes.join('');
  }

  function getIssuesArray(project) {
    if (!projectToIssues.has(project)) projectToIssues.set(project, []);
    return projectToIssues.get(project);
  }

  function normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      let project = req.params.project;
      const issues = getIssuesArray(project);
      const query = { ...req.query };

      // Coerce boolean-like query values
      if (Object.prototype.hasOwnProperty.call(query, 'open')) {
        query.open = normalizeBoolean(query.open);
      }

      const filtered = issues.filter((issue) => {
        return Object.keys(query).every((key) => {
          if (!(key in issue)) return false;
          return String(issue[key]) === String(query[key]);
        });
      });

      return res.json(filtered);
    })
    
    .post(function (req, res){
      let project = req.params.project;
      const {
        issue_title,
        issue_text,
        created_by,
        assigned_to = '',
        status_text = '',
      } = req.body || {};

      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }

      const now = new Date();
      const newIssue = {
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        created_on: now,
        updated_on: now,
        open: true,
        _id: generateId(),
      };

      const issues = getIssuesArray(project);
      issues.push(newIssue);
      return res.json(newIssue);
    })
    
    .put(function (req, res){
      let project = req.params.project;
      const {
        _id,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        open,
      } = req.body || {};

      if (!_id) {
        return res.json({ error: 'missing _id' });
      }

      const updateFields = {};
      if (issue_title !== undefined) updateFields.issue_title = issue_title;
      if (issue_text !== undefined) updateFields.issue_text = issue_text;
      if (created_by !== undefined) updateFields.created_by = created_by;
      if (assigned_to !== undefined) updateFields.assigned_to = assigned_to;
      if (status_text !== undefined) updateFields.status_text = status_text;
      if (open !== undefined) updateFields.open = normalizeBoolean(open);

      if (Object.keys(updateFields).length === 0) {
        return res.json({ error: 'no update field(s) sent', _id });
      }

      const issues = getIssuesArray(project);
      const index = issues.findIndex((i) => i._id === _id);
      if (index === -1) {
        return res.json({ error: 'could not update', _id });
      }

      issues[index] = { ...issues[index], ...updateFields, updated_on: new Date() };
      return res.json({ result: 'successfully updated', _id });
    })
    
    .delete(function (req, res){
      let project = req.params.project;
      const { _id } = req.body || {};
      if (!_id) {
        return res.json({ error: 'missing _id' });
      }
      const issues = getIssuesArray(project);
      const index = issues.findIndex((i) => i._id === _id);
      if (index === -1) {
        return res.json({ error: 'could not delete', _id });
      }
      issues.splice(index, 1);
      return res.json({ result: 'successfully deleted', _id });
    });
    
};
