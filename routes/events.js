var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`
var admin = require('firebase-admin');
const moment = require('moment-timezone')
const async = require("async");
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


  /* /api/v1/admin/events/ */

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
            let events = await db.collection("events").find().limit(100).toArray()
            let indexedNames = {}
            await async.forEachOf(events, async (event, key, callback) => {
              console.log(event, "event")
              let authorizor = ""
              let person = ""
              if (event.authorizer) {
                if (indexedNames[event.authorizer]) {
                  authorizor = indexedNames[event.authorizer]
                } else {
                  let user = await admin.auth().getUser(event.authorizer)
                  console.log(user.displayName)
                  indexedNames[event.authorizer] = user.displayName
                  authorizor = user.displayName
                }

              }
              if (event.id) {
                if (indexedNames[event.id]) {
                  person = indexedNames[event.id]
                  console.log("indexed", person)
                } else {
                  let user = await db.collection('people').find({_id: event.id}, {
                    projection: {
                      firstName: 1, lastName: 1, _id: 1
                    }
                  }).toArray()
                  if (user.length >= 1) {
                    user = user[0]
                    //   console.log(user, "userRecord people")
                    indexedNames[event.id] = user.firstName + " " + user.lastName
                    person = user.firstName + " " + user.lastName
                    console.log("people", user.firstName + " " + user.lastName)
                  } else {
                    user = await db.collection('applicants').find({_id: event.id}, {
                      projection: {
                        firstName: 1, lastName: 1, _id: 1
                      }
                    }).toArray()
                    if (user.length >= 1) {
                      user = user[0]
                      //  console.log(user, "user record applicants")
                      indexedNames[event.id] = user.firstName + " " + user.lastName
                      person = user.firstName + " " + user.lastName
                      console.log("applicants", user.firstName + " " + user.lastName)
                    } else {
                      user = await db.collection('declined').find({_id: event.id}, {
                        projection: {
                          firstName: 1, lastName: 1, _id: 1
                        }
                      }).toArray()
                      user = user[0]
                      // console.log(user, "user record declined")
                      indexedNames[event.id] = user.firstName + " " + user.lastName
                      person = user.firstName + " " + user.lastName
                      console.log("declined", user.firstName + " " + user.lastName)
                    }
                  }

                }
              }

              console.log(person, authorizor, event.event, "done")
              switch (event.event) {
                case "attendeeSignUp":
                  events[key].userDescription = `${person} applied to attend`
                  return
                case "mentorSignUp":
                  events[key].userDescription = `${person} applied to mentor`
                  return
                case "volunteerSignUp":
                  events[key].userDescription = `${person} applied to volunteer`
                  return
                case "attendeeAccepted":
                  events[key].userDescription = `${authorizor} accepted ${person}'s attendee application`
                  return
                case "mentorAccepted":
                  events[key].userDescription = `${authorizor} accepted ${person}'s mentor application`
                  return
                case "volunteerAccepted":
                  events[key].userDescription = `${authorizor} accepted ${person}'s volunteer application`
                  return
                case "mentorDeclined":
                  events[key].userDescription = `${authorizor} declined ${person}'s mentor application`
                  return
                case "volunteerDeclined":
                  events[key].userDescription = `${authorizor} declined ${person}'s volunteer application`
                  return
                case "attendeeDeclined":
                  events[key].userDescription = `${authorizor} declined ${person}'s attendee application`
                  return
                case "attendeeResubmit":
                  events[key].userDescription = `${person} resubmitted their attendee application`
                  return
                case "mentorResubmit":
                  events[key].userDescription = `${person} resubmitted their mentor application`
                  return
                case "volunteerResubmit":
                  events[key].userDescription = `${person} resubmitted their volunteer application`
                  return
                case "signUpMailingList":
                  events[key].userDescription = `${event.email} signed up for the mailinglist with refferer ${event.details.referer ? event.details.referer : "none"}`
                  return
                default :
                  events[key].userDescription = `${event.event}`
                return
              }

            }).catch(err => {
              console.log(err, "async err")
            })
            console.log(indexedNames, "indexDB")
            res.status(200)
            res.send({events: events})
            res.end()
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
