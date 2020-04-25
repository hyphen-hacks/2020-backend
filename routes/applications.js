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

  router.post("/accept", (req, res) => {
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
          if (verifyEmail(email)) {
            try {
              let applicationID = req.body.applicationId
              if (applicationID) {
                let application = await db.collection("applicants").find({_id: applicationID}).toArray()
                if (application[0]) {
                  application = application[0]
                  console.log(application)
                  let time = moment().unix()

                  if (application.role === "attendee") {
                    await db.collection("people").insertOne(application)
                    await db.collection("events").insertOne({
                      event: "attendeeAccepted", id: applicationID, time: time, authorizer: uid
                    })
                    await db.collection("applicants").deleteOne({_id: applicationID})
                    const contact = {
                      "contacts": [
                        {
                          "first_name": application.firstName,
                          "last_name": application.lastName,
                          "email": application.email,
                          "custom_fields": {
                            [keys.customFieldIds.role]: "attendee",
                            [keys.customFieldIds.status]: "accepted",
                          }
                        }
                      ]
                    }
                    await fetch(`${sengridEndpoint}/v3/marketing/contacts`, {
                      method: 'put',
                      headers: {
                        "Authorization": sengridAuthorization,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify(contact)
                    })
                    const email = {
                      "from": {email: "team@hyphen-hacks.com", name: "The Hyphen-Hacks Team"},
                      "personalizations": [
                        {
                          "to": [
                            {
                              "email": application.email
                            }
                          ],
                          "dynamic_template_data": {
                            "first_name": application.firstName
                          }
                        }
                      ],
                      "template_id": "d-489902e1d8984d4a8df083497962447a"
                    }
                    await fetch(`${sengridEndpoint}/v3/mail/send`, {
                      method: 'post',
                      headers: {
                        "Authorization": sengridAuthorization,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify(email)
                    })
                    res.status(200)
                    res.send({success: true})
                    res.end()
                  } else if (application.role === "mentor") {
                    application.phone = application.application.phoneNumber
                    await db.collection("people").insertOne(application)
                    await db.collection("events").insertOne({
                      event: "mentorAccepted", id: applicationID, time: time, authorizer: uid
                    })
                    await db.collection("applicants").deleteOne({_id: applicationID})
                    const contact = {
                      "contacts": [
                        {
                          "first_name": application.firstName,
                          "last_name": application.lastName,
                          "email": application.email,
                          "custom_fields": {
                            [keys.customFieldIds.role]: "mentor",
                            [keys.customFieldIds.status]: "accepted",
                          }
                        }
                      ]
                    }
                    await fetch(`${sengridEndpoint}/v3/marketing/contacts`, {
                      method: 'put',
                      headers: {
                        "Authorization": sengridAuthorization,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify(contact)
                    })
                    const email = {
                      "from": {email: "team@hyphen-hacks.com", name: "The Hyphen-Hacks Team"},
                      "personalizations": [
                        {
                          "to": [
                            {
                              "email": application.email
                            }
                          ],
                          "dynamic_template_data": {
                            "first_name": application.firstName
                          }
                        }
                      ],
                      "template_id": "d-1bc0fda4bd994febb0e7446638441142"
                    }
                    await fetch(`${sengridEndpoint}/v3/mail/send`, {
                      method: 'post',
                      headers: {
                        "Authorization": sengridAuthorization,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify(email)
                    })
                    res.status(200)
                    res.send({success: true})
                    res.end()
                  } else {
                    res.status(400)
                    res.send({error: "Invalid role"})
                    res.end()
                  }
                } else {
                  res.status(400)
                  res.send({error: "application does not exist"})
                  res.end()
                }
              } else {
                res.status(400)
                res.send({error: "no application id"})
                res.end()
              }


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

  /* /api/v1/admin/applications */

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
          if (verifyEmail(email)) {
            try {
              let applications = await db.collection("applicants").find().toArray()
              res.status(200)
              res.send({applicants: applications})
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
