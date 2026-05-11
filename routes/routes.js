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
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
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
    return res.status(403).json({ message: "Somente o administrador principal pode fazer isso" });
  }

  next();
}

function onlySuperAdmin(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Somente o administrador principal pode fazer isso" });
  }

  next();
}

router.post("/login", (req, res) => {
  const { phone, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE phone = ? AND password = ?",
    [phone, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: "Erro no servidor" });
      }

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
    }
  );
});

router.get("/users", auth, onlyAdmin, (req, res) => {
  db.all("SELECT id, name, phone, role FROM users", [], (err, users) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar usuários" });
    res.json(users);
  });
});

router.post("/users", auth, onlyAdmin, (req, res) => {
  const { name, phone, password, role } = req.body;

  db.run(
    "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)",
    [name, phone, password, role],
    function (err) {
      if (err) {
        return res.status(400).json({ message: "Erro ao cadastrar usuário. Verifique se o telefone já existe." });
      }

      res.json({
        id: this.lastID,
        name,
        phone,
        role
      });
    }
  );
});

router.delete("/users/:id", auth, onlySuperAdmin, (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir usuário" });

    res.json({ message: "Usuário excluído com sucesso" });
  });
});

router.get("/vehicles", auth, (req, res) => {
  db.all("SELECT * FROM vehicles", [], (err, vehicles) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar veículos" });
    res.json(vehicles);
  });
});

router.post("/vehicles", auth, onlyAdmin, (req, res) => {
  const { plate, model, status } = req.body;

  db.run(
    "INSERT INTO vehicles (plate, model, status) VALUES (?, ?, ?)",
    [plate, model, status],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao cadastrar veículo" });

      res.json({
        id: this.lastID,
        plate,
        model,
        status
      });
    }
  );
});

router.put("/vehicles/:id", auth, onlyAdmin, (req, res) => {
  const { plate, model, status } = req.body;

  db.run(
    "UPDATE vehicles SET plate = ?, model = ?, status = ? WHERE id = ?",
    [plate, model, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao atualizar veículo" });

      res.json({ message: "Veículo atualizado com sucesso" });
    }
  );
});

router.delete("/vehicles/:id", auth, onlyAdmin, (req, res) => {
  db.run("DELETE FROM vehicles WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir veículo" });

    res.json({ message: "Veículo excluído com sucesso" });
  });
});

router.get("/trips", auth, (req, res) => {
  if (req.user.role === "motorista") {
    db.all("SELECT * FROM trips WHERE driverId = ?", [req.user.id], (err, trips) => {
      if (err) return res.status(500).json({ message: "Erro ao buscar viagens" });
      res.json(trips);
    });
  } else {
    db.all("SELECT * FROM trips", [], (err, trips) => {
      if (err) return res.status(500).json({ message: "Erro ao buscar viagens" });
      res.json(trips);
    });
  }
});

router.post("/trips", auth, onlyAdmin, (req, res) => {
  const {
    destination,
    dateTime,
    vehicleId,
    passengers,
    hasChild,
    driverId
  } = req.body;

  db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId], (err, vehicle) => {
    if (!vehicle) {
      return res.status(400).json({ message: "Carro inválido" });
    }

    db.get("SELECT * FROM users WHERE id = ? AND role = ?", [driverId, "motorista"], (err, driver) => {
      if (!driver) {
        return res.status(400).json({ message: "Motorista inválido" });
      }

      const vehicleName = `${vehicle.model} - ${vehicle.plate}`;
      const childAlert = hasChild ? "Necessário Cadeirinha" : "";

      db.run(
        `
        INSERT INTO trips 
        (destination, dateTime, vehicleId, vehicle, passengers, hasChild, childAlert, driverId, driverName)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          destination,
          dateTime,
          vehicleId,
          vehicleName,
          passengers,
          hasChild ? 1 : 0,
          childAlert,
          driverId,
          driver.name
        ],
        function (err) {
          if (err) return res.status(500).json({ message: "Erro ao cadastrar viagem" });

          res.json({
            id: this.lastID,
            destination,
            dateTime,
            vehicleId,
            vehicle: vehicleName,
            passengers,
            hasChild,
            childAlert,
            driverId,
            driverName: driver.name
          });
        }
      );
    });
  });
});

router.delete("/trips/:id", auth, onlyAdmin, (req, res) => {
  db.run("DELETE FROM trips WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir viagem" });

    res.json({ message: "Viagem excluída com sucesso" });
  });
});

router.post("/maintenance-alerts", auth, (req, res) => {
  const { vehicleId, type, description } = req.body;

  db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId], (err, vehicle) => {
    if (!vehicle) {
      return res.status(404).json({ message: "Veículo não encontrado" });
    }

    const vehicleName = `${vehicle.model} - ${vehicle.plate}`;
    const date = new Date().toLocaleString("pt-BR");

    db.run(
      `
      INSERT INTO maintenanceAlerts
      (vehicleId, vehicle, type, description, driverId, driverName, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vehicleId,
        vehicleName,
        type,
        description,
        req.user.id,
        req.user.name,
        date
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Erro ao enviar alerta" });

        res.json({
          id: this.lastID,
          vehicleId,
          vehicle: vehicleName,
          type,
          description,
          driverId: req.user.id,
          driverName: req.user.name,
          date
        });
      }
    );
  });
});

router.get("/maintenance-alerts", auth, onlyAdmin, (req, res) => {
  db.all("SELECT * FROM maintenanceAlerts", [], (err, alerts) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar alertas" });
    res.json(alerts);
  });
});

router.delete("/maintenance-alerts/:id", auth, onlyAdmin, (req, res) => {
  db.run("DELETE FROM maintenanceAlerts WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir alerta" });

    res.json({ message: "Alerta excluído com sucesso" });
  });
});

module.exports = router;