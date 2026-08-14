const db = require('../db');

describe('Smart Data Import & Dynamic Table Alteration', () => {
  test('db.getColumns returns valid array of column names', (done) => {
    db.getColumns('records', (err, cols) => {
      expect(err).toBeNull();
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
      expect(cols.map(c => c.toLowerCase())).toContain('iponame');
      done();
    });
  });

  test('db.addColumn dynamically alters table and adds missing extra column', (done) => {
    const testColName = 'unit_test_extra_col_' + Math.random().toString(36).substring(2, 7);
    db.addColumn('records', testColName, 'TEXT', (err, result) => {
      expect(err).toBeNull();
      expect(result.added || result.alreadyExists).toBe(true);

      db.getColumns('records', (err2, cols) => {
        expect(err2).toBeNull();
        expect(cols.map(c => c.toLowerCase())).toContain(testColName.toLowerCase());
        done();
      });
    });
  });

  test('import_history table exists and supports queries', (done) => {
    db.all('SELECT * FROM import_history LIMIT 10', [], (err, rows) => {
      expect(err).toBeNull();
      expect(Array.isArray(rows)).toBe(true);
      done();
    });
  });

  test('custom_field_metadata table exists and supports queries', (done) => {
    db.all('SELECT * FROM custom_field_metadata LIMIT 10', [], (err, rows) => {
      expect(err).toBeNull();
      expect(Array.isArray(rows)).toBe(true);
      done();
    });
  });
});
