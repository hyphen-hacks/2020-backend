var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("Hyphen-Hacks 2020 api")
});

module.exports = router;
