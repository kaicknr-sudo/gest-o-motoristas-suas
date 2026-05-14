const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../database");

const router = express.Router();

const SECRET = "segredo_suas_2026";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token não informado" });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

function onlyAdmin(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Acesso negado" });
  }
  next();
}

function onlySuperAdmin(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Somente o super admin pode fazer isso" });
  }
  next();
}

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE phone = $1 AND password = $2",
      [phone, password]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Telefone ou senha inválidos" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Erro no login", error: err.message });
  }
});

router.get("/users", auth, onlyAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, phone, role FROM users ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar usuários", error: err.message });
  }
});

router.post("/users", auth, onlyAdmin, async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    const result = await db.query(
      "INSERT INTO users (name, phone, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, role",
      [name, phone, password, role]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ message: "Erro ao cadastrar usuário. Verifique se o telefone já existe.", error: err.message });
  }
});

router.delete("/users/:id", auth, onlySuperAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir usuário", error: err.message });
  }
});

router.get("/vehicles", auth, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM vehicles ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar veículos", error: err.message });
  }
});

router.post("/vehicles", auth, onlyAdmin, async (req, res) => {
  try {
    const { plate, model, status } = req.body;

    const result = await db.query(
      "INSERT INTO vehicles (plate, model, status) VALUES ($1, $2, $3) RETURNING *",
      [plate, model, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erro ao cadastrar veículo", error: err.message });
  }
});

router.put("/vehicles/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const { plate, model, status } = req.body;

    await db.query(
      "UPDATE vehicles SET plate = $1, model = $2, status = $3 WHERE id = $4",
      [plate, model, status, req.params.id]
    );

    res.json({ message: "Veículo atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar veículo", error: err.message });
  }
});

router.delete("/vehicles/:id", auth, onlyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);
    res.json({ message: "Veículo excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir veículo", error: err.message });
  }
});

router.get("/trips", auth, async (req, res) => {
  try {
    let result;

    if (req.user.role === "motorista") {
      result = await db.query(
        `SELECT 
          id, destination, datetime AS "dateTime", vehicleid AS "vehicleId",
          vehicle, passengers, haschild AS "hasChild", childalert AS "childAlert",
          driverid AS "driverId", drivername AS "driverName"
         FROM trips WHERE driverid = $1 ORDER BY datetime`,
        [req.user.id]
      );
    } else {
      result = await db.query(
        `SELECT 
          id, destination, datetime AS "dateTime", vehicleid AS "vehicleId",
          vehicle, passengers, haschild AS "hasChild", childalert AS "childAlert",
          driverid AS "driverId", drivername AS "driverName"
         FROM trips ORDER BY datetime`
      );
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar viagens", error: err.message });
  }
});

router.post("/trips", auth, onlyAdmin, async (req, res) => {
  try {
    const { destination, dateTime, vehicleId, passengers, hasChild, driverId } = req.body;

    const vehicleResult = await db.query("SELECT * FROM vehicles WHERE id = $1", [vehicleId]);
    const vehicle = vehicleResult.rows[0];

    if (!vehicle) {
      return res.status(400).json({ message: "Carro inválido" });
    }

    const driverResult = await db.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'motorista'",
      [driverId]
    );
    const driver = driverResult.rows[0];

    if (!driver) {
      return res.status(400).json({ message: "Motorista inválido" });
    }

    const vehicleName = `${vehicle.model} - ${vehicle.plate}`;
    const childAlert = hasChild ? "Necessário Cadeirinha" : "";

    const result = await db.query(
      `INSERT INTO trips 
      (destination, datetime, vehicleid, vehicle, passengers, haschild, childalert, driverid, drivername)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING 
      id, destination, datetime AS "dateTime", vehicleid AS "vehicleId",
      vehicle, passengers, haschild AS "hasChild", childalert AS "childAlert",
      driverid AS "driverId", drivername AS "driverName"`,
      [
        destination,
        dateTime,
        vehicleId,
        vehicleName,
        passengers,
        hasChild,
        childAlert,
        driverId,
        driver.name
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erro ao cadastrar viagem", error: err.message });
  }
});

router.delete("/trips/:id", auth, onlyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM trips WHERE id = $1", [req.params.id]);
    res.json({ message: "Viagem excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir viagem", error: err.message });
  }
});

router.get("/maintenance-alerts", auth, onlyAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, vehicleid AS "vehicleId", vehicle, type, description,
        driverid AS "driverId", drivername AS "driverName", date
       FROM maintenancealerts ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar alertas", error: err.message });
  }
});

router.post("/maintenance-alerts", auth, async (req, res) => {
  try {
    const { vehicleId, type, description } = req.body;

    const vehicleResult = await db.query("SELECT * FROM vehicles WHERE id = $1", [vehicleId]);
    const vehicle = vehicleResult.rows[0];

    if (!vehicle) {
      return res.status(404).json({ message: "Veículo não encontrado" });
    }

    const vehicleName = `${vehicle.model} - ${vehicle.plate}`;
    const date = new Date().toLocaleString("pt-BR");

    const result = await db.query(
      `INSERT INTO maintenancealerts
      (vehicleid, vehicle, type, description, driverid, drivername, date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING 
      id, vehicleid AS "vehicleId", vehicle, type, description,
      driverid AS "driverId", drivername AS "driverName", date`,
      [
        vehicleId,
        vehicleName,
        type,
        description,
        req.user.id,
        req.user.name,
        date
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erro ao enviar alerta", error: err.message });
  }
});

router.delete("/maintenance-alerts/:id", auth, onlyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM maintenancealerts WHERE id = $1", [req.params.id]);
    res.json({ message: "Alerta excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir alerta", error: err.message });
  }
});

module.exports = router;