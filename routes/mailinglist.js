var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`

const moment = require('moment-timezone')

/* /api/v1/apply*/
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(keys.mongo, {useNewUrlParser: true});
client.connect(err => {
  console.log(err)
  const db = client.db("hyphen-hacks")
  /* GET users listing. */
  router.post('/add', async function (req, res, next) {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
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
        let sendGridRes = await fetch(`${sengridEndpoint}/v3/marketing/contacts`, {
          method: 'put',
          headers: {
            "Authorization": sengridAuthorization,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(contact)
        })
        console.log(sendGridRes)
        res.status(200)
        res.send({"success": true, "message": "added"})
        await db.collection("events").insertOne({
          event: "signUpMailingList", details: req.body, email: req.body.email, time: moment().unix()
        }, (err) => {
          console.log('logged email', {
            event: "signUpMailingList", details: req.body, email: req.body.email, time: moment().unix()
          }, err)
          res.end()
        })
      } else {
        res.status(400)
        res.send({error: "no email"})
        res.end()
      }
    } else {
      res.status(500)
      res.send({error: "unsecure request"})
      res.end()
    }
  });
})
module.exports = router;
