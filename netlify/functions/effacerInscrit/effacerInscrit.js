const fetch = require('node-fetch')
const urlCMS = process.env.PUBLIC_CMS
const token = process.env.PUBLIC_TOKEN_SITE


const handler = async function (event) {
  const idInscrit = event.queryStringParameters.idInscrit || ""
  const url =  urlCMS + "inscriptions-ateliers/"+idInscrit+"?token=" + token
  try {
      const options = { 
          method: 'DELETE',
          headers: { "content-type": "application/json" },
      }
      const response = await fetch(url, options)
      const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify({ data: true }),
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
