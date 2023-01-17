const fetch = require('node-fetch')
const urlCMS = process.env.PUBLIC_CMS
const token = process.env.PUBLIC_TOKEN_SITE

const handler = async function (event) {
  const variables = JSON.parse(event.queryStringParameters.variables) || []
  const url = urlCMS + "inscriptions-ateliers/?atelier_eq=" + variables.atelierId + "&email_eq=" + variables.email + "&uuid_eq=" + variables.uuid + "&token=" + token

  try {
      const options = { 
          method: 'GET',
          headers: { "content-type": "application/json" },
      }
      const response = await fetch(url, options)
      const data = await response.json()
      var retour = []
      if (data.length>0) {
        data.forEach((item) => {
          var inscrit = {
            id: item.id,
            email: item.email,
            telephone: item.telephone,
            nom: item.nom,
            prenom: item.prenom,
            atelierId: item.atelier.id,
            uuid: item.uuid
          }
          retour.push(inscrit)
        });
      }
    return {
      statusCode: 200,
      body: JSON.stringify({ inscrits: retour }),
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
