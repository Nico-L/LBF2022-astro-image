const fetch = require('node-fetch')
const urlCMS = process.env.PUBLIC_CMS
const token = process.env.PUBLIC_TOKEN_SITE
const url =  urlCMS + "inscriptions-ateliers?token=" + token

const handler = async function (event) {
  const inscriptions = JSON.parse(event.queryStringParameters.inscriptions) || []
  var isOK = true
  var promesses = []
  try {
    inscriptions.forEach((inscrit)=> {
      inscrit.user = 1
      const options = { 
          method: 'POST',
          headers: { "content-type": "application/json" },
          body: JSON.stringify(inscrit)
      }
      promesses.push(fetch(url, options))
    })
    await Promise.all(promesses)
    return {
      statusCode: 200,
      body: JSON.stringify({ data: isOK }),
    }
  } catch (error) {
    // output to netlify function log
    console.log(error)
    return {
      statusCode: 500,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: error.message }),
    }
  }
}

module.exports = { handler }
