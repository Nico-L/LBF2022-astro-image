const fetch = require('node-fetch')
const urlCMS = process.env.PUBLIC_CMS
const token = process.env.PUBLIC_TOKEN_SITE
const url =  urlCMS + "inscriptions-ateliers?token=" + token

const handler = async function (event) {
  const inscriptions = JSON.parse(event.queryStringParameters.inscriptions) || []
  console.log('inscriptions', inscriptions)
  var isOK = true
  try {
    inscriptions.forEach(async (inscrit)=> {
      inscrit.user = 1
      const options = { 
          method: 'POST',
          headers: { "content-type": "application/json" },
          body: JSON.stringify(inscrit)
      }
      const response = await fetch(url, options)
      const data = await response.json()
      console.log('data', data)
      isOK = isOK && !!data.id
    })

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
