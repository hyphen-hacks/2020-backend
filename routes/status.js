var express = require('express');
var router = express.Router();
const emailValidator = require("email-validator");
const fetch = require('node-fetch');
const keys = require("../private/keys")
const sengridEndpoint = "https://api.sendgrid.com"
const sengridAuthorization = `Bearer ${keys.sendgrid}`
var admin = require('firebase-admin');
const moment = require('moment-timezone')
admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2020.firebaseio.com"
});
/* /api/v1/apply*/
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(keys.mongo, {useNewUrlParser: true});
client.connect(err => {
  console.log(err)
  const db = client.db("hyphen-hacks")

})
module.exports = router;
