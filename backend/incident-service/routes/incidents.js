const router =
  require("express").Router();

const jwt = require("jsonwebtoken");

require("dotenv").config();

const controller =
  require("../controllers/incidentController");

const authenticate = (req, res, next) => {

  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {

    const token =
      header.slice(7);

    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();

  } catch (err) {

    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
};

router.use(authenticate);

/*
 INCIDENTS
*/

router.get(
  "/",
  controller.getAll
);

router.get(
  "/meta/stats",
  controller.getStats
);

router.get(
  "/meta/users",
  controller.getUsers
);

router.get(
  "/:id",
  controller.getById
);

router.post(
  "/",
  controller.create
);

router.patch(
  "/:id/resolve",
  controller.resolveIncident
);

router.patch(
  "/:id/severity",
  controller.changeSeverity
);

/*
 TIMELINE
*/

router.post(
  "/:id/timeline",
  controller.addTimelineEvent
);

/*
 ROLES
*/

router.get(
  "/:id/roles",
  controller.getRoles
);

router.post(
  "/:id/roles",
  controller.assignRole
);

/*
 POSTMORTEM
*/

router.post(
  "/:id/postmortem",
  controller.savePostmortem
);

module.exports = router;