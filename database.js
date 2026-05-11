const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      destination TEXT NOT NULL,
      dateTime TEXT NOT NULL,
      vehicleId INTEGER NOT NULL,
      vehicle TEXT NOT NULL,
      passengers INTEGER NOT NULL,
      hasChild INTEGER NOT NULL,
      childAlert TEXT,
      driverId INTEGER NOT NULL,
      driverName TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS maintenanceAlerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER NOT NULL,
      vehicle TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      driverId INTEGER NOT NULL,
      driverName TEXT NOT NULL,
      date TEXT NOT NULL
    )
  `);

 db.get(
  "SELECT * FROM users WHERE phone = ?",
  ["38999990000"],
  (err, user) => {
    if (!user) {
      db.run(
        `
        INSERT INTO users (name, phone, password, role)
        VALUES (?, ?, ?, ?)
      `,
        ["Kaick Super ADM", "38999990000", "123456", "superadmin"]
      );
    }
  }
);

  db.get("SELECT * FROM vehicles WHERE plate = ?", ["ABC-1234"], (err, vehicle) => {
    if (!vehicle) {
      db.run(`
        INSERT INTO vehicles (plate, model, status)
        VALUES (?, ?, ?)
      `, ["ABC-1234", "Fiat Cronos", "Disponível"]);
    }
  });
});

module.exports = db;