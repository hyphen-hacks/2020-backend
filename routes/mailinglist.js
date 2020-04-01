var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`

/* GET users listing. */
router.post('/add', function(req, res, next) {
  console.log(req.hostname && req.secure)
  if (keys.whitelistedHosts.indexOf(req.hostname) > -1 &&  req.secure) {
    if (req.body.email && emailValidator.validate(req.body.email)) {

      const contact = {
        "list_ids": [
          keys.listIds.mailing
        ],
        "contacts": [
          {
            "email": req.body.email,
            "custom_fields": {
              [keys.customFieldIds.referers]: req.body.referer
            }
          }
        ]
      }
      fetch(`${sengridEndpoint}/v3/marketing/contacts`, {
        method: 'put',
        headers: {
          "Authorization": sengridAuthorization,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(contact)
      }).then(res => res.json()).then(res => {
        console.log(res)
      })

      res.status(200)
      res.send({"message": "added"})
    } else {
      res.status(400)
      res.send({error: "no email"})
      res.send()
    }
  } else {
    res.status(500)
    res.send({error: "unsecure request"})
    res.end()
  }
});

module.exports = router;
