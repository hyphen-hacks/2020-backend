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

  let validator = {
    text(text, optional, fld) {
      if (optional) {
        return true
      }
      const result = text.length >= 1
      if (!result) {
        console.log("invalid: ", text, text.length, "text", fld)
      }
      return result
    },
    email(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      const result = re.test(String(email).toLowerCase());
      if (!result) {
        console.log("invalid: ", email)
      }
      return result
    },
    date(date) {
      const result = moment(date, "MM/DD/YYYY").isValid() || moment(date, "YYYY-MM-DD").isValid()
      if (!result) {
        console.log("invalid: ", date)
      }
      return result
    },
    year(year) {
      year = Number(year)
      let result = year > 2019 && year < 2040
      if (!result) {
        console.log("invalid: ", year)
      }
      return result
    },
    bool(bool) {
      const result = typeof bool === "boolean"
      if (!result) {
        console.log("invalid: ", bool)
      }
      return result
    },
    agree(bool) {
      const result = bool == true
      if (!result) {
        console.log("invalid: ", bool)
      }
      return result
    }

  }
function validateMentorApplication(app) {
  let result = true
  if (!validator.text(app.firstName, false, "name")) {

    result = false
  }
  if (!validator.text(app.lastName, false, "name")) {
    result = false
  }
  if (!validator.email(app.email)) {
    result = false
  }
  if (!validator.text(app.phoneNumber, false, "phone")) {
    result = false
  }
  if (!validator.text(app.company, false, "company")) {
    result = false
  }
  if (!validator.text(app.companyPosition, false, "companyPosition")) {
    result = false
  }
  if (!validator.text(app.expAttending, false)) {
    result = false
  }
  if (!validator.text(app.expMentoringJudging, false)) {
    result = false
  }
  if (!validator.text(app.expWorkingWithStudents, false)) {
    result = false
  }
  if (!validator.text(app.areasOfExpertise, false)) {
    result = false
  }
  if (!validator.text(app.accommodations, false, "accomodations")) {
    result = false
  }
  if (!validator.text(app.shirtSize, false, "shirtsize")) {
    result = false
  }
  if (!validator.text(app.comments, true)) {
    result = false
  }
  if (!validator.agree(app.agreeTerms)) {
    result = false
  }
  if (!validator.agree(app.agreePrivacy)) {
    result = false
  }
  if (!validator.agree(app.agreeApplication)) {
    result = false
  }
  return result
}
  function validateApplication(app) {
    let result = true
    if (!validator.text(app.firstName, false, "name")) {

      result = false
    }
    if (!validator.text(app.lastName, false, "name")) {
      result = false
    }
    if (!validator.email(app.email)) {
      result = false
    }
    if (!validator.date(app.birthday)) {
      result = false
    }
    if (!validator.text(app.gender, false, "gender")) {
      result = false
    }
    if (!validator.text(app.school, false, "school")) {
      result = false
    }
    if (!validator.year(app.graduation)) {
      result = false
    }
    if (!validator.text(app.whyDoYouWantToAttend, false, "name")) {
      result = false
    }
    if (!validator.text(app.experienceSoftware, false, "soft")) {
      result = false
    }
    if (!validator.text(app.experienceHardware, false, "hard")) {
      result = false
    }
    if (!validator.text(app.experienceHackathon, false, "hack")) {
      result = false
    }
    if (!validator.text(app.experienceTeamCoding, false, "team")) {
      result = false
    }
    if (!validator.text(app.descriptionCompSciExp, false, "desccompsci")) {
      result = false
    }
    if (!validator.bool(app.laptop)) {
      result = false
    }
    if (!validator.text(app.accommodations, true)) {
      result = false
    }
    if (!validator.text(app.comments, true)) {
      result = false
    }
    if (!validator.agree(app.agreeTerms)) {
      result = false
    }
    if (!validator.agree(app.agreePrivacy)) {
      result = false
    }
    return result
  }

  /* /api/v1/apply*/
  router.post('/attendee', function (req, res, next) {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
      admin.auth().verifyIdToken(req.headers.authorization)
      .then(async function (decodedToken) {
        let uid = decodedToken.uid;

        if (jsonSize(req.body) > 1048576) {
          res.status(400)
          res.send({error: "applicationTooLarge"})
          res.end()
        } else {
          let application = req.body.app
          if (validateApplication(application)) {
            try {
              await db.collection("applicants").insertOne({
                _id: uid, firstName: application.firstName, lastName: application.lastName, email: application.email,
                application: application, applied: moment().unix(), role: "attendee"
              })
              const contact = {
                "contacts": [
                  {
                    "first_name": application.firstName,
                    "last_name": application.lastName,
                    "email": application.email,
                    "custom_fields": {
                      [keys.customFieldIds.role]: "attendee",
                      [keys.customFieldIds.status]: "applied",
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
              res.status(200)
              res.send({applied: true, success: true})
              res.end()
            } catch (err) {
              console.log(err)
              res.status(500)
              res.send({error: "internal error"})
              res.end()
            }

          } else {
            res.status(400)
            res.send({error: "invalidApp"})
            res.end()
          }
        }
        // ...
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
  });
  router.post('/mentor', function (req, res, next) {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
      admin.auth().verifyIdToken(req.headers.authorization)
      .then(async function (decodedToken) {
        let uid = decodedToken.uid;

        if (jsonSize(req.body) > 1048576) {
          res.status(400)
          res.send({error: "applicationTooLarge"})
          res.end()
        } else {
          let application = req.body.app
          if (validateMentorApplication(application)) {
            try {
              await db.collection("applicants").insertOne({
                _id: uid, firstName: application.firstName, lastName: application.lastName, email: application.email,
                application: application, applied: moment().unix(), role: "mentor"
              })
              const contact = {
                "contacts": [
                  {
                    "first_name": application.firstName,
                    "last_name": application.lastName,
                    "email": application.email,
                    "custom_fields": {
                      [keys.customFieldIds.role]: "mentor",
                      [keys.customFieldIds.status]: "applied",
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
              res.status(200)
              res.send({applied: true, success: true})
              res.end()
            } catch (err) {
              console.log(err)
              res.status(500)
              res.send({error: "internal error"})
              res.end()
            }

          } else {
            res.status(400)
            res.send({error: "invalidApp"})
            res.end()
          }
        }
        // ...
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
  });
  router.get("/status", (req, res) => {
    let origin = req.get('origin')
    console.log("request", origin, req.body)
    if (keys.whitelistedHosts.indexOf(origin) > -1) {
      admin.auth().verifyIdToken(req.headers.authorization)
      .then(async function (decodedToken) {
        let uid = decodedToken.uid;
        try {
          let applications = await db.collection("applicants").find({_id: uid}).toArray()
          if (applications[0]) {
            res.status(200)
            res.send({applied: true, reviewed: false, role: applications[0].role})
            res.end()
          } else {
            let accepted = await db.collection("people").find({_id: uid}).toArray()
            if (accepted[0]) {
              res.status(200)
              res.send({
                applied: true, reviewed: true, waiverCompleted: accepted[0].waiverCompleted, role: accepted[0].role
              })
              res.end()
            } else {
              res.status(200)
              res.send({applied: false})
              res.end()
            }
          }
        } catch (err) {
          console.log(err)
          res.status(500)
          res.send({error: "internal server error"})
          res.end()
        }

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
});

module.exports = router;
