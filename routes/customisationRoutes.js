const express = require("express");
const router = express.Router();
const {
  getCustomization,
  saveCustomization,
} = require("../controllers/customisationController");

router.get("/:botId", getCustomization);
router.post("/:botId", saveCustomization);

module.exports = router;
