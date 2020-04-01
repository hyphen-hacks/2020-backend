var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`

/* GET users listing. */
router.post('/add', function(req, res, next) {
  let origin = req.get('origin')
  console.log("request", origin, req.secure, req.body)
  let secure = req.secure
if (origin == "http://localhost:8080" && keys.whitelistedHosts.indexOf(origin) > -1) {
  secure = true
}
  if (keys.whitelistedHosts.indexOf(origin) > -1 &&  secure) {
    if (req.body.email && emailValidator.validate(req.body.email) && false) {

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
      res.send({"success": true, "message": "added"})
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
