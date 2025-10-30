// Functional tests for FCC Issue Tracker
// These tests cover the 14 required scenarios from the FCC spec.

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

const { assert } = chai;
chai.use(chaiHttp);

const TEST_PROJECT = 'apitest';

suite('Functional Tests', function () {
  // IDs to be used across update/delete tests
  let idForSingleUpdate;
  let idForMultiUpdate;
  let idToDelete;

  // Helper to create an issue quickly
  function createIssue(overrides = {}) {
    const payload = {
      issue_title: 'Test Issue',
      issue_text: 'This is a test issue',
      created_by: 'chai',
      assigned_to: 'dev',
      status_text: 'in QA',
      ...overrides,
    };
    return chai.request(server).post(`/api/issues/${TEST_PROJECT}`).send(payload);
  }

  suite('POST /api/issues/:project', function () {
    test('Create an issue with every field', function (done) {
      const payload = {
        issue_title: 'Every Field',
        issue_text: 'Full payload',
        created_by: 'functional tests',
        assigned_to: 'dev-1',
        status_text: 'triage',
      };
      chai
        .request(server)
        .post(`/api/issues/${TEST_PROJECT}`)
        .send(payload)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.equal(res.body.issue_title, payload.issue_title);
          assert.equal(res.body.issue_text, payload.issue_text);
          assert.equal(res.body.created_by, payload.created_by);
          assert.equal(res.body.assigned_to, payload.assigned_to);
          assert.equal(res.body.status_text, payload.status_text);
          assert.property(res.body, 'created_on');
          assert.property(res.body, 'updated_on');
          assert.property(res.body, 'open');
          assert.isTrue(res.body.open);
          assert.property(res.body, '_id');
          // Save an id for later update tests
          idForSingleUpdate = res.body._id;
          done();
        });
    });

    test('Create an issue with only required fields', function (done) {
      const payload = {
        issue_title: 'Only Required',
        issue_text: 'No optional fields',
        created_by: 'functional tests',
      };
      chai
        .request(server)
        .post(`/api/issues/${TEST_PROJECT}`)
        .send(payload)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.equal(res.body.issue_title, payload.issue_title);
          assert.equal(res.body.issue_text, payload.issue_text);
          assert.equal(res.body.created_by, payload.created_by);
          assert.property(res.body, 'created_on');
          assert.property(res.body, 'updated_on');
          assert.property(res.body, 'open');
          assert.isTrue(res.body.open);
          assert.equal(res.body.assigned_to, '');
          assert.equal(res.body.status_text, '');
          assert.property(res.body, '_id');
          idForMultiUpdate = res.body._id;
          done();
        });
    });

    test('Create an issue with missing required fields', function (done) {
      const payload = {
        issue_title: 'Missing fields',
        // issue_text missing
        created_by: 'functional tests',
      };
      chai
        .request(server)
        .post(`/api/issues/${TEST_PROJECT}`)
        .send(payload)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'required field(s) missing' });
          done();
        });
    });
  });

  suite('GET /api/issues/:project', function () {
    test('View issues on a project', function (done) {
      chai
        .request(server)
        .get(`/api/issues/${TEST_PROJECT}`)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          if (res.body.length > 0) {
            const issue = res.body[0];
            assert.property(issue, 'issue_title');
            assert.property(issue, 'issue_text');
            assert.property(issue, 'created_on');
            assert.property(issue, 'updated_on');
            assert.property(issue, 'created_by');
            assert.property(issue, 'assigned_to');
            assert.property(issue, 'open');
            assert.property(issue, 'status_text');
            assert.property(issue, '_id');
          }
          done();
        });
    });

    test('View issues on a project with one filter', function (done) {
      chai
        .request(server)
        .get(`/api/issues/${TEST_PROJECT}?open=true`)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          res.body.forEach((issue) => {
            assert.strictEqual(issue.open, true);
          });
          done();
        });
    });

    test('View issues on a project with multiple filters', function (done) {
      chai
        .request(server)
        .get(`/api/issues/${TEST_PROJECT}?open=true&created_by=functional%20tests`)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          res.body.forEach((issue) => {
            assert.strictEqual(issue.open, true);
            assert.strictEqual(issue.created_by, 'functional tests');
          });
          done();
        });
    });
  });

  suite('PUT /api/issues/:project', function () {
    test('Update one field on an issue', function (done) {
      // Ensure we have an id; if not, create one now
      const perform = (id) => {
        chai
          .request(server)
          .put(`/api/issues/${TEST_PROJECT}`)
          .send({ _id: id, assigned_to: 'dev-2' })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, { result: 'successfully updated', _id: id });
            done();
          });
      };
      if (idForSingleUpdate) return perform(idForSingleUpdate);
      createIssue().end((_, r) => perform(r.body._id));
    });

    test('Update multiple fields on an issue', function (done) {
      const perform = (id) => {
        chai
          .request(server)
          .put(`/api/issues/${TEST_PROJECT}`)
          .send({
            _id: id,
            issue_title: 'Updated Title',
            status_text: 'verified',
            open: false,
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, { result: 'successfully updated', _id: id });
            done();
          });
      };
      if (idForMultiUpdate) return perform(idForMultiUpdate);
      createIssue().end((_, r) => perform(r.body._id));
    });

    test('Update an issue with missing _id', function (done) {
      chai
        .request(server)
        .put(`/api/issues/${TEST_PROJECT}`)
        .send({ issue_text: 'no id here' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'missing _id' });
          done();
        });
    });

    test('Update an issue with no fields to update', function (done) {
      const perform = (id) => {
        chai
          .request(server)
          .put(`/api/issues/${TEST_PROJECT}`)
          .send({ _id: id })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, { error: 'no update field(s) sent', _id: id });
            done();
          });
      };
      if (idForSingleUpdate) return perform(idForSingleUpdate);
      createIssue().end((_, r) => perform(r.body._id));
    });

    test('Update an issue with an invalid _id', function (done) {
      const badId = '000000000000000000000000';
      chai
        .request(server)
        .put(`/api/issues/${TEST_PROJECT}`)
        .send({ _id: badId, issue_title: 'won\'t work' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'could not update', _id: badId });
          done();
        });
    });
  });

  suite('DELETE /api/issues/:project', function () {
    // Prepare an issue to delete
    setup(function (done) {
      createIssue({ issue_title: 'To Delete' }).end((err, res) => {
        idToDelete = res.body && res.body._id;
        done();
      });
    });

    test('Delete an issue', function (done) {
      chai
        .request(server)
        .delete(`/api/issues/${TEST_PROJECT}`)
        .send({ _id: idToDelete })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { result: 'successfully deleted', _id: idToDelete });
          done();
        });
    });

    test('Delete an issue with an invalid _id', function (done) {
      const badId = '000000000000000000000000';
      chai
        .request(server)
        .delete(`/api/issues/${TEST_PROJECT}`)
        .send({ _id: badId })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'could not delete', _id: badId });
          done();
        });
    });

    test('Delete an issue with missing _id', function (done) {
      chai
        .request(server)
        .delete(`/api/issues/${TEST_PROJECT}`)
        .send({})
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'missing _id' });
          done();
        });
    });
  });
});
