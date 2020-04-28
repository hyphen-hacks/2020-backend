var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`
var admin = require('firebase-admin');
const moment = require('moment-timezone')

/* /api/v1/apply*/
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(keys.mongo, {useNewUrlParser: true});
client.connect(err => {
  console.log(err)
  const db = client.db("hyphen-hacks")

  function bytes(s) {
    return ~-encodeURI(s).split(/%..|./).length
  }

  function jsonSize(s) {
    return bytes(JSON.stringify(s))
  }

  let verifyEmail = async (email) => {
    console.log(email, 'email')
    if (email.endsWith("hyphen-hacks.com")) {
      return email.endsWith("hyphen-hacks.com")
    } else {
      let authEmailed = await db.collection("authorizedEmails").find({email: email}).toArray()
      return authEmailed.length >= 1
    }
  }
  /* /api/v1/admin/roster */

  router.get("/", (req, res) => {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
      admin.auth().verifyIdToken(req.headers.authorization)
      .then(async function (decodedToken) {
        let uid = decodedToken.uid;
        admin.auth().getUser(uid)
        .then(async function (userRecord) {
          // See the UserRecord reference doc for the contents of userRecord.

          let email = userRecord.toJSON().email
          if (await verifyEmail(email) === true) {
            try {
              let applications = await db.collection("people").find().toArray()
              res.status(200)
              res.send({roster: applications})
              res.end()
            } catch (err) {
              console.log(err)
              res.status(500)
              res.send({error: "internal server error"})
              res.end()
            }
          } else {
            res.status(401)
            res.send({error: "not authorized"})
            res.end()
          }


        })


      }).catch(function (error) {
        console.log(error)
        res.status(401)
        res.send({error: "authorizing"})
        res.end()
      });

    } else {
      res.status(401)
      res.send({error: "unsecure request"})
      res.end()
    }
  })
  router.get("/:role", (req, res) => {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
      admin.auth().verifyIdToken(req.headers.authorization)
      .then(async function (decodedToken) {
        let uid = decodedToken.uid;
        admin.auth().getUser(uid)
        .then(async function (userRecord) {
          // See the UserRecord reference doc for the contents of userRecord.

          let email = userRecord.toJSON().email
          if (await verifyEmail(email) === true) {
            try {
              let applications = await db.collection("people").find({role: req.params.role}).toArray()
              res.status(200)
              res.send({roster: applications, type: req.params.role})
              res.end()
            } catch (err) {
              console.log(err)
              res.status(500)
              res.send({error: "internal server error"})
              res.end()
            }
          } else {
            res.status(401)
            res.send({error: "not authorized"})
            res.end()
          }


        })


      }).catch(function (error) {
        console.log(error)
        res.status(401)
        res.send({error: "authorizing"})
        res.end()
      });

    } else {
      res.status(401)
      res.send({error: "unsecure request"})
      res.end()
    }
  })
})


module.exports = router;
